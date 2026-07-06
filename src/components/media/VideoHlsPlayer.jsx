import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  attachHlsErrorRecovery,
  buildQualityOptions,
  createProductionHlsConfig,
  findHlsLevelForLabel,
  formatHlsLevelLabel,
} from '../../utils/videoHlsConfig.js';

const EMPTY_RENDITIONS = [];

/**
 * Production HLS player: adaptive bitrate via master.m3u8, manual quality override, error recovery.
 */
export default function VideoHlsPlayer({
  src,
  poster,
  className,
  renditions = EMPTY_RENDITIONS,
  onQualityChange,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const renditionsRef = useRef(renditions);
  const onQualityChangeRef = useRef(onQualityChange);
  const [qualityMode, setQualityMode] = useState('auto');
  const [currentLabel, setCurrentLabel] = useState('');
  const [options, setOptions] = useState([]);
  const [fatalError, setFatalError] = useState(false);
  const [nativeHls, setNativeHls] = useState(false);

  renditionsRef.current = renditions;
  onQualityChangeRef.current = onQualityChange;

  const updateCurrentLabel = useCallback((hls) => {
    if (!hls) return;
    const level = hls.levels[hls.currentLevel];
    const label = hls.autoLevelEnabled
      ? `Auto · ${formatHlsLevelLabel(level) || '…'}`
      : formatHlsLevelLabel(level);
    setCurrentLabel((prev) => (prev === label ? prev : label));
    onQualityChangeRef.current?.(label);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return undefined;

    setFatalError(false);
    setQualityMode('auto');
    setOptions([]);
    setCurrentLabel('');

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      setNativeHls(true);
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

    hls.loadSource(src);
    hls.attachMedia(video);

    const onManifestParsed = () => {
      const opts = buildQualityOptions(hls.levels, renditionsRef.current);
      setOptions(opts);
      updateCurrentLabel(hls);
    };

    hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
    hls.on(Hls.Events.LEVEL_SWITCHED, () => {
      updateCurrentLabel(hls);
    });

    attachHlsErrorRecovery(hls, {
      onFatal: () => setFatalError(true),
    });

    return () => {
      hls.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
      hls.destroy();
      hlsRef.current = null;
    };
  }, [src, updateCurrentLabel]);

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
    updateCurrentLabel(hls);
  }, [renditionsSignature, nativeHls, updateCurrentLabel]);

  const applyQuality = useCallback((mode) => {
    const hls = hlsRef.current;
    if (!hls) return;

    setQualityMode(mode);

    if (mode === 'auto') {
      hls.currentLevel = -1;
      updateCurrentLabel(hls);
      return;
    }

    const idx = findHlsLevelForLabel(hls, mode);
    if (idx >= 0) {
      hls.currentLevel = idx;
      updateCurrentLabel(hls);
    }
  }, [updateCurrentLabel]);

  const showQualityControl = !nativeHls && options.length > 1 && !fatalError;

  return (
    <div className="video-hls-player">
      <video
        ref={videoRef}
        className={className}
        controls
        autoPlay
        playsInline
        poster={poster || undefined}
      >
        <track kind="captions" />
      </video>

      {currentLabel && !fatalError ? (
        <span className="video-hls-player__badge" aria-live="polite">
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
            <option value="auto">Auto</option>
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
