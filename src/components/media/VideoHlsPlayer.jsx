import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import Hls from 'hls.js';
import {
  formatQualityBitrateLabel,
  formatVideoQualityLabel,
} from '../../utils/videoMediaNormalize.js';
import {
  attachHlsErrorRecovery,
  attachProgressiveQualityRamp,
  buildQualityOptions,
  createProductionHlsConfig,
  enableAutoQuality,
  findHlsLevelForRendition,
  findStartLevelForRamp,
  formatHlsLevelLabel,
} from '../../utils/videoHlsConfig.js';

const EMPTY_RENDITIONS = [];

function capturePlaybackState(video) {
  if (!video) {
    return {
      currentTime: 0,
      wasPlaying: false,
      volume: 1,
      muted: false,
      playbackRate: 1,
    };
  }
  return {
    currentTime: video.currentTime,
    wasPlaying: !video.paused,
    volume: video.volume,
    muted: video.muted,
    playbackRate: video.playbackRate,
  };
}

function restorePlaybackState(video, state) {
  if (!video || !state) return;
  try {
    video.volume = state.volume;
    video.muted = state.muted;
    video.playbackRate = state.playbackRate;
    if (Number.isFinite(state.currentTime) && state.currentTime > 0) {
      video.currentTime = state.currentTime;
    }
    if (state.wasPlaying) {
      video.play().catch(() => {});
    }
  } catch {
    /* ignore restore errors */
  }
}

/**
 * Production HLS player: progressive quality ramp, manual override, error recovery.
 */
export default function VideoHlsPlayer({
  src,
  poster,
  className,
  renditions = EMPTY_RENDITIONS,
  defaultQuality,
  onQualityChange,
  progressiveQuality = true,
  autoPlay = true,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const rampRef = useRef(null);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const masterSrcRef = useRef(src);
  const usingDirectRenditionRef = useRef(false);
  const manualModeRef = useRef(false);
  const renditionsRef = useRef(renditions);
  const onQualityChangeRef = useRef(onQualityChange);
  const progressiveQualityRef = useRef(progressiveQuality);
  const defaultQualityRef = useRef(defaultQuality);
  const retryNonceRef = useRef(0);

  const qualityListId = useId();

  const [selectedQualityKey, setSelectedQualityKey] = useState('auto');
  const [, setActiveQualityKey] = useState(null);
  const [availableQualities, setAvailableQualities] = useState([]);
  const [displayLabel, setDisplayLabel] = useState('');
  const [isRamping, setIsRamping] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [fatalError, setFatalError] = useState(null);
  const [nativeHls, setNativeHls] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    masterSrcRef.current = src;
    renditionsRef.current = renditions;
    onQualityChangeRef.current = onQualityChange;
    progressiveQualityRef.current = progressiveQuality;
    defaultQualityRef.current = defaultQuality;
    retryNonceRef.current = retryNonce;
  }, [src, renditions, onQualityChange, progressiveQuality, defaultQuality, retryNonce]);

  const publishDisplayLabel = useCallback((label) => {
    setDisplayLabel((prev) => (prev === label ? prev : label));
    onQualityChangeRef.current?.(label);
  }, []);

  const updateAutoDisplayLabel = useCallback((hls) => {
    if (!hls) return;
    const level = hls.levels[hls.currentLevel >= 0 ? hls.currentLevel : hls.loadLevel];
    const activeLabel = formatHlsLevelLabel(level) || '…';
    publishDisplayLabel(`Auto · ${activeLabel}`);
    setActiveQualityKey(level ? String(level.height || level.name || activeLabel) : null);
  }, [publishDisplayLabel]);

  const updateManualDisplayLabel = useCallback((option) => {
    if (!option) return;
    publishDisplayLabel(option.label);
    setActiveQualityKey(option.value);
  }, [publishDisplayLabel]);

  const stopRamp = useCallback(() => {
    rampRef.current?.stop();
    rampRef.current = null;
    setIsRamping(false);
  }, []);

  const destroyHls = useCallback(() => {
    stopRamp();
    const hls = hlsRef.current;
    if (hls) {
      hls.destroy();
      hlsRef.current = null;
    }
  }, [stopRamp]);

  const startProgressiveRamp = useCallback((hls) => {
    stopRamp();
    if (!progressiveQualityRef.current || manualModeRef.current) {
      enableAutoQuality(hls);
      setSelectedQualityKey('auto');
      updateAutoDisplayLabel(hls);
      return;
    }

    const startLevelIndex = findStartLevelForRamp(hls, defaultQualityRef.current);

    setIsRamping(true);
    setSelectedQualityKey('auto');

    rampRef.current = attachProgressiveQualityRamp(hls, {
      startLevelIndex,
      onLevelLabel: (label) => publishDisplayLabel(label),
      onComplete: () => {
        rampRef.current = null;
        setIsRamping(false);
        setSelectedQualityKey('auto');
        updateAutoDisplayLabel(hls);
      },
    });
  }, [publishDisplayLabel, stopRamp, updateAutoDisplayLabel]);

  const attachHlsToVideo = useCallback((video, sourceUrl) => {
    destroyHls();
    usingDirectRenditionRef.current = false;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      setNativeHls(true);
      video.preload = 'auto';
      video.src = sourceUrl;
      publishDisplayLabel('Adaptive');
      return null;
    }

    setNativeHls(false);

    if (!Hls.isSupported()) {
      video.src = sourceUrl;
      return null;
    }

    const hls = new Hls(createProductionHlsConfig());
    hlsRef.current = hls;

    video.preload = 'auto';
    hls.loadSource(sourceUrl);
    hls.attachMedia(video);
    hls.startLoad(-1);

    const onManifestParsed = () => {
      const opts = buildQualityOptions(hls.levels, renditionsRef.current);
      setAvailableQualities(opts);
      startProgressiveRamp(hls);
    };

    hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
    hls.on(Hls.Events.LEVEL_SWITCHED, () => {
      if (!rampRef.current && !manualModeRef.current) {
        updateAutoDisplayLabel(hls);
      }
    });

    attachHlsErrorRecovery(hls, {
      onRecovering: () => setIsBuffering(true),
      onFatal: () => setFatalError('Playback failed. Please try again.'),
    });

    return hls;
  }, [destroyHls, publishDisplayLabel, startProgressiveRamp, updateAutoDisplayLabel]);

  const switchToDirectRendition = useCallback((option, playbackState) => {
    const video = videoRef.current;
    if (!video || !option?.streamUrl) return;

    destroyHls();
    usingDirectRenditionRef.current = true;
    setIsBuffering(true);

    const onReady = () => {
      video.removeEventListener('loadedmetadata', onReady);
      restorePlaybackState(video, playbackState);
      setIsBuffering(false);
      updateManualDisplayLabel(option);
    };

    video.addEventListener('loadedmetadata', onReady);
    video.src = option.streamUrl;
    video.load();
  }, [destroyHls, updateManualDisplayLabel]);

  const switchToMasterAndLockLevel = useCallback((option, playbackState) => {
    const video = videoRef.current;
    if (!video) return;

    if (usingDirectRenditionRef.current) {
      setIsBuffering(true);
      destroyHls();
      usingDirectRenditionRef.current = false;

      const hls = new Hls(createProductionHlsConfig());
      hlsRef.current = hls;
      hls.loadSource(masterSrcRef.current);
      hls.attachMedia(video);
      hls.startLoad(-1);

      const onParsed = () => {
        hls.off(Hls.Events.MANIFEST_PARSED, onParsed);
        const idx = findHlsLevelForRendition(hls, option);
        if (idx >= 0) {
          hls.currentLevel = idx;
          restorePlaybackState(video, playbackState);
          updateManualDisplayLabel(option);
        }
        setIsBuffering(false);
      };
      hls.on(Hls.Events.MANIFEST_PARSED, onParsed);

      attachHlsErrorRecovery(hls, {
        onRecovering: () => setIsBuffering(true),
        onFatal: () => setFatalError('Playback failed. Please try again.'),
      });
      return;
    }

    const hls = hlsRef.current;
    if (!hls) return;
    const idx = option.hlsIndex >= 0 ? option.hlsIndex : findHlsLevelForRendition(hls, option);
    if (idx >= 0) {
      stopRamp();
      hls.currentLevel = idx;
      restorePlaybackState(video, playbackState);
      updateManualDisplayLabel(option);
    }
  }, [destroyHls, stopRamp, updateManualDisplayLabel]);

  const applyQuality = useCallback((qualityKey) => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video) return;

    setDropdownOpen(false);

    if (qualityKey === 'auto') {
      stopRamp();
      manualModeRef.current = false;
      setSelectedQualityKey('auto');

      if (usingDirectRenditionRef.current) {
        const state = capturePlaybackState(video);
        setIsBuffering(true);
        destroyHls();
        usingDirectRenditionRef.current = false;
        const newHls = attachHlsToVideo(video, masterSrcRef.current);
        if (newHls) {
          newHls.on(Hls.Events.MANIFEST_PARSED, () => {
            enableAutoQuality(newHls);
            restorePlaybackState(video, state);
            updateAutoDisplayLabel(newHls);
            setIsBuffering(false);
          });
        } else {
          restorePlaybackState(video, state);
          setIsBuffering(false);
        }
        return;
      }

      if (hls) {
        enableAutoQuality(hls);
        updateAutoDisplayLabel(hls);
      }
      return;
    }

    const option = availableQualities.find((opt) => opt.value === qualityKey);
    if (!option) return;

    const playbackState = capturePlaybackState(video);
    stopRamp();
    manualModeRef.current = true;
    setSelectedQualityKey(qualityKey);

    if (nativeHls) return;

    const manifestIdx = hls
      ? (option.hlsIndex >= 0 ? option.hlsIndex : findHlsLevelForRendition(hls, option))
      : -1;

    if (manifestIdx >= 0 && hls && !usingDirectRenditionRef.current) {
      hls.currentLevel = manifestIdx;
      restorePlaybackState(video, playbackState);
      updateManualDisplayLabel(option);
      return;
    }

    if (option.streamUrl) {
      switchToDirectRendition(option, playbackState);
      return;
    }

    switchToMasterAndLockLevel(option, playbackState);
  }, [
    attachHlsToVideo,
    availableQualities,
    destroyHls,
    nativeHls,
    stopRamp,
    switchToDirectRendition,
    switchToMasterAndLockLevel,
    updateAutoDisplayLabel,
    updateManualDisplayLabel,
  ]);

  const handleRetry = useCallback(() => {
    setFatalError(null);
    setRetryNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return undefined;

    setFatalError(null);
    setSelectedQualityKey('auto');
    setActiveQualityKey(null);
    setAvailableQualities([]);
    setDisplayLabel('');
    setIsRamping(false);
    setIsBuffering(false);
    setDropdownOpen(false);
    usingDirectRenditionRef.current = false;
    manualModeRef.current = false;

    attachHlsToVideo(video, src);

    return () => {
      destroyHls();
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [src, retryNonce, attachHlsToVideo, destroyHls]);

  const renditionsSignature = JSON.stringify(renditions);

  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls || nativeHls || !hls.levels?.length) return;
    const opts = buildQualityOptions(hls.levels, renditionsRef.current);
    setAvailableQualities((prev) => {
      const prevSig = JSON.stringify(prev);
      const nextSig = JSON.stringify(opts);
      return prevSig === nextSig ? prev : opts;
    });
    if (!rampRef.current && !manualModeRef.current) {
      updateAutoDisplayLabel(hls);
    }
  }, [renditionsSignature, nativeHls, updateAutoDisplayLabel]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);

    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);

    return () => {
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
    };
  }, [src, retryNonce]);

  useEffect(() => {
    if (!dropdownOpen) return undefined;

    const onPointerDown = (event) => {
      if (dropdownRef.current?.contains(event.target)) return;
      if (containerRef.current?.contains(event.target)) return;
      setDropdownOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDropdownOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [dropdownOpen]);

  const showQualityControl = !nativeHls && availableQualities.length > 1 && !fatalError;

  return (
    <div
      className="video-hls-player photo-lightbox__video-shell"
      ref={containerRef}
    >
      <video
        ref={videoRef}
        className={className}
        controls
        autoPlay={autoPlay}
        playsInline
        preload="auto"
        poster={poster || undefined}
      >
        <track kind="captions" />
      </video>

      {isBuffering && !fatalError ? (
        <div className="video-hls-player__buffering" aria-live="polite" aria-busy="true">
          <span className="video-hls-player__spinner" aria-hidden />
          <span className="sr-only">Buffering</span>
        </div>
      ) : null}

      {displayLabel && !fatalError ? (
        <span
          className={`video-hls-player__badge${isRamping ? ' video-hls-player__badge--ramping' : ''}${nativeHls ? ' video-hls-player__badge--native' : ''}`}
          aria-live="polite"
        >
          {displayLabel}
        </span>
      ) : null}

      {showQualityControl ? (
        <div className="video-hls-player__quality" ref={dropdownRef}>
          <button
            type="button"
            className="video-hls-player__quality-trigger"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            aria-controls={qualityListId}
            onClick={() => setDropdownOpen((open) => !open)}
          >
            Quality
            <span className="video-hls-player__quality-current">
              {selectedQualityKey === 'auto' ? 'Auto' : formatVideoQualityLabel(
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
                  Auto (adaptive)
                </button>
              </li>
              {availableQualities.map((opt) => {
                const bitrate = formatQualityBitrateLabel(opt);
                return (
                  <li key={opt.value || opt.label} role="option" aria-selected={selectedQualityKey === opt.value}>
                    <button
                      type="button"
                      className={`video-hls-player__quality-option${selectedQualityKey === opt.value ? ' is-selected' : ''}`}
                      onClick={() => applyQuality(opt.value)}
                    >
                      {opt.label}
                      {bitrate ? ` · ${bitrate}` : ''}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {fatalError ? (
        <div className="video-hls-player__error-wrap">
          <p className="video-hls-player__error">{fatalError}</p>
          <button type="button" className="video-hls-player__retry" onClick={handleRetry}>
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
