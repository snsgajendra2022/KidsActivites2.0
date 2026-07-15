import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import Hls from 'hls.js';
import { formatVideoQualityLabel, redactMediaUrl } from '../../utils/videoMediaNormalize.js';
import {
  attachHlsErrorRecovery,
  buildQualityOptions,
  createProductionHlsConfig,
  findHlsLevelForRendition,
  findLowestHlsLevelIndex,
  formatHlsLevelLabel,
} from '../../utils/videoHlsConfig.js';
import { runProgressiveUpgradeLoop } from '../../utils/progressiveVideoUpgrade.js';
import {
  getProgressiveVideoSources,
  isHlsUrl,
} from '../../utils/videoSourceResolver.js';

const EMPTY_RENDITIONS = [];
const DEV = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
const DEFAULT_MAX_LOAD_WAIT_MS = 8000;

function logDev(...args) {
  if (DEV) console.debug('[WebVideoPlayer]', ...args);
}

function formatPlayingBadge(quality) {
  if (!quality || quality === 'adaptive' || quality === 'hls') return 'Auto';
  if (quality === 'original') return 'Original';
  return String(quality).toUpperCase();
}

/**
 * Web video player:
 * 1) HLS adaptive (hls.js / native) when .m3u8 available — silent ABR upgrades
 * 2) Else dual-video MP4 progressive: keep lowest playing, preload next in hidden
 *    layer, smooth swap only when ready at currentTime
 * Full loader only before first playback.
 */
export default function WebVideoPlayer({
  media = null,
  src = null,
  sources: sourcesProp = null,
  poster = null,
  className,
  renditions = EMPTY_RENDITIONS,
  maxQuality,
  onQualityChange,
  onReady,
  onPlay,
  onEnded,
  onError,
  onSourceChange,
  autoPlay = true,
  controls = true,
  maxLoadWaitMs = DEFAULT_MAX_LOAD_WAIT_MS,
  autoSkipOnFailure = false,
}) {
  const resolved = useMemo(() => {
    if (media) {
      const fromMedia = getProgressiveVideoSources(media);
      return {
        posterUrl: poster || fromMedia.posterUrl,
        hls: fromMedia.hls || fromMedia.hlsSource,
        progressive: fromMedia.progressive || fromMedia.progressiveSources || [],
      };
    }
    if (Array.isArray(sourcesProp) && sourcesProp.length > 0) {
      const normalized = sourcesProp.map((s) => (
        typeof s === 'string'
          ? { url: s, type: isHlsUrl(s) ? 'hls' : 'mp4', quality: 'unknown' }
          : s
      )).filter((s) => s?.url);
      const hls = normalized.find((s) => s.type === 'hls') || null;
      const progressive = normalized.filter((s) => s.type !== 'hls');
      return { posterUrl: poster || null, hls, progressive };
    }
    if (src) {
      const item = {
        url: src,
        type: isHlsUrl(src) ? 'hls' : 'mp4',
        quality: isHlsUrl(src) ? 'adaptive' : 'original',
      };
      return {
        posterUrl: poster || null,
        hls: item.type === 'hls' ? item : null,
        progressive: item.type === 'hls' ? [] : [item],
      };
    }
    return { posterUrl: poster || null, hls: null, progressive: [] };
  }, [media, poster, sourcesProp, src]);

  const videoARef = useRef(null);
  const videoBRef = useRef(null);
  const activeSlotRef = useRef('a'); // 'a' | 'b'
  const hlsRef = useRef(null);
  const dropdownRef = useRef(null);
  const loadTimerRef = useRef(null);
  const disposedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const modeRef = useRef('none'); // 'hls' | 'progressive'
  const progressiveIndexRef = useRef(0);
  const upgradeAbortRef = useRef(null);
  const switchingRef = useRef(false);
  const renditionsRef = useRef(renditions);
  const maxQualityRef = useRef(maxQuality);
  const onQualityChangeRef = useRef(onQualityChange);
  const manualModeRef = useRef(false);
  const callbacksRef = useRef({ onReady, onPlay, onEnded, onError, onSourceChange });
  const abrUnlockTimerRef = useRef(null);

  const qualityListId = useId();

  const [mode, setMode] = useState('none');
  const [progressiveIndex, setProgressiveIndex] = useState(0);
  const [selectedQualityKey, setSelectedQualityKey] = useState('auto');
  const [availableQualities, setAvailableQualities] = useState([]);
  const [displayLabel, setDisplayLabel] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [fatalError, setFatalError] = useState(null);
  const [nativeHls, setNativeHls] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [hlsFailed, setHlsFailed] = useState(false);
  const [activeSlot, setActiveSlot] = useState('a');

  const posterUrl = resolved.posterUrl;
  const hlsSource = !hlsFailed ? resolved.hls : null;
  const progressive = resolved.progressive;
  const noPlayableSource = !hlsSource && progressive.length === 0;

  const getActiveVideo = useCallback(() => (
    activeSlotRef.current === 'a' ? videoARef.current : videoBRef.current
  ), []);

  const getPreloadVideo = useCallback(() => (
    activeSlotRef.current === 'a' ? videoBRef.current : videoARef.current
  ), []);

  useEffect(() => {
    renditionsRef.current = renditions;
    maxQualityRef.current = maxQuality;
    onQualityChangeRef.current = onQualityChange;
    callbacksRef.current = { onReady, onPlay, onEnded, onError, onSourceChange };
  }, [renditions, maxQuality, onQualityChange, onReady, onPlay, onEnded, onError, onSourceChange]);

  useEffect(() => {
    progressiveIndexRef.current = progressiveIndex;
  }, [progressiveIndex]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    activeSlotRef.current = activeSlot;
  }, [activeSlot]);

  const clearLoadTimer = useCallback(() => {
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
  }, []);

  const destroyHls = useCallback(() => {
    if (abrUnlockTimerRef.current) {
      clearTimeout(abrUnlockTimerRef.current);
      abrUnlockTimerRef.current = null;
    }
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch { /* ignore */ }
      hlsRef.current = null;
    }
  }, []);

  const abortUpgrade = useCallback(() => {
    upgradeAbortRef.current?.abort();
    upgradeAbortRef.current = null;
  }, []);

  const publishLabel = useCallback((label) => {
    setDisplayLabel((prev) => (prev === label ? prev : label));
    onQualityChangeRef.current?.(label);
  }, []);

  const markFirstPlay = useCallback((video) => {
    if (disposedRef.current) return;
    clearLoadTimer();
    hasStartedRef.current = true;
    setHasStarted(true);
    setFatalError(null);
    setIsBuffering(false);
    callbacksRef.current.onReady?.(video);
    if (autoPlay) {
      const p = video.play?.();
      p?.catch?.(() => {});
    }
  }, [autoPlay, clearLoadTimer]);

  const ensurePlaying = useCallback((video) => {
    if (!autoPlay || !video || disposedRef.current) return;
    const play = () => {
      const p = video.play();
      p?.catch?.(() => {
        if (!hasStartedRef.current) setHasStarted(false);
      });
    };
    if (video.readyState >= 2) play();
    else video.addEventListener('canplay', play, { once: true });
  }, [autoPlay]);

  const loadMp4OntoVideo = useCallback(async (video, source, { seekTo = null, wasPlaying = false } = {}) => {
    setNativeHls(false);
    video.preload = 'auto';
    video.src = source.url;
    await new Promise((resolve, reject) => {
      const ok = () => { cleanup(); resolve(); };
      const bad = () => { cleanup(); reject(new Error('mp4_error')); };
      const cleanup = () => {
        video.removeEventListener('loadeddata', ok);
        video.removeEventListener('canplay', ok);
        video.removeEventListener('error', bad);
      };
      video.addEventListener('loadeddata', ok, { once: true });
      video.addEventListener('canplay', ok, { once: true });
      video.addEventListener('error', bad, { once: true });
      try { video.load(); } catch { /* ignore */ }
      setTimeout(() => { cleanup(); reject(new Error('mp4_timeout')); }, maxLoadWaitMs);
    });
    if (seekTo != null && Number.isFinite(seekTo)) {
      try { video.currentTime = seekTo; } catch { /* ignore */ }
    }
    if (wasPlaying || autoPlay) {
      const p = video.play();
      p?.catch?.(() => {});
    }
  }, [autoPlay, maxLoadWaitMs]);

  const startProgressiveUpgradeLoop = useCallback(() => {
    abortUpgrade();
    if (disposedRef.current) return;
    if (manualModeRef.current) return;
    if (progressive.length < 2) return;

    const controller = new AbortController();
    upgradeAbortRef.current = controller;

    runProgressiveUpgradeLoop({
      progressive,
      startIndex: progressiveIndexRef.current,
      getActiveVideo,
      getPreloadVideo,
      setActiveVideo: (video) => {
        const nextSlot = video === videoARef.current ? 'a' : 'b';
        activeSlotRef.current = nextSlot;
        setActiveSlot(nextSlot);
      },
      signal: controller.signal,
      isDisposed: () => disposedRef.current,
      formatQuality: formatPlayingBadge,
      log: logDev,
      onHint: () => {},
      onBeforeSwitch: () => {
        switchingRef.current = true;
        setIsBuffering(false);
      },
      onAfterSwitch: () => {
        switchingRef.current = false;
      },
      onSwitched: (source, index) => {
        if (disposedRef.current || controller.signal.aborted) return;
        progressiveIndexRef.current = index;
        setProgressiveIndex(index);
        publishLabel(formatPlayingBadge(source.quality));
        callbacksRef.current.onSourceChange?.(source, index, 'upgrade');
      },
    }).catch((err) => {
      logDev('upgrade loop error', err?.message);
      switchingRef.current = false;
    });
  }, [abortUpgrade, getActiveVideo, getPreloadVideo, progressive, publishLabel]);

  const failInitialSource = useCallback((reason) => {
    if (disposedRef.current) return;
    clearLoadTimer();
    destroyHls();
    abortUpgrade();

    if (modeRef.current === 'hls') {
      logDev('hls failed → progressive', reason);
      progressiveIndexRef.current = 0;
      setProgressiveIndex(0);
      setHlsFailed(true);
      setMode('none');
      setSessionKey((n) => n + 1);
      return;
    }

    const nextIdx = progressiveIndexRef.current + 1;
    if (nextIdx < progressive.length && !hasStartedRef.current) {
      logDev('initial fallback', reason, progressive[nextIdx]?.quality);
      progressiveIndexRef.current = nextIdx;
      setProgressiveIndex(nextIdx);
      setSessionKey((n) => n + 1);
      return;
    }

    if (hasStartedRef.current) {
      logDev('error after start ignored for UI', reason);
      return;
    }

    logDev('all sources failed', reason);
    const message = 'Video could not be played. Please try again.';
    setFatalError(message);
    callbacksRef.current.onError?.(new Error(reason || message));
    if (autoSkipOnFailure) {
      callbacksRef.current.onEnded?.({ skipped: true, reason });
    }
  }, [abortUpgrade, autoSkipOnFailure, clearLoadTimer, destroyHls, progressive]);

  const attachHls = useCallback((video, source) => {
    destroyHls();
    abortUpgrade();
    manualModeRef.current = false;
    setSelectedQualityKey('auto');
    setMode('hls');
    modeRef.current = 'hls';

    if (Hls.isSupported()) {
      setNativeHls(false);
      const hls = new Hls(createProductionHlsConfig());
      hlsRef.current = hls;
      video.preload = 'auto';
      hls.loadSource(source.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const opts = buildQualityOptions(hls.levels, renditionsRef.current, {
          maxQuality: maxQualityRef.current,
        });
        setAvailableQualities(opts);

        // Start lowest height, then unlock ABR so upgrades are seamless.
        const lowest = findLowestHlsLevelIndex(hls);
        if (lowest >= 0) {
          hls.startLevel = lowest;
          hls.currentLevel = lowest;
          hls.nextLevel = lowest;
          hls.loadLevel = lowest;
          publishLabel(formatHlsLevelLabel(hls.levels[lowest]));
          abrUnlockTimerRef.current = setTimeout(() => {
            if (disposedRef.current || manualModeRef.current || !hlsRef.current) return;
            hls.currentLevel = -1;
            hls.nextLevel = -1;
            hls.loadLevel = -1;
          }, 2500);
        }

        markFirstPlay(video);
        ensurePlaying(video);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, () => {
        if (manualModeRef.current) return;
        const idx = hls.currentLevel >= 0 ? hls.currentLevel : hls.loadLevel;
        const level = hls.levels[idx];
        if (level) {
          publishLabel(formatHlsLevelLabel(level));
        }
      });

      attachHlsErrorRecovery(hls, {
        onFatal: (data) => {
          logDev('hls fatal', data?.details);
          failInitialSource(data?.details || 'hls_fatal');
        },
        onRecovering: () => {},
      });
      return;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      setNativeHls(true);
      video.preload = 'auto';
      video.src = source.url;
      publishLabel('Auto');
      return;
    }

    failInitialSource('hls_unsupported');
  }, [
    abortUpgrade,
    destroyHls,
    ensurePlaying,
    failInitialSource,
    markFirstPlay,
    publishLabel,
  ]);

  const attachProgressive = useCallback((video, source, index) => {
    setAvailableQualities([]);
    setMode('progressive');
    modeRef.current = 'progressive';
    progressiveIndexRef.current = index;
    publishLabel(formatPlayingBadge(source.quality));
    logDev('attach progressive', source.quality, redactMediaUrl(source.url));
    callbacksRef.current.onSourceChange?.(source, index, 'attach');
    loadMp4OntoVideo(video, source, { wasPlaying: autoPlay }).catch((err) => {
      logDev('progressive attach failed', err?.message);
      failInitialSource(err?.message || 'attach_failed');
    });
  }, [autoPlay, failInitialSource, loadMp4OntoVideo, publishLabel]);

  // Main attach effect
  useEffect(() => {
    disposedRef.current = false;
    hasStartedRef.current = false;
    switchingRef.current = false;
    activeSlotRef.current = 'a';
    setActiveSlot('a');
    abortUpgrade();
    clearLoadTimer();
    setIsBuffering(false);

    const video = videoARef.current;
    const preload = videoBRef.current;
    if (!video || noPlayableSource) return undefined;

    // Reset layer roles
    video.classList.add('is-active');
    video.classList.remove('is-preload');
    video.style.opacity = '1';
    video.style.pointerEvents = 'auto';
    video.style.zIndex = '2';
    if (controls) video.setAttribute('controls', '');

    if (preload) {
      preload.classList.add('is-preload');
      preload.classList.remove('is-active');
      preload.style.opacity = '0';
      preload.style.pointerEvents = 'none';
      preload.style.zIndex = '1';
      preload.removeAttribute('controls');
      preload.muted = true;
      try {
        preload.removeAttribute('src');
        preload.load();
      } catch { /* ignore */ }
    }

    let startSource;

    if (hlsSource) {
      startSource = hlsSource;
      attachHls(video, startSource);
    } else {
      progressiveIndexRef.current = 0;
      setProgressiveIndex(0);
      startSource = progressive[0];
      if (!startSource) return undefined;
      attachProgressive(video, startSource, 0);
    }

    logDev('start', {
      mode: hlsSource ? 'hls' : 'progressive',
      quality: startSource?.quality,
      progressive: progressive.map((p) => p.quality),
    });

    const bindVideoEvents = (el) => {
      const onPlaying = () => {
        if (disposedRef.current) return;
        if (el !== getActiveVideo()) return;
        markFirstPlay(el);
        setIsBuffering(false);
        callbacksRef.current.onPlay?.(el);
        if (modeRef.current === 'progressive' && !manualModeRef.current) {
          startProgressiveUpgradeLoop();
        }
      };
      const onCanPlay = () => {
        if (el !== getActiveVideo()) return;
        if (!hasStartedRef.current) {
          markFirstPlay(el);
          ensurePlaying(el);
        }
        setIsBuffering(false);
      };
      const onWaiting = () => {
        if (el !== getActiveVideo()) return;
        // After first play: small spinner only — never full loader.
        if (hasStartedRef.current && !switchingRef.current) {
          setIsBuffering(true);
        }
      };
      const onPlayingClear = () => {
        if (el === getActiveVideo()) setIsBuffering(false);
      };
      const onEndedEvt = () => {
        if (el !== getActiveVideo()) return;
        abortUpgrade();
        setIsBuffering(false);
        callbacksRef.current.onEnded?.(el);
      };
      const onErrorEvt = () => {
        if (switchingRef.current) return;
        if (el !== getActiveVideo()) return;
        const code = el.error?.code;
        if (hasStartedRef.current && modeRef.current === 'progressive') {
          logDev('playback error after start', code);
          failInitialSource(code ? `media_error_${code}` : 'media_error');
          return;
        }
        failInitialSource(code ? `media_error_${code}` : 'media_error');
      };

      el.addEventListener('playing', onPlaying);
      el.addEventListener('canplay', onCanPlay);
      el.addEventListener('loadeddata', onCanPlay);
      el.addEventListener('waiting', onWaiting);
      el.addEventListener('playing', onPlayingClear);
      el.addEventListener('timeupdate', onPlayingClear);
      el.addEventListener('ended', onEndedEvt);
      el.addEventListener('error', onErrorEvt);

      return () => {
        el.removeEventListener('playing', onPlaying);
        el.removeEventListener('canplay', onCanPlay);
        el.removeEventListener('loadeddata', onCanPlay);
        el.removeEventListener('waiting', onWaiting);
        el.removeEventListener('playing', onPlayingClear);
        el.removeEventListener('timeupdate', onPlayingClear);
        el.removeEventListener('ended', onEndedEvt);
        el.removeEventListener('error', onErrorEvt);
      };
    };

    const unbindA = bindVideoEvents(video);
    const unbindB = preload ? bindVideoEvents(preload) : null;

    loadTimerRef.current = setTimeout(() => {
      if (disposedRef.current || hasStartedRef.current) return;
      logDev('initial load timeout');
      failInitialSource('load_timeout');
    }, maxLoadWaitMs);

    return () => {
      disposedRef.current = true;
      clearLoadTimer();
      abortUpgrade();
      destroyHls();
      unbindA?.();
      unbindB?.();
      [video, preload].forEach((el) => {
        if (!el) return;
        el.removeAttribute('src');
        try { el.load(); } catch { /* ignore */ }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hlsSource?.url, progressive.map((p) => p.url).join('|'), sessionKey, hlsFailed]);

  const applyQuality = useCallback((qualityKey) => {
    const video = getActiveVideo();
    const hls = hlsRef.current;
    setDropdownOpen(false);
    if (!video || !hls || nativeHls) return;

    if (qualityKey === 'auto') {
      manualModeRef.current = false;
      setSelectedQualityKey('auto');
      hls.currentLevel = -1;
      hls.nextLevel = -1;
      hls.loadLevel = -1;
      ensurePlaying(video);
      return;
    }

    const option = availableQualities.find((o) => o.value === qualityKey);
    if (!option) return;
    const idx = option.hlsIndex >= 0
      ? option.hlsIndex
      : findHlsLevelForRendition(hls, option);
    if (idx < 0) return;

    abortUpgrade();
    manualModeRef.current = true;
    setSelectedQualityKey(qualityKey);
    hls.nextLevel = idx;
    hls.loadLevel = idx;
    hls.currentLevel = idx;
    publishLabel(option.label);
    ensurePlaying(video);

    clearLoadTimer();
    loadTimerRef.current = setTimeout(() => {
      if (disposedRef.current || !manualModeRef.current) return;
      if (video.readyState >= 2 && !video.paused) {
        return;
      }
      logDev('manual quality stall', option.label);
      manualModeRef.current = false;
      setSelectedQualityKey('auto');
      hls.currentLevel = -1;
      hls.loadLevel = -1;
      ensurePlaying(video);
    }, maxLoadWaitMs);
  }, [
    abortUpgrade,
    availableQualities,
    clearLoadTimer,
    ensurePlaying,
    getActiveVideo,
    maxLoadWaitMs,
    nativeHls,
    publishLabel,
  ]);

  useEffect(() => {
    if (!dropdownOpen) return undefined;
    const onDown = (e) => {
      if (!dropdownRef.current?.contains(e.target)) setDropdownOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [dropdownOpen]);

  const showQuality = mode === 'hls' && !nativeHls && availableQualities.length > 1 && !fatalError;
  const showFullLoader = !hasStarted && !fatalError && !noPlayableSource;
  const showMiniBuffer = hasStarted && isBuffering && !switchingRef.current && !fatalError;

  const videoClass = ['web-video-player__layer', className].filter(Boolean).join(' ');

  return (
    <div className="video-hls-player photo-lightbox__video-shell web-video-player">
      {posterUrl && showFullLoader ? (
        <img
          className="web-video-player__poster"
          src={posterUrl}
          alt=""
          aria-hidden
          draggable={false}
        />
      ) : null}

      <video
        ref={videoARef}
        className={`${videoClass} is-active`}
        controls={controls && activeSlot === 'a'}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        poster={posterUrl || undefined}
      >
        <track kind="captions" />
      </video>

      <video
        ref={videoBRef}
        className={`${videoClass} is-preload`}
        controls={controls && activeSlot === 'b'}
        playsInline
        muted
        preload="auto"
        aria-hidden={activeSlot !== 'b'}
        tabIndex={-1}
      >
        <track kind="captions" />
      </video>

      {showFullLoader ? (
        <div className="video-hls-player__buffering" aria-live="polite">
          <span className="video-hls-player__spinner" aria-hidden />
          <span className="web-video-player__status">Loading video…</span>
        </div>
      ) : null}

      {showMiniBuffer ? (
        <div className="web-video-player__mini-buffer" aria-live="polite">
          <span className="video-hls-player__spinner" aria-hidden />
        </div>
      ) : null}

      {showQuality ? (
        <div className="video-hls-player__quality" ref={dropdownRef}>
          <button
            type="button"
            className="video-hls-player__quality-trigger"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            aria-controls={qualityListId}
            onClick={() => setDropdownOpen((o) => !o)}
          >
            Quality
            <span className="video-hls-player__quality-current">
              {selectedQualityKey === 'auto'
                ? (displayLabel ? `Auto · ${displayLabel}` : 'Auto')
                : formatVideoQualityLabel(
                  availableQualities.find((q) => q.value === selectedQualityKey),
                )}
            </span>
          </button>
          {dropdownOpen ? (
            <ul
              id={qualityListId}
              className="video-hls-player__quality-menu"
              role="listbox"
              aria-label="Video quality"
            >
              <li role="option" aria-selected={selectedQualityKey === 'auto'}>
                <button
                  type="button"
                  className={`video-hls-player__quality-option${selectedQualityKey === 'auto' ? ' is-selected' : ''}`}
                  onClick={() => applyQuality('auto')}
                >
                  Auto
                </button>
              </li>
              {availableQualities.map((opt) => (
                <li
                  key={opt.value || opt.label}
                  role="option"
                  aria-selected={selectedQualityKey === opt.value}
                >
                  <button
                    type="button"
                    className={`video-hls-player__quality-option${selectedQualityKey === opt.value ? ' is-selected' : ''}`}
                    onClick={() => applyQuality(opt.value)}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {fatalError || noPlayableSource ? (
        <div className="video-hls-player__error-wrap">
          <p className="video-hls-player__error">
            {fatalError || 'No playable video source.'}
          </p>
          {!noPlayableSource ? (
            <button
              type="button"
              className="video-hls-player__retry"
              onClick={() => {
                setFatalError(null);
                setHlsFailed(false);
                progressiveIndexRef.current = 0;
                setProgressiveIndex(0);
                hasStartedRef.current = false;
                setHasStarted(false);
                setSessionKey((n) => n + 1);
              }}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
