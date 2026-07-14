/**
 * Lightweight media preloading for lightbox / progressive quality upgrades.
 */

import { getProgressiveVideoSources } from './videoSourceResolver.js';

const imageCache = new Map();
const videoMetaCache = new Map();

const DEFAULT_QUALITY_PRELOAD_TIMEOUT_MS = 10_000;

export function preloadImage(url) {
  if (!url || typeof url !== 'string') return Promise.resolve(false);
  if (imageCache.get(url) === true) return Promise.resolve(true);
  if (imageCache.has(url)) return imageCache.get(url);

  const promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, true);
      resolve(true);
    };
    img.onerror = () => {
      imageCache.set(url, false);
      resolve(false);
    };
    img.src = url;
  });
  imageCache.set(url, promise);
  return promise;
}

/**
 * Load video metadata only (not full file). Safe for next-item prep.
 */
export function preloadVideoMetadata(url) {
  if (!url || typeof url !== 'string') return Promise.resolve(false);
  if (videoMetaCache.get(url) === true) return Promise.resolve(true);
  if (videoMetaCache.has(url)) return videoMetaCache.get(url);

  // Skip HLS playlist preloading via <video> — manifests need hls.js.
  if (/\.m3u8(\?|$)/i.test(url) || /\/stream\/master/i.test(url)) {
    videoMetaCache.set(url, true);
    return Promise.resolve(true);
  }

  const promise = new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      video.removeAttribute('src');
      try { video.load(); } catch { /* ignore */ }
      videoMetaCache.set(url, ok);
      resolve(ok);
    };

    video.onloadedmetadata = () => done(true);
    video.onerror = () => done(false);
    video.src = url;

    setTimeout(() => done(videoMetaCache.get(url) === true), 6000);
  });

  videoMetaCache.set(url, promise);
  return promise;
}

/**
 * Preload next progressive quality until canplay / canplaythrough.
 * Current playback must keep running — never treat a timed-out rung as ready.
 * Cleans up the hidden video element always.
 *
 * @param {{ url: string, quality?: string, type?: string }|string} source
 * @param {{ timeoutMs?: number, signal?: AbortSignal }} [options]
 * @returns {Promise<{ ok: boolean, url: string, quality?: string, reason?: string }>}
 */
export function preloadVideoQuality(source, options = {}) {
  const url = typeof source === 'string' ? source : source?.url;
  const quality = typeof source === 'string' ? undefined : source?.quality;
  const timeoutMs = options.timeoutMs ?? DEFAULT_QUALITY_PRELOAD_TIMEOUT_MS;
  const signal = options.signal;

  if (!url || typeof url !== 'string') {
    return Promise.resolve({ ok: false, url: '', quality, reason: 'missing_url' });
  }

  // HLS ladders need hls.js — treat as not preloaded via progressive helper.
  if (/\.m3u8(\?|$)/i.test(url) || /\/stream\/master/i.test(url)) {
    return Promise.resolve({ ok: false, url, quality, reason: 'hls_skip' });
  }

  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve({ ok: false, url, quality, reason: 'aborted' });
      return;
    }

    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(video);

    let settled = false;
    let timer = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      signal?.removeEventListener?.('abort', onAbort);
      video.oncanplay = null;
      video.oncanplaythrough = null;
      video.onloadeddata = null;
      video.onerror = null;
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch { /* ignore */ }
      video.remove();
    };

    const finish = (ok, reason) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ ok, url, quality, reason });
    };

    const onAbort = () => finish(false, 'aborted');
    signal?.addEventListener?.('abort', onAbort, { once: true });

    const onReady = (reason) => finish(true, reason);
    video.addEventListener('canplaythrough', () => onReady('canplaythrough'), { once: true });
    video.addEventListener('canplay', () => onReady('canplay'), { once: true });
    video.onerror = () => finish(false, 'error');

    timer = setTimeout(() => finish(false, 'timeout'), timeoutMs);
    video.src = url;
    try { video.load(); } catch { /* ignore */ }
  });
}

/**
 * Preload poster + lowest source for the next media item only.
 */
export function preloadNextMedia(currentIndex, mediaList, resolveSources) {
  if (!Array.isArray(mediaList) || mediaList.length === 0) return Promise.resolve(false);
  if (currentIndex < 0 || currentIndex >= mediaList.length - 1) return Promise.resolve(false);

  const next = mediaList[currentIndex + 1];
  if (!next) return Promise.resolve(false);

  const resolved = typeof resolveSources === 'function'
    ? resolveSources(next)
    : getProgressiveVideoSources(next);

  const isVideo = String(next.mediaType || '').toUpperCase() === 'VIDEO'
    || Boolean(resolved?.sources?.length || resolved?.progressive?.length);

  const poster = resolved?.posterUrl
    || next.thumbnailUrl
    || next.previewUrl
    || next.imageUrl
    || null;

  const tasks = [];
  if (poster) tasks.push(preloadImage(poster));

  if (isVideo) {
    // Only lowest progressive (or HLS) — never preload full ladder for next item.
    const lowest = resolved?.progressive?.[0]
      || resolved?.sources?.find((s) => s.type !== 'hls')
      || resolved?.hls
      || resolved?.sources?.[0]
      || null;
    const firstUrl = lowest?.url
      || next.streamUrl
      || next.playbackUrl
      || next.previewUrl
      || next.downloadUrl
      || null;
    if (firstUrl) tasks.push(preloadVideoMetadata(firstUrl));
  } else if (next.previewUrl || next.imageUrl || next.downloadUrl) {
    tasks.push(preloadImage(next.previewUrl || next.imageUrl || next.downloadUrl));
  }

  return Promise.all(tasks).then((results) => results.some(Boolean));
}
