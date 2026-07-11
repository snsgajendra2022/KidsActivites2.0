import Hls from 'hls.js';

/** Minimum time each rendition stays visible during progressive ramp (ms). */
export const PROGRESSIVE_STEP_MIN_MS = 700;

/** Fallback max wait before forcing step-up to next rendition (ms). */
export const PROGRESSIVE_STEP_MAX_MS = 2200;

/**
 * Production-oriented hls.js settings: start at lowest level, adaptive upgrade.
 */
export function createProductionHlsConfig() {
  const connection = typeof navigator !== 'undefined' ? navigator.connection : null;
  const saveData = connection?.saveData === true;
  const effectiveType = connection?.effectiveType;
  const slowLink = saveData || effectiveType === 'slow-2g' || effectiveType === '2g';

  return {
    enableWorker: true,
    lowLatencyMode: false,
    startLevel: 0,
    capLevelToPlayerSize: false,
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

/** Level indices sorted lowest → highest by pixel height. */
export function getSortedLevelIndices(hls) {
  if (!hls?.levels?.length) return [];
  return hls.levels
    .map((level, index) => ({ index, height: level.height || 0 }))
    .sort((a, b) => a.height - b.height || a.index - b.index)
    .map((entry) => entry.index);
}

/** Lowest hls.js level index by pixel height. */
export function findLowestHlsLevelIndex(hls) {
  const sorted = getSortedLevelIndices(hls);
  return sorted.length > 0 ? sorted[0] : -1;
}

/** Pick the highest-ready rendition label from API metadata (e.g. "720p"). */
export function pickHighestRenditionLabel(apiRenditions = []) {
  const ready = (apiRenditions || []).filter(
    (r) => !r.status || r.status === 'READY',
  );
  if (ready.length === 0) return null;

  const sorted = [...ready].sort((a, b) => (a.height || 0) - (b.height || 0));
  const highest = sorted[sorted.length - 1];
  return highest?.label || (highest?.height ? `${highest.height}p` : null);
}

/** Highest hls.js level index by pixel height. */
export function findHighestHlsLevelIndex(hls) {
  const sorted = getSortedLevelIndices(hls);
  return sorted.length > 0 ? sorted[sorted.length - 1] : -1;
}

/**
 * Step through renditions one-by-one (lowest → highest), then hand off to ABR.
 * Works while paused — hls.js keeps buffering in the background.
 *
 * @returns {{ stop: () => void }}
 */
export function attachProgressiveQualityRamp(hls, {
  onLevelLabel,
  onComplete,
  stepMinMs = PROGRESSIVE_STEP_MIN_MS,
  stepMaxMs = PROGRESSIVE_STEP_MAX_MS,
  bufferThresholdSec = 1.5,
} = {}) {
  const sorted = getSortedLevelIndices(hls);
  if (sorted.length <= 1) {
    onComplete?.();
    return { stop: () => {} };
  }

  let rampIdx = 0;
  let stopped = false;
  let stepTimer = null;
  let maxTimer = null;
  let stepStartedAt = 0;

  const clearTimers = () => {
    if (stepTimer) {
      clearTimeout(stepTimer);
      stepTimer = null;
    }
    if (maxTimer) {
      clearTimeout(maxTimer);
      maxTimer = null;
    }
  };

  const emitLabel = () => {
    const level = hls.levels[sorted[rampIdx]];
    onLevelLabel?.(formatHlsLevelLabel(level));
  };

  const finishRamp = () => {
    if (stopped) return;
    stopped = true;
    clearTimers();
    hls.off(Hls.Events.FRAG_BUFFERED, onFragBuffered);
    hls.currentLevel = -1;
    onComplete?.();
  };

  const goToLevel = (idx) => {
    rampIdx = idx;
    hls.currentLevel = sorted[rampIdx];
    emitLabel();
    stepStartedAt = Date.now();
  };

  const scheduleStepUp = (delayMs) => {
    clearTimers();
    if (stopped || rampIdx >= sorted.length - 1) {
      finishRamp();
      return;
    }
    stepTimer = setTimeout(tryStepUp, delayMs);
    maxTimer = setTimeout(() => {
      if (stopped || rampIdx >= sorted.length - 1) return;
      goToLevel(rampIdx + 1);
      scheduleStepUp(stepMinMs);
    }, stepMaxMs);
  };

  const tryStepUp = () => {
    if (stopped) return;
    if (rampIdx >= sorted.length - 1) {
      finishRamp();
      return;
    }
    const elapsed = Date.now() - stepStartedAt;
    if (elapsed < stepMinMs) {
      scheduleStepUp(stepMinMs - elapsed);
      return;
    }
    goToLevel(rampIdx + 1);
    if (rampIdx >= sorted.length - 1) {
      finishRamp();
      return;
    }
    scheduleStepUp(stepMinMs);
  };

  const bufferAheadSec = () => {
    const video = hls.media;
    if (!video?.buffered?.length) return 0;
    const end = video.buffered.end(video.buffered.length - 1);
    return Math.max(0, end - video.currentTime);
  };

  const onFragBuffered = () => {
    if (stopped || rampIdx >= sorted.length - 1) return;
    const elapsed = Date.now() - stepStartedAt;
    if (elapsed >= stepMinMs && bufferAheadSec() >= bufferThresholdSec) {
      tryStepUp();
    }
  };

  goToLevel(0);
  hls.on(Hls.Events.FRAG_BUFFERED, onFragBuffered);
  scheduleStepUp(stepMinMs);

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      clearTimers();
      hls.off(Hls.Events.FRAG_BUFFERED, onFragBuffered);
    },
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
