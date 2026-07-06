import Hls from 'hls.js';

/**
 * Production-oriented hls.js settings: adaptive bitrate, buffer tuning, save-data awareness.
 */
export function createProductionHlsConfig() {
  const connection = typeof navigator !== 'undefined' ? navigator.connection : null;
  const saveData = connection?.saveData === true;
  const effectiveType = connection?.effectiveType;
  const slowLink = saveData || effectiveType === 'slow-2g' || effectiveType === '2g';

  return {
    enableWorker: true,
    lowLatencyMode: false,
    startLevel: -1,
    capLevelToPlayerSize: true,
    maxMaxBufferLength: 60,
    maxBufferLength: slowLink ? 20 : 30,
    maxBufferSize: 60 * 1000 * 1000,
    maxBufferHole: 0.5,
    abrEwmaDefaultEstimate: slowLink ? 400000 : undefined,
    abrBandWidthFactor: slowLink ? 0.75 : 0.95,
    abrBandWidthUpFactor: slowLink ? 0.45 : 0.7,
    startFragPrefetch: true,
    testBandwidth: true,
  };
}

/**
 * Recover from transient HLS failures (network blips, media decode stalls).
 */
export function attachHlsErrorRecovery(hls, { onFatal } = {}) {
  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (!data.fatal) return;

    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        hls.startLoad();
        break;
      case Hls.ErrorTypes.MEDIA_ERROR:
        hls.recoverMediaError();
        break;
      default:
        onFatal?.(data);
        hls.destroy();
        break;
    }
  });
}

/** Map hls.js level index to a human label (e.g. "720p"). */
export function formatHlsLevelLabel(level) {
  if (!level) return '';
  if (level.height) return `${level.height}p`;
  if (level.width) return `${level.width}w`;
  if (level.bitrate) return `${Math.round(level.bitrate / 1000)}k`;
  return 'Auto';
}

/** Prefer API renditions metadata when present; otherwise derive from hls.js levels. */
export function buildQualityOptions(hlsLevels = [], apiRenditions = []) {
  const ready = (apiRenditions || []).filter(
    (r) => !r.status || r.status === 'READY',
  );

  if (ready.length > 0) {
    return ready
      .map((r) => ({
        label: r.label || (r.height ? `${r.height}p` : 'Unknown'),
        height: r.height,
        bitrateKbps: r.bitrateKbps,
      }))
      .sort((a, b) => (a.height || 0) - (b.height || 0));
  }

  return hlsLevels
    .map((level, index) => ({
      hlsIndex: index,
      label: formatHlsLevelLabel(level),
      height: level.height,
      bitrateKbps: level.bitrate ? Math.round(level.bitrate / 1000) : undefined,
    }))
    .filter((o) => o.label)
    .sort((a, b) => (a.height || 0) - (b.height || 0));
}

/** Match a rendition label (e.g. "360p") to an hls.js level index. */
export function findHlsLevelForLabel(hls, label) {
  if (!hls || !label) return -1;
  const target = parseInt(label, 10);
  if (Number.isNaN(target)) return -1;

  let best = -1;
  let bestDiff = Infinity;
  hls.levels.forEach((level, index) => {
    const h = level.height || 0;
    const diff = Math.abs(h - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = index;
    }
  });
  return best;
}
