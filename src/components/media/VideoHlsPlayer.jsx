import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  attachHlsErrorRecovery,
  buildQualityOptions,
  createProductionHlsConfig,
  findHlsLevelForLabel,
  formatHlsLevelLabel,
} from '../../utils/videoHlsConfig.js';

/**
 * Production HLS player: adaptive bitrate via master.m3u8, manual quality override, error recovery.
 */
export default function VideoHlsPlayer({
  src,
  poster,
  className,
  renditions = [],
  onQualityChange,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [qualityMode, setQualityMode] = useState('auto');
  const [currentLabel, setCurrentLabel] = useState('');
  const [options, setOptions] = useState([]);
  const [fatalError, setFatalError] = useState(false);
  const [nativeHls, setNativeHls] = useState(false);

  const updateCurrentLabel = useCallback((hls) => {
    if (!hls) return;
    const level = hls.levels[hls.currentLevel];
    const label = hls.autoLevelEnabled
      ? `Auto · ${formatHlsLevelLabel(level) || '…'}`
      : formatHlsLevelLabel(level);
    setCurrentLabel(label);
    onQualityChange?.(label);
  }, [onQualityChange]);

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

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const opts = buildQualityOptions(hls.levels, renditions);
      setOptions(opts);
      updateCurrentLabel(hls);
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, () => {
      updateCurrentLabel(hls);
    });

    attachHlsErrorRecovery(hls, {
      onFatal: () => setFatalError(true),
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [src, renditions, updateCurrentLabel]);

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
