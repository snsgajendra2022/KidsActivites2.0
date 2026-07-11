import Hls from 'hls.js';
import {
  formatVideoQualityLabel,
  normalizeQualityKey,
  normalizeQualityLabel,
} from './videoMediaNormalize.js';

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

/** Level indices sorted lowest → highest by pixel height (source last). */
export function getSortedLevelIndices(hls) {
  if (!hls?.levels?.length) return [];
  return hls.levels
    .map((level, index) => ({
      index,
      height: level.height || 0,
      isSource: normalizeQualityLabel(level.name) === 'source',
    }))
    .sort((a, b) => {
      if (a.isSource && !b.isSource) return 1;
      if (!a.isSource && b.isSource) return -1;
      return a.height - b.height || a.index - b.index;
    })
    .map((entry) => entry.index);
}

/** Lowest hls.js level index by pixel height. */
export function findLowestHlsLevelIndex(hls) {
  const sorted = getSortedLevelIndices(hls);
  return sorted.length > 0 ? sorted[0] : -1;
}

/** Highest hls.js level index by pixel height (excluding source when possible). */
export function findHighestHlsLevelIndex(hls) {
  const sorted = getSortedLevelIndices(hls);
  return sorted.length > 0 ? sorted[sorted.length - 1] : -1;
}

/** Pick starting level index for progressive ramp based on API defaultQuality preference. */
export function findStartLevelForRamp(hls, defaultQuality) {
  const sorted = getSortedLevelIndices(hls);
  if (sorted.length === 0) return -1;
  if (!defaultQuality) return sorted[0];

  const targetKey = normalizeQualityKey(defaultQuality);
  let bestIdx = sorted[0];
  let bestHeight = -1;

  sorted.forEach((levelIndex) => {
    const level = hls.levels[levelIndex];
    const key = normalizeQualityKey(level.name || (level.height ? `${level.height}p` : ''));
    const height = level.height || 0;
    if (key === targetKey) {
      bestIdx = levelIndex;
      bestHeight = height;
      return;
    }
    const targetNum = parseInt(targetKey, 10);
    if (!Number.isNaN(targetNum) && height <= targetNum && height >= bestHeight) {
      bestIdx = levelIndex;
      bestHeight = height;
    }
  });

  return bestIdx;
}

/** Human-readable label for API rendition or manifest NAME (e.g. "source" → "Source"). */
export function formatDisplayLabel(label, height) {
  if (label) {
    const normalized = normalizeQualityLabel(label);
    if (normalized === 'source') return 'Source';
    return normalized || String(label);
  }
  if (height) return `${height}p`;
  return 'Unknown';
}

/** Map hls.js level index to a human label (e.g. "720p", "Source"). */
export function formatHlsLevelLabel(level) {
  if (!level) return '';
  if (level.name) return formatDisplayLabel(level.name, level.height);
  if (level.height) return `${level.height}p`;
  if (level.width) return `${level.width}w`;
  if (level.bitrate) return `${Math.round(level.bitrate / 1000)}k`;
  return 'Auto';
}

function levelQualityKey(level) {
  if (!level) return '';
  return normalizeQualityKey(level.name || (level.height ? `${level.height}p` : ''));
}

/**
 * Match a rendition to an hls.js level index using height, width, bitrate, then label.
 */
export function findHlsLevelForRendition(hls, rendition) {
  if (!hls?.levels?.length || !rendition) return -1;

  const targetKey = rendition.qualityKey || normalizeQualityKey(rendition.label, rendition.isSource);
  const targetHeight = rendition.height || 0;
  const targetWidth = rendition.width || 0;
  const targetBitrate = rendition.bitrateKbps ? rendition.bitrateKbps * 1000 : 0;

  for (let index = 0; index < hls.levels.length; index += 1) {
    const level = hls.levels[index];
    if (levelQualityKey(level) === targetKey) return index;
  }

  if (targetHeight > 0) {
    let best = -1;
    let bestDiff = Infinity;
    hls.levels.forEach((level, index) => {
      const h = level.height || 0;
      const diff = Math.abs(h - targetHeight);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = index;
      }
    });
    if (best >= 0 && bestDiff <= 2) return best;
  }

  if (targetWidth > 0) {
    let best = -1;
    let bestDiff = Infinity;
    hls.levels.forEach((level, index) => {
      const w = level.width || 0;
      const diff = Math.abs(w - targetWidth);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = index;
      }
    });
    if (best >= 0 && bestDiff <= 2) return best;
  }

  if (targetBitrate > 0) {
    let best = -1;
    let bestDiff = Infinity;
    hls.levels.forEach((level, index) => {
      const b = level.bitrate || 0;
      const diff = Math.abs(b - targetBitrate);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = index;
      }
    });
    if (best >= 0) return best;
  }

  return findHlsLevelForLabel(hls, targetKey);
}

/** Match a rendition label/key (e.g. "360p", "source") to an hls.js level index. */
export function findHlsLevelForLabel(hls, label) {
  if (!hls?.levels?.length || label == null || label === '') return -1;
  const key = normalizeQualityKey(label);

  for (let index = 0; index < hls.levels.length; index += 1) {
    const level = hls.levels[index];
    const nameKey = levelQualityKey(level);
    if (nameKey === key) return index;
  }

  const target = parseInt(key, 10);
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
  return bestDiff <= 2 ? best : -1;
}

/**
 * Build quality options from API renditions enriched with manifest level indices.
 * When manifest is parsed, only expose renditions that exist in the playlist.
 */
export function buildQualityOptions(hlsLevels = [], apiRenditions = []) {
  const ready = (apiRenditions || []).filter(
    (r) => !r.status || String(r.status).toUpperCase() === 'READY' || String(r.status).toUpperCase() === 'ACTIVE',
  );

  if (ready.length > 0) {
    const hls = hlsLevels.length > 0 ? { levels: hlsLevels } : null;
    const fromApi = ready
      .map((r) => {
        const label = formatVideoQualityLabel(r);
        const value = r.qualityKey || normalizeQualityKey(r.label, r.isSource);
        const hlsIndex = hls ? findHlsLevelForRendition(hls, r) : -1;
        return {
          label,
          value,
          height: r.height,
          width: r.width,
          bitrateKbps: r.bitrateKbps,
          hlsIndex,
          streamUrl: r.streamUrl,
          isSource: r.isSource,
        };
      })
      .sort((a, b) => {
        if (a.isSource && !b.isSource) return 1;
        if (!a.isSource && b.isSource) return -1;
        return (a.height || 0) - (b.height || 0);
      });

    if (hlsLevels.length > 0) {
      const matched = fromApi.filter((o) => o.hlsIndex >= 0);
      if (matched.length > 0) return matched;
    }

    return fromApi;
  }

  return hlsLevels
    .map((level, index) => ({
      hlsIndex: index,
      label: formatHlsLevelLabel(level),
      value: levelQualityKey(level),
      height: level.height,
      width: level.width,
      bitrateKbps: level.bitrate ? Math.round(level.bitrate / 1000) : undefined,
      isSource: normalizeQualityLabel(level.name) === 'source',
    }))
    .filter((o) => o.label)
    .sort((a, b) => {
      if (a.isSource && !b.isSource) return 1;
      if (!a.isSource && b.isSource) return -1;
      return (a.height || 0) - (b.height || 0);
    });
}

/**
 * Step through renditions one-by-one (lowest → highest), then hand off to ABR.
 * @returns {{ stop: () => void }}
 */
export function attachProgressiveQualityRamp(hls, {
  onLevelLabel,
  onComplete,
  stepMinMs = PROGRESSIVE_STEP_MIN_MS,
  stepMaxMs = PROGRESSIVE_STEP_MAX_MS,
  bufferThresholdSec = 1.5,
  startLevelIndex,
} = {}) {
  const sorted = getSortedLevelIndices(hls);
  if (sorted.length <= 1) {
    if (sorted.length === 1) {
      onLevelLabel?.(formatHlsLevelLabel(hls.levels[sorted[0]]));
    }
    onComplete?.();
    return { stop: () => {} };
  }

  let rampIdx = 0;
  if (typeof startLevelIndex === 'number' && startLevelIndex >= 0) {
    const found = sorted.indexOf(startLevelIndex);
    rampIdx = found >= 0 ? found : 0;
  }

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
    hls.nextLevel = -1;
    hls.loadLevel = -1;
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

  goToLevel(rampIdx);
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
export function attachHlsErrorRecovery(hls, { onFatal, onRecovering } = {}) {
  let mediaRecoveryAttempts = 0;
  let networkRetries = 0;
  const MAX_MEDIA_RECOVERY = 3;
  const MAX_NETWORK_RETRIES = 5;

  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (!data.fatal) return;

    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        if (networkRetries < MAX_NETWORK_RETRIES) {
          networkRetries += 1;
          onRecovering?.('network');
          const delay = Math.min(1000 * (2 ** (networkRetries - 1)), 8000);
          setTimeout(() => hls.startLoad(), delay);
        } else {
          onFatal?.(data);
          hls.destroy();
        }
        break;
      case Hls.ErrorTypes.MEDIA_ERROR:
        if (mediaRecoveryAttempts < MAX_MEDIA_RECOVERY) {
          mediaRecoveryAttempts += 1;
          onRecovering?.('media');
          hls.recoverMediaError();
        } else {
          onFatal?.(data);
          hls.destroy();
        }
        break;
      default:
        onFatal?.(data);
        hls.destroy();
        break;
    }
  });
}

/** Release hls.js to full adaptive bitrate (Auto mode). */
export function enableAutoQuality(hls) {
  if (!hls) return;
  hls.currentLevel = -1;
  hls.nextLevel = -1;
  hls.loadLevel = -1;
}
