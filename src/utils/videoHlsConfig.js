import Hls from 'hls.js';
import {
  formatVideoQualityLabel,
  normalizeQualityKey,
  normalizeQualityLabel,
} from './videoMediaNormalize.js';

/**
 * Reliable HLS: start lowest (index 0 / ramp), then ABR upgrades silently.
 */
export function createProductionHlsConfig() {
  const connection = typeof navigator !== 'undefined' ? navigator.connection : null;
  const saveData = connection?.saveData === true;
  const effectiveType = connection?.effectiveType;
  const slowLink = saveData || effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';

  return {
    enableWorker: true,
    lowLatencyMode: false,
    startLevel: 0,
    autoStartLoad: true,
    capLevelToPlayerSize: true,
    maxBufferLength: slowLink ? 20 : 30,
    maxMaxBufferLength: 60,
    maxBufferSize: 60 * 1000 * 1000,
    maxBufferHole: 0.5,
    abrEwmaDefaultEstimate: slowLink ? 800_000 : 2_500_000,
    abrBandWidthFactor: 0.85,
    abrBandWidthUpFactor: 0.5,
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

/**
 * Progressive ramp always starts at the lowest ready level so playback begins
 * quickly (240p → 360p → … → max), then locks on the best ready quality.
 * `defaultQuality` is intentionally unused for start.
 */
export function findStartLevelForRamp(hls) {
  const sorted = getSortedLevelIndices(hls);
  return sorted.length > 0 ? sorted[0] : -1;
}

/**
 * Cap progressive ramp / ABR at API maxQuality (e.g. "1080p").
 * Returns the highest allowed hls.js level index, or -1 if uncapped.
 */
export function findMaxLevelForCap(hls, maxQuality) {
  const sorted = getSortedLevelIndices(hls);
  if (sorted.length === 0) return -1;
  if (!maxQuality) return sorted[sorted.length - 1];

  const targetKey = normalizeQualityKey(maxQuality);
  if (targetKey === 'source') return sorted[sorted.length - 1];

  const targetNum = parseInt(targetKey, 10);
  if (Number.isNaN(targetNum)) return sorted[sorted.length - 1];

  let bestIdx = sorted[0];
  let bestHeight = -1;
  sorted.forEach((levelIndex) => {
    const level = hls.levels[levelIndex];
    const height = level.height || 0;
    const isSource = normalizeQualityLabel(level.name) === 'source';
    if (isSource) return;
    if (height <= targetNum && height >= bestHeight) {
      bestIdx = levelIndex;
      bestHeight = height;
    }
  });
  return bestIdx;
}

/** Level indices from lowest → highest, capped at maxQuality when provided. */
export function getRampLevelIndices(hls, maxQuality) {
  const sorted = getSortedLevelIndices(hls);
  if (sorted.length === 0) return [];
  const maxIdx = findMaxLevelForCap(hls, maxQuality);
  if (maxIdx < 0) return sorted;
  const maxPos = sorted.indexOf(maxIdx);
  if (maxPos < 0) return sorted;
  return sorted.slice(0, maxPos + 1);
}

/** Apply hls.js autoLevelCapping so ABR never exceeds maxQuality. */
export function applyMaxQualityCap(hls, maxQuality) {
  if (!hls?.levels?.length) return;
  const maxIdx = findMaxLevelForCap(hls, maxQuality);
  if (maxIdx < 0) return;
  hls.autoLevelCapping = maxIdx;
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
 * Optionally hide qualities above maxQuality.
 */
export function buildQualityOptions(hlsLevels = [], apiRenditions = [], { maxQuality } = {}) {
  const ready = (apiRenditions || []).filter(
    (r) => !r.status || String(r.status).toUpperCase() === 'READY' || String(r.status).toUpperCase() === 'ACTIVE',
  );

  const maxKey = maxQuality ? normalizeQualityKey(maxQuality) : null;
  const maxHeight = maxKey && maxKey !== 'source' ? parseInt(maxKey, 10) : null;
  const withinMax = (option) => {
    if (!maxKey || maxKey === 'source') return true;
    if (option.isSource) return false;
    if (Number.isNaN(maxHeight)) return true;
    return (option.height || 0) <= maxHeight;
  };

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
      .filter(withinMax)
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
    .filter(withinMax)
    .sort((a, b) => {
      if (a.isSource && !b.isSource) return 1;
      if (!a.isSource && b.isSource) return -1;
      return (a.height || 0) - (b.height || 0);
    });
}

/**
 * Background quality climb: 240 → 360 → 480 → 720 → 1080 → source.
 * One rung at a time. Keep playing the current rung until the next switch
 * is confirmed (LEVEL_SWITCHED). If the next rung is not ready, pull back
 * and keep current — never skip intermediates.
 * @returns {{ stop: () => void }}
 */
export function attachBackgroundQualityClimb(hls, {
  maxQuality,
  onLevelLabel,
  isManual = () => false,
  minBufferSec = 2.5,
  stepMs = 3500,
  switchTimeoutMs = 12_000,
  onStep,
} = {}) {
  const sorted = getRampLevelIndices(hls, maxQuality);
  applyMaxQualityCap(hls, maxQuality);

  if (!hls || sorted.length === 0) {
    return { stop: () => {} };
  }

  let rampIdx = 0;
  let stopped = false;
  let timer = null;
  let awaitingSwitch = false;
  let pendingLevel = -1;
  let switchStartedAt = 0;

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const bufferAhead = () => {
    const video = hls.media;
    if (!video?.buffered?.length) return 0;
    return Math.max(0, video.buffered.end(video.buffered.length - 1) - video.currentTime);
  };

  const emit = (levelIndex) => {
    const level = hls.levels[levelIndex];
    if (level) onLevelLabel?.(formatHlsLevelLabel(level));
  };

  /** Pin playback to exactly one ladder step (blocks ABR skip). */
  const lockTo = (levelIndex) => {
    hls.autoLevelCapping = levelIndex;
    hls.currentLevel = levelIndex;
    hls.nextLevel = levelIndex;
    hls.loadLevel = levelIndex;
  };

  const schedule = (ms) => {
    clearTimer();
    if (stopped) return;
    timer = setTimeout(tryClimb, ms);
  };

  const abortPendingSwitch = (reason) => {
    if (!awaitingSwitch) return;
    const current = sorted[rampIdx];
    awaitingSwitch = false;
    pendingLevel = -1;
    switchStartedAt = 0;
    lockTo(current);
    // Keep current quality playing; retry the same next rung later.
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[hlsClimb] next not ready — keep current', {
        reason,
        current: formatHlsLevelLabel(hls.levels[current]),
      });
    }
  };

  const tryClimb = () => {
    if (stopped || isManual()) return;

    if (awaitingSwitch) {
      // Next rung still not confirmed — do not stop current; wait or rollback.
      if (switchStartedAt && Date.now() - switchStartedAt > switchTimeoutMs) {
        abortPendingSwitch('switch_timeout');
        schedule(stepMs);
        return;
      }
      schedule(500);
      return;
    }

    if (rampIdx >= sorted.length - 1) {
      // Stay locked on top rung — do not re-enable free ABR (avoids flicker).
      lockTo(sorted[rampIdx]);
      applyMaxQualityCap(hls, maxQuality);
      return;
    }

    // Current must be healthy before attempting an upgrade.
    if (bufferAhead() < minBufferSec) {
      schedule(400);
      return;
    }

    const video = hls.media;
    if (video?.ended) {
      // Finished on current quality — do not switch upward.
      lockTo(sorted[rampIdx]);
      return;
    }

    const nextIdx = rampIdx + 1;
    const nextLevel = sorted[nextIdx];
    awaitingSwitch = true;
    pendingLevel = nextLevel;
    switchStartedAt = Date.now();
    // Allow only the next rung — never uncapped ABR. Keep currentLevel pinned
    // until LEVEL_SWITCHED confirms the upgrade; nextLevel loads at boundary.
    hls.autoLevelCapping = nextLevel;
    hls.nextLevel = nextLevel;
    hls.loadLevel = nextLevel;
    onStep?.(formatHlsLevelLabel(hls.levels[nextLevel]), nextIdx, sorted.length);
    schedule(500);
  };

  const onLevelSwitched = (_event, data) => {
    if (stopped) return;
    const level = data.level;

    if (awaitingSwitch && pendingLevel >= 0) {
      if (level === pendingLevel) {
        rampIdx = sorted.indexOf(pendingLevel);
        if (rampIdx < 0) rampIdx = 0;
        awaitingSwitch = false;
        pendingLevel = -1;
        switchStartedAt = 0;
        lockTo(level);
        emit(level);
        if (!isManual() && rampIdx < sorted.length - 1) {
          schedule(stepMs);
        }
        return;
      }

      // Jumped past the intended next rung — pull back to pending only.
      const pendingHeight = hls.levels[pendingLevel]?.height || 0;
      const actualHeight = hls.levels[level]?.height || 0;
      if (actualHeight > pendingHeight) {
        lockTo(pendingLevel);
        return;
      }
    }

    // Spontaneous switch while locked — force back to current ramp.
    const locked = sorted[rampIdx];
    if (!awaitingSwitch && level !== locked) {
      lockTo(locked);
      return;
    }

    emit(level);
  };

  const onError = (_event, data) => {
    if (stopped || !awaitingSwitch) return;
    // Level/fragment failure while upgrading — stay on current, retry later.
    if (data?.details && /LEVEL|FRAG|BUFFER/i.test(String(data.details))) {
      abortPendingSwitch(data.details);
      schedule(stepMs);
    }
  };

  // Start lowest and lock ABR so it cannot skip intermediates.
  const startLevel = sorted[0];
  hls.startLevel = startLevel;
  lockTo(startLevel);
  emit(startLevel);
  onStep?.(formatHlsLevelLabel(hls.levels[startLevel]), 0, sorted.length);

  hls.on(Hls.Events.LEVEL_SWITCHED, onLevelSwitched);
  hls.on(Hls.Events.ERROR, onError);
  schedule(stepMs);

  return {
    stop: () => {
      stopped = true;
      clearTimer();
      hls.off(Hls.Events.LEVEL_SWITCHED, onLevelSwitched);
      hls.off(Hls.Events.ERROR, onError);
    },
  };
}

/**
 * @deprecated Use attachBackgroundQualityClimb.
 */
export function attachProgressiveQualityRamp(hls, options = {}) {
  return attachBackgroundQualityClimb(hls, options);
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

/** Auto = ABR (hls.js chooses), capped at maxQuality. */
export function enableAutoQuality(hls, maxQuality) {
  if (!hls) return;
  applyMaxQualityCap(hls, maxQuality);
  hls.currentLevel = -1;
  hls.nextLevel = -1;
  hls.loadLevel = -1;
}
