import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  attachHlsErrorRecovery,
  attachProgressiveQualityRamp,
  buildQualityOptions,
  createProductionHlsConfig,
  findHlsLevelForLabel,
  formatHlsLevelLabel,
} from '../../utils/videoHlsConfig.js';

const EMPTY_RENDITIONS = [];

/**
 * Production HLS player: progressive quality ramp (low → high), manual override, error recovery.
 */
export default function VideoHlsPlayer({
  src,
  poster,
  className,
  renditions = EMPTY_RENDITIONS,
  onQualityChange,
  progressiveQuality = true,
  autoPlay = true,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const rampRef = useRef(null);
  const manualOverrideRef = useRef(false);
  const renditionsRef = useRef(renditions);
  const onQualityChangeRef = useRef(onQualityChange);
  const progressiveQualityRef = useRef(progressiveQuality);
  const [qualityMode, setQualityMode] = useState('auto');
  const [currentLabel, setCurrentLabel] = useState('');
  const [ramping, setRamping] = useState(false);
  const [options, setOptions] = useState([]);
  const [fatalError, setFatalError] = useState(false);
  const [nativeHls, setNativeHls] = useState(false);

  renditionsRef.current = renditions;
  onQualityChangeRef.current = onQualityChange;
  progressiveQualityRef.current = progressiveQuality;

  const publishLabel = useCallback((label) => {
    setCurrentLabel((prev) => (prev === label ? prev : label));
    onQualityChangeRef.current?.(label);
  }, []);

  const updateCurrentLabel = useCallback((hls, { forceManual = false } = {}) => {
    if (!hls) return;
    const level = hls.levels[hls.currentLevel];
    const label = !forceManual && hls.autoLevelEnabled
      ? `Auto · ${formatHlsLevelLabel(level) || '…'}`
      : formatHlsLevelLabel(level);
    publishLabel(label);
  }, [publishLabel]);

  const stopRamp = useCallback(() => {
    rampRef.current?.stop();
    rampRef.current = null;
    setRamping(false);
  }, []);

  const startProgressiveRamp = useCallback((hls) => {
    stopRamp();
    if (!progressiveQualityRef.current || manualOverrideRef.current) {
      hls.currentLevel = -1;
      setQualityMode('auto');
      updateCurrentLabel(hls);
      return;
    }

    setRamping(true);
    setQualityMode('auto');

    rampRef.current = attachProgressiveQualityRamp(hls, {
      onLevelLabel: (label) => publishLabel(label),
      onComplete: () => {
        rampRef.current = null;
        setRamping(false);
        setQualityMode('auto');
        updateCurrentLabel(hls);
      },
    });
  }, [publishLabel, stopRamp, updateCurrentLabel]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return undefined;

    manualOverrideRef.current = false;
    setFatalError(false);
    setQualityMode('auto');
    setOptions([]);
    setCurrentLabel('');
    setRamping(false);
    stopRamp();

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      setNativeHls(true);
      video.preload = 'auto';
      video.src = src;
      return () => {
        video.removeAttribute('src');
        video.load();
      };
    }

    setNativeHls(false);

    if (!Hls.isSupported()) {
      video.src = src;
      return undefined;
    }

    const hls = new Hls(createProductionHlsConfig());
    hlsRef.current = hls;

    video.preload = 'auto';
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.startLoad(-1);

    const onManifestParsed = () => {
      const opts = buildQualityOptions(hls.levels, renditionsRef.current);
      setOptions(opts);
      startProgressiveRamp(hls);
    };

    hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
    hls.on(Hls.Events.LEVEL_SWITCHED, () => {
      if (!rampRef.current) {
        updateCurrentLabel(hls);
      }
    });

    attachHlsErrorRecovery(hls, {
      onFatal: () => setFatalError(true),
    });

    return () => {
      stopRamp();
      hls.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
      hls.destroy();
      hlsRef.current = null;
    };
  }, [src, progressiveQuality, startProgressiveRamp, stopRamp, updateCurrentLabel]);

  const renditionsSignature = JSON.stringify(renditions);

  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls || nativeHls || !hls.levels?.length) return;
    const opts = buildQualityOptions(hls.levels, renditionsRef.current);
    setOptions((prev) => {
      const prevSig = JSON.stringify(prev);
      const nextSig = JSON.stringify(opts);
      return prevSig === nextSig ? prev : opts;
    });
    if (!rampRef.current) {
      updateCurrentLabel(hls);
    }
  }, [renditionsSignature, nativeHls, updateCurrentLabel]);

  const applyQuality = useCallback((mode) => {
    const hls = hlsRef.current;
    if (!hls) return;

    manualOverrideRef.current = true;
    stopRamp();
    setQualityMode(mode);

    if (mode === 'auto') {
      hls.currentLevel = -1;
      updateCurrentLabel(hls);
      return;
    }

    const idx = findHlsLevelForLabel(hls, mode);
    if (idx >= 0) {
      hls.currentLevel = idx;
      updateCurrentLabel(hls, { forceManual: true });
    }
  }, [stopRamp, updateCurrentLabel]);

  const showQualityControl = !nativeHls && options.length > 0 && !fatalError;

  return (
    <div className="video-hls-player">
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

      {currentLabel && !fatalError ? (
        <span
          className={`video-hls-player__badge${ramping ? ' video-hls-player__badge--ramping' : ''}`}
          aria-live="polite"
        >
          {currentLabel}
        </span>
      ) : null}

      {showQualityControl ? (
        <div className="video-hls-player__quality">
          <label htmlFor="hls-quality-select" className="video-hls-player__quality-label">
            Quality
          </label>
          <select
            id="hls-quality-select"
            className="video-hls-player__quality-select"
            value={qualityMode}
            onChange={(e) => applyQuality(e.target.value)}
          >
            <option value="auto">Auto (adaptive)</option>
            {options.map((opt) => (
              <option key={opt.label} value={opt.label.replace(/p$/i, '')}>
                {opt.label}
                {opt.bitrateKbps ? ` (${opt.bitrateKbps}k)` : ''}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {fatalError ? (
        <p className="video-hls-player__error">Playback failed. Try again or check your connection.</p>
      ) : null}
    </div>
  );
}
