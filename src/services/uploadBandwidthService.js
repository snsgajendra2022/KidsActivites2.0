/**
 * Upload bandwidth — measured from real uploads (best) + network probe (fallback).
 * Used to tune compression and concurrency so the app uses your full line speed.
 */

const SESSION_KEY = 'ka_measured_upload_bps';
const PROBE_ASSET = '/assets/feature_secure.png';

let measuredUploadBps = null;
let probePromise = null;

function readStoredSpeed() {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function persistSpeed(bps) {
  if (!bps || bps <= 0) return;
  measuredUploadBps = bps;
  try {
    sessionStorage.setItem(SESSION_KEY, String(Math.round(bps)));
  } catch {
    // ignore
  }
}

/** Prefer faster real measurements — if upload proves 5.30 Mbps, use it. */
function mergeSpeed(nextBps, weight = 0.6) {
  if (!nextBps || nextBps <= 0) return;
  const prev = measuredUploadBps ?? readStoredSpeed();
  if (!prev) {
    persistSpeed(nextBps);
    return;
  }
  // When a new sample is faster, trust it more (don't stay stuck on low estimate)
  const w = nextBps > prev ? Math.min(0.85, weight + 0.2) : weight;
  persistSpeed(prev * (1 - w) + nextBps * w);
}

function readConnectionEstimate() {
  const conn = navigator.connection
    || navigator.mozConnection
    || navigator.webkitConnection;
  if (!conn?.downlink || conn.downlink <= 0) return null;
  // Use 35% of reported downlink as upload guess (less conservative than 18%)
  return (conn.downlink * 1_000_000 / 8) * 0.35;
}

async function probeDownloadEstimate() {
  const url = `${window.location.origin}${PROBE_ASSET}?bw=${Date.now()}`;
  const start = performance.now();
  const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
  if (!res.ok) return null;
  const blob = await res.blob();
  const sec = (performance.now() - start) / 1000;
  if (sec < 0.25 || !blob.size) return null;
  return (blob.size / sec) * 0.35;
}

export async function probeUploadBandwidth() {
  if (probePromise) return probePromise;

  measuredUploadBps = measuredUploadBps ?? readStoredSpeed();

  probePromise = (async () => {
    const connEstimate = readConnectionEstimate();
    if (connEstimate) mergeSpeed(connEstimate, 0.4);

    try {
      const downloadEstimate = await probeDownloadEstimate();
      if (downloadEstimate) mergeSpeed(downloadEstimate, 0.45);
    } catch {
      // offline
    }

    return getUploadBytesPerSecond();
  })();

  return probePromise;
}

/** Called after each upload — this is the most accurate speed reading. */
export function recordMeasuredUploadSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond <= 0) return;
  mergeSpeed(bytesPerSecond, 0.8);
}

export function getUploadBytesPerSecond() {
  return measuredUploadBps ?? readStoredSpeed();
}

export function getUploadMbps() {
  const bps = getUploadBytesPerSecond();
  return bps ? (bps * 8) / 1_000_000 : null;
}

/** Rolling window speed from XHR progress (last 5 seconds). */
export function appendSpeedSample(samples, bytesLoaded) {
  const now = Date.now();
  const next = [...(samples || []), { t: now, bytes: bytesLoaded }];
  return next.filter((s) => s.t >= now - 5000);
}

export function getSmoothedBytesPerSecond(samples) {
  if (!samples || samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dt = (last.t - first.t) / 1000;
  const dBytes = last.bytes - first.bytes;
  if (dt < 1 || dBytes < 32 * 1024) return null;
  return dBytes / dt;
}

export function getEffectiveSpeedBytesPerSecond(item) {
  const smoothed = getSmoothedBytesPerSecond(item?.speedSamples);
  if (smoothed) return smoothed;
  if (item?.bytesLoaded && item?.uploadStartedAt) {
    const elapsed = (Date.now() - item.uploadStartedAt) / 1000;
    if (elapsed >= 2) return item.bytesLoaded / elapsed;
  }
  return getUploadBytesPerSecond();
}

export function getTargetPhotoBytes() {
  const bps = getUploadBytesPerSecond();
  if (!bps) return 1024 * 1024;

  // 5+ Mbps — keep photo quality, use full speed on larger files
  if (bps >= 600 * 1024) return Math.max(2 * 1024 * 1024, Math.round(bps * 10));
  if (bps >= 400 * 1024) return Math.max(1024 * 1024, Math.round(bps * 6));
  if (bps >= 250 * 1024) return Math.max(600 * 1024, Math.round(bps * 4));
  return Math.max(200 * 1024, Math.round(bps * 2));
}

export function getUploadTuning() {
  const bps = getUploadBytesPerSecond();

  if (!bps) {
    return {
      maxConcurrent: 3,
      maxVideoConcurrent: 1,
      compressionQuality: 0.82,
      maxWidth: 1920,
      maxHeight: 1920,
      targetMaxBytes: 1024 * 1024,
    };
  }

  // ~5.30 Mbps and above — use full bandwidth, 4 parallel photo uploads
  if (bps >= 600 * 1024) {
    return {
      maxConcurrent: 4,
      maxVideoConcurrent: 1,
      compressionQuality: 0.88,
      maxWidth: 2048,
      maxHeight: 2048,
      targetMaxBytes: getTargetPhotoBytes(),
    };
  }

  if (bps >= 400 * 1024) {
    return {
      maxConcurrent: 4,
      maxVideoConcurrent: 1,
      compressionQuality: 0.84,
      maxWidth: 1920,
      maxHeight: 1920,
      targetMaxBytes: getTargetPhotoBytes(),
    };
  }

  if (bps >= 250 * 1024) {
    return {
      maxConcurrent: 3,
      maxVideoConcurrent: 1,
      compressionQuality: 0.78,
      maxWidth: 1600,
      maxHeight: 1600,
      targetMaxBytes: getTargetPhotoBytes(),
    };
  }

  return {
    maxConcurrent: 2,
    maxVideoConcurrent: 1,
    compressionQuality: 0.68,
    maxWidth: 1280,
    maxHeight: 1280,
    targetMaxBytes: getTargetPhotoBytes(),
  };
}
