/**
 * Dual-video progressive MP4 quality upgrade.
 * Visible video keeps playing; hidden video preloads + seeks to currentTime;
 * only then do we crossfade / swap layers — never replace src while loading.
 */

import { isHlsUrl } from './videoSourceResolver.js';

export const PRELOAD_TIMEOUT_MS = 12_000;
const SEEK_SYNC_TOLERANCE_SEC = 0.35;
const HINT_CLEAR_MS = 1800;

/**
 * Create (or reuse) a fixed off-screen / layered preload video element.
 * Prefer a real DOM video passed from the player (dual-layer).
 */
export function ensureHiddenPreloadVideo(existing) {
  if (existing && existing.tagName === 'VIDEO') return existing;
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');
  video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;pointer-events:none;z-index:1;';
  return video;
}

function waitEvent(el, event, { signal, timeoutMs = PRELOAD_TIMEOUT_MS, filter } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('aborted'));
      return;
    }
    let settled = false;
    const cleanup = () => {
      el.removeEventListener(event, onEvent);
      signal?.removeEventListener?.('abort', onAbort);
      clearTimeout(timer);
    };
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(arg);
    };
    const onEvent = (e) => {
      if (typeof filter === 'function' && !filter(e)) return;
      done(resolve, e);
    };
    const onAbort = () => done(reject, new Error('aborted'));
    el.addEventListener(event, onEvent);
    signal?.addEventListener?.('abort', onAbort, { once: true });
    const timer = setTimeout(() => done(reject, new Error('timeout')), timeoutMs);
  });
}

/**
 * Load next quality into the hidden video until canplay, then seek to
 * the visible player's current time and wait until it can play there.
 *
 * @returns {Promise<{ ok: boolean, reason?: string, video?: HTMLVideoElement }>}
 */
export async function prepareHiddenAtCurrentTime({
  hiddenVideo,
  source,
  getVisibleTime,
  signal,
  timeoutMs = PRELOAD_TIMEOUT_MS,
}) {
  const url = source?.url;
  if (!hiddenVideo || !url) return { ok: false, reason: 'missing' };
  if (isHlsUrl(url) || source?.type === 'hls') return { ok: false, reason: 'hls_skip' };
  if (signal?.aborted) return { ok: false, reason: 'aborted' };

  hiddenVideo.muted = true;
  hiddenVideo.playsInline = true;
  hiddenVideo.preload = 'auto';
  hiddenVideo.style.opacity = '0';
  hiddenVideo.style.pointerEvents = 'none';

  try {
    hiddenVideo.pause();
  } catch { /* ignore */ }

  hiddenVideo.src = url;
  try { hiddenVideo.load(); } catch { /* ignore */ }

  try {
    await new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('aborted'));
        return;
      }
      let settled = false;
      const cleanup = () => {
        hiddenVideo.removeEventListener('canplay', onReady);
        hiddenVideo.removeEventListener('canplaythrough', onReady);
        hiddenVideo.removeEventListener('error', onErr);
        signal?.removeEventListener?.('abort', onAbort);
        clearTimeout(timer);
      };
      const done = (fn, arg) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(arg);
      };
      const onReady = () => done(resolve);
      const onErr = () => done(reject, new Error('error'));
      const onAbort = () => done(reject, new Error('aborted'));
      hiddenVideo.addEventListener('canplay', onReady);
      hiddenVideo.addEventListener('canplaythrough', onReady);
      hiddenVideo.addEventListener('error', onErr);
      signal?.addEventListener?.('abort', onAbort, { once: true });
      const timer = setTimeout(() => done(reject, new Error('timeout')), timeoutMs);
    });
  } catch (err) {
    return { ok: false, reason: err?.message === 'aborted' ? 'aborted' : (err?.message || 'timeout') };
  }

  if (signal?.aborted) return { ok: false, reason: 'aborted' };
  if (hiddenVideo.error) return { ok: false, reason: 'error' };

  // Sync near visible timestamp (capture latest — respects seeks during load).
  const target = Math.max(0, Number(getVisibleTime?.() ?? 0) || 0);
  try {
    if (Number.isFinite(target) && Math.abs((hiddenVideo.currentTime || 0) - target) > 0.05) {
      const seeked = waitEvent(hiddenVideo, 'seeked', { signal, timeoutMs: Math.min(timeoutMs, 8000) });
      hiddenVideo.currentTime = target;
      await seeked;
    }
  } catch (err) {
    return { ok: false, reason: err?.message === 'aborted' ? 'aborted' : 'seek_failed' };
  }

  if (signal?.aborted) return { ok: false, reason: 'aborted' };

  // Confirm playable at that timestamp (not just metadata).
  if (hiddenVideo.readyState < 3 /* HAVE_FUTURE_DATA */) {
    try {
      await waitEvent(hiddenVideo, 'canplay', { signal, timeoutMs: Math.min(timeoutMs, 8000) });
    } catch {
      return { ok: false, reason: 'not_ready_at_time' };
    }
  }

  const delta = Math.abs((hiddenVideo.currentTime || 0) - (getVisibleTime?.() ?? target));
  if (delta > SEEK_SYNC_TOLERANCE_SEC + 1.5) {
    // Visible sought far away during prep — re-sync once.
    try {
      const t2 = Math.max(0, Number(getVisibleTime?.() ?? 0) || 0);
      const seeked = waitEvent(hiddenVideo, 'seeked', { signal, timeoutMs: 5000 });
      hiddenVideo.currentTime = t2;
      await seeked;
      if (hiddenVideo.readyState < 3) {
        await waitEvent(hiddenVideo, 'canplay', { signal, timeoutMs: 5000 });
      }
    } catch {
      return { ok: false, reason: 'resync_failed' };
    }
  }

  return { ok: true, video: hiddenVideo, reason: 'ready' };
}

/**
 * Instant layer swap after hidden is confirmed ready at currentTime.
 * Visible keeps playing until the next layer is faded in.
 */
export async function smoothSwitchToReadySource({
  visibleVideo,
  hiddenVideo,
  nextSource,
  signal,
}) {
  if (!visibleVideo || !hiddenVideo || !nextSource?.url) {
    throw new Error('switch_missing');
  }
  if (signal?.aborted) throw new Error('aborted');
  if (visibleVideo.ended) throw new Error('ended');

  const wasPlaying = !visibleVideo.paused;
  const wasMuted = visibleVideo.muted;
  const volume = visibleVideo.volume;
  // Latest time at switch moment (seeks during preload are respected).
  const seekTo = visibleVideo.currentTime || 0;

  try {
    if (Math.abs((hiddenVideo.currentTime || 0) - seekTo) > 0.08) {
      const seeked = waitEvent(hiddenVideo, 'seeked', { signal, timeoutMs: 4000 });
      hiddenVideo.currentTime = seekTo;
      await seeked;
    }
  } catch {
    throw new Error('final_seek_failed');
  }

  if (visibleVideo.ended || signal?.aborted) throw new Error('ended');

  hiddenVideo.muted = wasMuted;
  hiddenVideo.volume = volume;

  if (wasPlaying) {
    try {
      await hiddenVideo.play();
    } catch {
      // Still swap visually; play may require gesture.
    }
  }

  // Crossfade: bring hidden to front while old continues underneath for 1 frame.
  hiddenVideo.classList.add('is-active');
  hiddenVideo.classList.remove('is-preload');
  visibleVideo.classList.remove('is-active');
  visibleVideo.classList.add('is-preload');
  hiddenVideo.style.opacity = '1';
  hiddenVideo.style.pointerEvents = 'auto';
  hiddenVideo.style.zIndex = '2';
  visibleVideo.style.opacity = '0';
  visibleVideo.style.pointerEvents = 'none';
  visibleVideo.style.zIndex = '1';

  // Move native controls to the newly active element.
  if (visibleVideo.hasAttribute('controls')) {
    visibleVideo.removeAttribute('controls');
    hiddenVideo.setAttribute('controls', '');
  }

  try { visibleVideo.pause(); } catch { /* ignore */ }

  // Tear down old source so bandwidth goes to the new quality.
  try {
    visibleVideo.removeAttribute('src');
    visibleVideo.load();
  } catch { /* ignore */ }

  return {
    activeVideo: hiddenVideo,
    idleVideo: visibleVideo,
    wasPlaying,
    seekTo,
    quality: nextSource.quality,
  };
}

export function canSwitchToQuality({
  video,
  nextSource,
  currentSource,
  failedUrls,
  videoEnded,
}) {
  if (!video || !nextSource?.url) return false;
  if (videoEnded || video.ended) return false;
  if (!currentSource?.url) return false;
  if (nextSource.url === currentSource.url) return false;
  if (failedUrls?.has?.(nextSource.url)) return false;
  return true;
}

function sleep(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener?.('abort', () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });
}

/**
 * Progressive ladder loop using dual video elements.
 *
 * @param {{
 *   progressive: Array<{url:string,quality?:string,type?:string}>,
 *   startIndex: number,
 *   getActiveVideo: () => HTMLVideoElement|null,
 *   getPreloadVideo: () => HTMLVideoElement|null,
 *   setActiveVideo?: (video: HTMLVideoElement) => void,
 *   signal: AbortSignal,
 *   isDisposed: () => boolean,
 *   onHint: (hint: string) => void,
 *   onBeforeSwitch?: () => void,
 *   onAfterSwitch?: () => void,
 *   onSwitched: (source, index, activeVideo) => void,
 *   formatQuality?: (q: string) => string,
 *   log?: Function,
 * }} params
 */
export async function runProgressiveUpgradeLoop({
  progressive,
  startIndex = 0,
  getActiveVideo,
  getPreloadVideo,
  setActiveVideo,
  signal,
  isDisposed,
  onHint,
  onBeforeSwitch,
  onAfterSwitch,
  onSwitched,
  formatQuality = (q) => String(q || '').toUpperCase(),
  log = () => {},
}) {
  if (!Array.isArray(progressive) || progressive.length < 2) return;

  const failedUrls = new Set();
  let currentIndex = Math.max(0, startIndex);

  while (!isDisposed() && !signal.aborted && currentIndex < progressive.length - 1) {
    const visible = getActiveVideo();
    if (!visible || visible.ended) {
      log('upgrade stopped — video ended or unmounted');
      onHint('');
      return;
    }

    let nextIndex = currentIndex + 1;
    while (nextIndex < progressive.length) {
      const candidate = progressive[nextIndex];
      if (!candidate?.url || failedUrls.has(candidate.url)) {
        nextIndex += 1;
        continue;
      }
      if (candidate.type === 'hls' || isHlsUrl(candidate.url)) {
        failedUrls.add(candidate.url);
        nextIndex += 1;
        continue;
      }
      break;
    }

    if (nextIndex >= progressive.length) {
      onHint('');
      return;
    }

    const current = progressive[currentIndex];
    const next = progressive[nextIndex];
    const label = formatQuality(next.quality);
    const hidden = getPreloadVideo();
    if (!hidden) {
      onHint('');
      return;
    }

    onHint('Improving quality…');
    log('preload next quality (hidden)', next.quality);

    const prepared = await prepareHiddenAtCurrentTime({
      hiddenVideo: hidden,
      source: next,
      getVisibleTime: () => getActiveVideo()?.currentTime ?? 0,
      signal,
      timeoutMs: PRELOAD_TIMEOUT_MS,
    });

    if (signal.aborted || isDisposed()) return;

    if (!prepared.ok) {
      if (prepared.reason !== 'aborted') {
        failedUrls.add(next.url);
        log('next failed — keep current, try following', {
          current: current?.quality,
          failed: next.quality,
          reason: prepared.reason,
        });
        try {
          hidden.removeAttribute('src');
          hidden.load();
        } catch { /* ignore */ }
      }
      onHint('');
      continue;
    }

    const active = getActiveVideo();
    if (!canSwitchToQuality({
      video: active,
      nextSource: next,
      currentSource: current,
      failedUrls,
      videoEnded: Boolean(active?.ended),
    })) {
      log('upgrade cancelled — ended before switch', next.quality);
      onHint('');
      try {
        hidden.removeAttribute('src');
        hidden.load();
      } catch { /* ignore */ }
      return;
    }

    onHint(`Playing ${label}`);
    log('smooth switch', { from: current?.quality, to: next.quality, at: active.currentTime });

    try {
      onBeforeSwitch?.();
      const swapped = await smoothSwitchToReadySource({
        visibleVideo: active,
        hiddenVideo: hidden,
        nextSource: next,
        signal,
      });
      if (signal.aborted || isDisposed()) return;

      setActiveVideo?.(swapped.activeVideo);
      currentIndex = nextIndex;
      onSwitched?.(next, nextIndex, swapped.activeVideo);
      onAfterSwitch?.();
      await sleep(HINT_CLEAR_MS, signal);
      if (!signal.aborted) onHint('');
    } catch (err) {
      log('switch failed — keep current visible', next.quality, err?.message);
      failedUrls.add(next.url);
      onHint('');
      // Leave visible alone; reset hidden for next attempt.
      try {
        hidden.pause();
        hidden.removeAttribute('src');
        hidden.load();
        hidden.classList.remove('is-active');
        hidden.classList.add('is-preload');
        hidden.style.opacity = '0';
        hidden.style.pointerEvents = 'none';
        hidden.style.zIndex = '1';
      } catch { /* ignore */ }
      onAfterSwitch?.();
    }
  }

  onHint('');
}
