import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, FileText, LoaderCircle, TriangleAlert } from 'lucide-react';
import { getDocumentDownloadUrl } from '../../services/documentService.js';
import { resolveTenantSlug, TENANT_HEADER } from '../../services/api/config.js';
import { getAccessToken } from '../../services/api/tokenStorage.js';
import {
  attachmentPreviewKind,
  attachmentUrlCandidates,
  formatAttachmentSize,
  isApiHostedUrl,
  isLocalAttachmentUrl,
} from '../../utils/chatAttachments.js';
import ChatAttachmentLightbox from './ChatAttachmentLightbox.jsx';

function buildAuthHeaders() {
  const headers = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const tenantSlug = resolveTenantSlug();
  if (tenantSlug) headers[TENANT_HEADER] = tenantSlug;
  return headers;
}

/**
 * A single-page-app host answers an unknown path with `index.html`, and an API
 * answers a rejected download with a JSON error — both arrive as `200 OK`, so the
 * body type has to be checked before it is treated as the file.
 */
function isWrongBodyType(contentType) {
  const type = String(contentType || '').toLowerCase();
  if (!type) return false;
  return type.startsWith('text/html') || type.startsWith('application/json');
}

async function fetchAsBlobUrl(url) {
  const response = await fetch(url, { headers: buildAuthHeaders() });
  if (!response.ok) throw new Error(`Attachment request failed (${response.status})`);
  if (isWrongBodyType(response.headers.get('content-type'))) {
    throw new Error('Attachment response was not a file');
  }
  const blob = await response.blob();
  if (blob.size === 0) throw new Error('Attachment response was empty');
  return URL.createObjectURL(blob);
}

const UNRESOLVED = { key: '', status: 'idle', url: '', isObjectUrl: false };

/**
 * Renders one chat attachment: inline preview for images, an on-demand preview for
 * PDFs, and name plus download for everything else.
 *
 * A stored file is reachable in several ways depending on the deployment — an
 * absolute URL, a path rooted at the host, a path rooted under the API prefix, or a
 * storage key needing a signed URL — and tenant-authorized files additionally cannot
 * load through a bare `<img src>` because the browser will not attach the bearer
 * token. Every one of those is attempted before a preview is given up on.
 */
export default function ChatAttachmentView({ attachment }) {
  const [resolved, setResolved] = useState(UNRESOLVED);
  const [downloading, setDownloading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const objectUrlsRef = useRef([]);

  const previewKind = attachmentPreviewKind(attachment);
  const fileName = attachment?.name || 'Attachment';
  const size = formatAttachmentSize(attachment?.size);
  const fileKey = attachment?.fileKey || '';
  const rawUrl = attachment?.url || '';

  // Derived so a new attachment starts from a clean state without an extra render pass.
  const identity = `${previewKind}|${rawUrl}|${fileKey}`;
  const source = useMemo(() => (
    resolved.key === identity
      ? resolved
      : {
        key: identity,
        status: previewKind === 'image' ? 'loading' : 'idle',
        url: '',
        isObjectUrl: false,
      }
  ), [resolved, identity, previewKind]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  /**
   * Walk every base the file could live under, then the signed-URL endpoint, and
   * return the first source the browser can actually render.
   */
  const resolveViewable = useCallback(async () => {
    const attempt = async (value) => {
      const candidates = attachmentUrlCandidates(value);
      if (candidates.length === 0) return null;

      // Anything outside the API host (data URLs, public CDN links) loads directly and
      // keeps normal browser caching.
      const direct = candidates.find((candidate) => (
        isLocalAttachmentUrl(candidate) || !isApiHostedUrl(candidate)
      ));
      if (direct) return { url: direct, isObjectUrl: false };

      for (const candidate of candidates) {
        try {
          const blobUrl = await fetchAsBlobUrl(candidate);
          objectUrlsRef.current.push(blobUrl);
          return { url: blobUrl, isObjectUrl: true };
        } catch {
          // Try the next base before falling back to the signed-URL endpoint.
        }
      }
      return null;
    };

    const fromUrl = rawUrl ? await attempt(rawUrl) : null;
    if (fromUrl) return fromUrl;

    // A direct URL that cannot be fetched may still have a signable storage key.
    if (fileKey) {
      try {
        const signed = await getDocumentDownloadUrl(fileKey);
        if (signed) return await attempt(signed);
      } catch {
        return null;
      }
    }
    return null;
  }, [rawUrl, fileKey]);

  // Only images resolve up front, because their thumbnail has to render immediately.
  // PDFs and plain files resolve when the user asks to preview or download them.
  useEffect(() => {
    if (previewKind !== 'image') return undefined;

    let cancelled = false;
    resolveViewable()
      .then((found) => {
        if (cancelled) return;
        if (found) {
          setResolved({ key: identity, status: 'ready', ...found });
          return;
        }
        // Cross-origin rules can block the authenticated fetch on a file the browser
        // would happily load itself, so one plain attempt is still worth making.
        const fallback = attachmentUrlCandidates(rawUrl)[0] || '';
        setResolved({
          key: identity,
          status: fallback ? 'ready' : 'failed',
          url: fallback,
          isObjectUrl: false,
        });
      })
      .catch(() => {
        if (!cancelled) setResolved({ ...UNRESOLVED, key: identity, status: 'failed' });
      });

    return () => {
      cancelled = true;
    };
  }, [previewKind, identity, resolveViewable, rawUrl]);

  const ensureSource = useCallback(async () => {
    if (source.status === 'ready' && source.url) return source;
    const found = await resolveViewable();
    const next = found
      ? { key: identity, status: 'ready', ...found }
      : { ...UNRESOLVED, key: identity, status: 'failed' };
    setResolved(next);
    return next;
  }, [source, resolveViewable, identity]);

  const handleOpenPreview = useCallback(async (event) => {
    event?.stopPropagation?.();
    setLightboxOpen(true);
    await ensureSource();
  }, [ensureSource]);

  const handleDownload = useCallback(async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (downloading) return;

    setDownloading(true);
    try {
      const found = await ensureSource();
      if (!found.url) {
        // Nothing was fetchable, so hand the raw link to the browser as a last resort.
        const fallback = attachmentUrlCandidates(rawUrl)[0] || '';
        if (fallback) window.open(fallback, '_blank', 'noopener');
        return;
      }

      const link = document.createElement('a');
      link.href = found.url;
      link.download = fileName;
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      setDownloading(false);
    }
  }, [downloading, ensureSource, fileName, rawUrl]);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  if (!rawUrl && !fileKey) {
    return (
      <span className="messages-attachment__file messages-attachment__file--broken">
        <TriangleAlert size={18} />
        <span>
          <strong>{fileName}</strong>
          <small>This file is no longer available</small>
        </span>
      </span>
    );
  }

  const imageReady = previewKind === 'image' && source.status === 'ready' && Boolean(source.url);

  const lightbox = lightboxOpen ? (
    <ChatAttachmentLightbox
      kind={previewKind}
      src={source.url}
      loading={source.status === 'loading'}
      failed={source.status === 'failed'}
      name={fileName}
      meta={size}
      downloading={downloading}
      onDownload={handleDownload}
      onClose={closeLightbox}
    />
  ) : null;

  if (previewKind === 'image' && source.status === 'loading') {
    return (
      <span className="messages-attachment__file messages-attachment__file--pending">
        <LoaderCircle size={18} className="is-spinning" />
        <span>
          <strong>{fileName}</strong>
          <small>Loading preview…</small>
        </span>
      </span>
    );
  }

  if (imageReady) {
    return (
      <>
        <button
          type="button"
          className="messages-attachment messages-attachment__thumb"
          onClick={handleOpenPreview}
          aria-label={`Open preview of ${fileName}`}
        >
          <img
            src={source.url}
            alt={fileName}
            loading="lazy"
            onError={() => setResolved({ ...UNRESOLVED, key: identity, status: 'failed' })}
          />
          <span className="messages-attachment__thumb-hint" aria-hidden>
            <Eye size={14} />
          </span>
        </button>
        {lightbox}
      </>
    );
  }

  const previewUnavailable = previewKind === 'image';
  const detail = downloading
    ? 'Downloading…'
    : [previewUnavailable ? 'Preview unavailable' : '', size].filter(Boolean).join(' · ') || 'Download';

  return (
    <>
      <span className="messages-attachment messages-attachment__row">
        <a
          href={source.url || undefined}
          target="_blank"
          rel="noreferrer"
          download={fileName}
          className="messages-attachment__file"
          onClick={handleDownload}
        >
          {previewUnavailable ? <TriangleAlert size={18} /> : <FileText size={18} />}
          <span>
            <strong>{fileName}</strong>
            <small>{detail}</small>
          </span>
          <Download size={15} className="messages-attachment__download" aria-hidden />
        </a>
        {previewKind === 'pdf' && (
          <button
            type="button"
            className="messages-attachment__action"
            onClick={handleOpenPreview}
            aria-label={`Preview ${fileName}`}
          >
            <Eye size={15} />
          </button>
        )}
      </span>
      {lightbox}
    </>
  );
}
