import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import Hls from 'hls.js';
import { lmsApi, lmsHlsManifestUrl, lmsStreamUrl } from '../../services/lmsService.js';

function youtubeVideoIdFromUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace(/^\//, '').split('/')[0] || '';
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return id;
      const parts = u.pathname.split('/');
      const embedIdx = parts.indexOf('embed');
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    }
  } catch {
    return '';
  }
  return '';
}

function lessonFileHint(lesson) {
  return `${lesson?.mimeType || ''} ${lesson?.originalFilename || ''} ${lesson?.resourceUrl || ''}`.toLowerCase();
}

function isPdfLesson(lesson) {
  const hint = lessonFileHint(lesson);
  return hint.includes('application/pdf') || /\.pdf(\b|$|\?)/.test(hint);
}

function isImageLesson(lesson) {
  const mime = (lesson?.mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|gif|svg)(\b|$|\?)/i.test(lessonFileHint(lesson));
}

function DocumentOpenLink({ href, label }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-[#e4e7ec] px-4 py-3 text-sm font-semibold text-[#0b1b33]"
    >
      <FileText size={16} /> {label || 'Open document'}
    </a>
  );
}

/**
 * Stream endpoints send X-Frame-Options: DENY, so iframe the API URL directly fails.
 * Fetch → blob URL keeps preview in-page (same approach as BuildFlow PdfJs fetch).
 */
function PdfStreamPreview({ url, title }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    setSrc(null);
    setError('');
    if (!url) return undefined;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Unable to load document (${res.status})`);
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Unable to load document');
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!src) return <p className="text-sm text-[#98a2b3]">Loading document…</p>;
  return (
    <iframe
      src={src}
      title={title || 'Document'}
      className="h-[min(70vh,720px)] w-full rounded-xl border border-[#e4e7ec] bg-white"
    />
  );
}

let ytApiPromise = null;
function ensureYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try { prev?.(); } catch { /* ignore */ }
      resolve(window.YT);
    };
    const existing = document.querySelector('script[data-yt-iframe-api]');
    if (!existing) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.dataset.ytIframeApi = '1';
      s.onerror = () => reject(new Error('YouTube API failed to load'));
      document.head.appendChild(s);
    }
    window.setTimeout(() => {
      if (window.YT?.Player) resolve(window.YT);
    }, 8000);
  });
  return ytApiPromise;
}

function YouTubeTrackedPlayer({ url, initialTimeSeconds = 0, onProgress, onEnded }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const pollRef = useRef(null);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const initialTimeRef = useRef(initialTimeSeconds);

  onProgressRef.current = onProgress;
  onEndedRef.current = onEnded;
  initialTimeRef.current = initialTimeSeconds;

  useEffect(() => {
    let cancelled = false;
    const vid = youtubeVideoIdFromUrl(url);
    if (!vid) return undefined;

    ensureYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      const player = new YT.Player(hostRef.current, {
        videoId: vid,
        playerVars: { modestbranding: 1, rel: 0 },
        events: {
          onReady: (e) => {
            const t = Number(initialTimeRef.current || 0);
            if (t > 0.5) {
              try { e.target.seekTo(t, true); } catch { /* ignore */ }
            }
          },
          onStateChange: (e) => {
            if (e.data === 0) onEndedRef.current?.();
          },
        },
      });
      playerRef.current = player;
      pollRef.current = window.setInterval(() => {
        try {
          const p = playerRef.current;
          if (!p?.getCurrentTime) return;
          onProgressRef.current?.({
            currentTime: Number(p.getCurrentTime() || 0),
            duration: Number(p.getDuration?.() || 0),
          });
        } catch { /* ignore */ }
      }, 1000);
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
      try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [url]);

  return <div ref={hostRef} className="aspect-video w-full overflow-hidden rounded-xl bg-black" />;
}

/**
 * Uploaded lesson video/audio: HLS when ready (hls.js + playback token on every XHR), else progressive /stream.
 */
function LessonHlsMedia({
  lesson,
  tag = 'video',
  playbackToken,
  onEnded,
  initialTimeSeconds = 0,
  onTimeUpdate,
}) {
  const mediaRef = useRef(null);
  const onEndedRef = useRef(onEnded);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const initialSeekRef = useRef(initialTimeSeconds || 0);
  const useHls = lesson.hlsStatus === 'ready' && lesson.hlsManifestPath;

  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);
  useEffect(() => { initialSeekRef.current = initialTimeSeconds || 0; }, [lesson.id]);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el || !playbackToken) return undefined;

    const handleEnded = (e) => onEndedRef.current?.(e);
    const handleTimeUpdate = (e) => onTimeUpdateRef.current?.(e);
    el.addEventListener('ended', handleEnded);
    el.addEventListener('timeupdate', handleTimeUpdate);

    const seekOnce = () => {
      const t0 = initialSeekRef.current;
      if (t0 && Number.isFinite(t0) && t0 > 0.5) {
        try {
          const dur = Number(el.duration);
          const t = dur && Number.isFinite(dur) ? Math.min(t0, Math.max(0, dur - 1)) : t0;
          if (t > 0.5) el.currentTime = t;
        } catch { /* ignore */ }
      }
    };
    el.addEventListener('loadedmetadata', seekOnce, { once: true });

    if (!useHls) {
      el.src = lmsStreamUrl(lesson.id, playbackToken);
      return () => {
        el.removeEventListener('ended', handleEnded);
        el.removeEventListener('timeupdate', handleTimeUpdate);
        el.removeEventListener('loadedmetadata', seekOnce);
        el.removeAttribute('src');
      };
    }

    const src = lmsHlsManifestUrl(lesson.id, lesson.hlsManifestPath, playbackToken);
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        xhrSetup(xhr, url) {
          try {
            const u = new URL(url, window.location.origin);
            if (!u.searchParams.has('playback')) {
              u.searchParams.set('playback', playbackToken);
            }
            xhr.open('GET', u.toString(), true);
          } catch {
            const sep = url.includes('?') ? '&' : '?';
            xhr.open('GET', `${url}${sep}playback=${encodeURIComponent(playbackToken)}`, true);
          }
        },
      });
      hls.loadSource(src);
      hls.attachMedia(el);
      return () => {
        hls.destroy();
        el.removeEventListener('ended', handleEnded);
        el.removeEventListener('timeupdate', handleTimeUpdate);
        el.removeEventListener('loadedmetadata', seekOnce);
      };
    }

    // Safari native HLS can't attach ?playback= to relative segments → progressive fallback
    el.src = lmsStreamUrl(lesson.id, playbackToken);
    return () => {
      el.removeEventListener('ended', handleEnded);
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('loadedmetadata', seekOnce);
      el.removeAttribute('src');
    };
  }, [lesson.id, lesson.hlsStatus, lesson.hlsManifestPath, useHls, playbackToken]);

  const cls = tag === 'audio' ? 'w-full' : 'aspect-video w-full rounded-xl bg-black';
  return tag === 'audio' ? (
    <audio ref={mediaRef} controls className={cls} preload="metadata" />
  ) : (
    <video ref={mediaRef} controls className={cls} preload="metadata" />
  );
}

/**
 * Plays a lesson: YouTube (tracked) → uploaded HLS/progressive → external resourceUrl → empty.
 */
export default function LmsLessonMediaPlayer({
  lesson,
  enrollmentId = null,
  readOnly = false,
  onEnded,
}) {
  const [playbackToken, setPlaybackToken] = useState(null);
  const [tokenError, setTokenError] = useState('');
  const lastSavedRef = useRef(0);

  const youtubeId = youtubeVideoIdFromUrl(lesson?.resourceUrl);
  const hasUpload = Boolean(lesson?.hasFile);
  const isAudio = lesson?.type === 'audio';

  useEffect(() => {
    let cancelled = false;
    if (!hasUpload || !lesson?.id) {
      setPlaybackToken(null);
      return undefined;
    }
    setTokenError('');
    (async () => {
      try {
        const data = await lmsApi.issuePlaybackToken(lesson.id);
        if (!cancelled) setPlaybackToken(data.playbackToken || data.playback_token || null);
      } catch (err) {
        if (!cancelled) {
          setPlaybackToken(null);
          setTokenError(err?.message || 'Unable to issue playback token');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [lesson?.id, hasUpload]);

  const persistPlayback = async (seconds, { complete = false } = {}) => {
    if (readOnly || !enrollmentId || !lesson?.id) return;
    const now = Date.now();
    if (!complete && now - lastSavedRef.current < 5000) return;
    lastSavedRef.current = now;
    try {
      await lmsApi.updateLessonProgress(lesson.id, {
        enrollmentId,
        status: complete ? 'completed' : 'in_progress',
        lastPlaybackSeconds: Math.floor(seconds || 0),
      });
    } catch {
      // non-blocking
    }
  };

  if (!lesson) return null;

  if (lesson.type === 'video' && youtubeId) {
    return (
      <YouTubeTrackedPlayer
        url={lesson.resourceUrl}
        initialTimeSeconds={lesson.lastPlaybackSeconds || 0}
        onProgress={({ currentTime }) => persistPlayback(currentTime)}
        onEnded={() => {
          persistPlayback(lesson.lastPlaybackSeconds || 0, { complete: false });
          onEnded?.();
        }}
      />
    );
  }

  if (hasUpload && (lesson.type === 'video' || lesson.type === 'audio')) {
    if (tokenError) {
      return <p className="text-sm text-red-600">{tokenError}</p>;
    }
    if (!playbackToken) {
      return <p className="text-sm text-[#98a2b3]">Preparing secure playback…</p>;
    }
    return (
      <div className="space-y-2">
        {lesson.hlsStatus === 'pending' || lesson.hlsStatus === 'processing' ? (
          <p className="text-xs text-[#667085]">
            HLS encoding {lesson.hlsStatus} — playing progressive stream.
          </p>
        ) : null}
        {lesson.hlsStatus === 'failed' ? (
          <p className="text-xs text-[#b54708]">
            HLS unavailable ({lesson.hlsError || 'transcode failed'}) — progressive stream.
          </p>
        ) : null}
        <LessonHlsMedia
          lesson={lesson}
          tag={isAudio ? 'audio' : 'video'}
          playbackToken={playbackToken}
          initialTimeSeconds={lesson.lastPlaybackSeconds || 0}
          onTimeUpdate={(e) => persistPlayback(e.currentTarget.currentTime)}
          onEnded={() => {
            persistPlayback(eSafeCurrent(e), { complete: false });
            onEnded?.();
          }}
        />
      </div>
    );
  }

  // Uploaded documents (PDF/image/other) stream via playback token — same as BuildFlow playground.
  if (hasUpload && (lesson.type === 'document' || (!lesson.type && isPdfLesson(lesson)))) {
    if (tokenError) {
      return <p className="text-sm text-red-600">{tokenError}</p>;
    }
    if (!playbackToken) {
      return <p className="text-sm text-[#98a2b3]">Preparing secure document preview…</p>;
    }
    const url = lmsStreamUrl(lesson.id, playbackToken);
    const fileLabel = lesson.originalFilename || 'Open / Download document';
    if (isPdfLesson(lesson)) {
      return (
        <div className="space-y-3">
          <PdfStreamPreview url={url} title={lesson.title || 'Document'} />
          <DocumentOpenLink href={url} label={fileLabel} />
        </div>
      );
    }
    if (isImageLesson(lesson)) {
      return (
        <div className="space-y-3">
          <img
            src={url}
            alt={lesson.title || fileLabel}
            className="max-h-[min(70vh,720px)] w-full rounded-xl border border-[#e4e7ec] object-contain bg-[#f8fafc]"
          />
          <DocumentOpenLink href={url} label={fileLabel} />
        </div>
      );
    }
    return <DocumentOpenLink href={url} label={fileLabel} />;
  }

  if (lesson.type === 'video' && lesson.resourceUrl) {
    return (
      <video controls className="aspect-video w-full rounded-xl bg-black" src={lesson.resourceUrl}>
        <track kind="captions" />
      </video>
    );
  }

  if (lesson.type === 'audio' && lesson.resourceUrl) {
    return <audio controls className="w-full" src={lesson.resourceUrl} />;
  }

  if (lesson.type === 'document' && lesson.resourceUrl) {
    if (isPdfLesson(lesson)) {
      return (
        <div className="space-y-3">
          <PdfStreamPreview url={lesson.resourceUrl} title={lesson.title || 'Document'} />
          <DocumentOpenLink href={lesson.resourceUrl} label="Open document" />
        </div>
      );
    }
    if (isImageLesson(lesson)) {
      return (
        <img
          src={lesson.resourceUrl}
          alt={lesson.title || 'Document'}
          className="max-h-[min(70vh,720px)] w-full rounded-xl border border-[#e4e7ec] object-contain bg-[#f8fafc]"
        />
      );
    }
    return <DocumentOpenLink href={lesson.resourceUrl} label="Open document" />;
  }

  return null;
}

function eSafeCurrent() {
  return 0;
}
