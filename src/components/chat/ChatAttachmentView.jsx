import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileText, TriangleAlert } from 'lucide-react';
import { getDocumentDownloadUrl } from '../../services/documentService.js';
import { resolveTenantSlug, TENANT_HEADER } from '../../services/api/config.js';
import { getAccessToken } from '../../services/api/tokenStorage.js';
import {
  formatAttachmentSize,
  isApiHostedUrl,
  isImageAttachment,
  toAbsoluteAttachmentUrl,
} from '../../utils/chatAttachments.js';

function buildAuthHeaders() {
  const headers = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const tenantSlug = resolveTenantSlug();
  if (tenantSlug) headers[TENANT_HEADER] = tenantSlug;
  return headers;
}

async function fetchAsObjectUrl(url) {
  const response = await fetch(url, { headers: buildAuthHeaders() });
  if (!response.ok) throw new Error(`Attachment request failed (${response.status})`);
  return URL.createObjectURL(await response.blob());
}

/**
 * Renders one chat attachment from a persisted URL or file key.
 *
 * Attachment links arrive in several shapes across environments: absolute URLs,
 * API-relative paths, and storage keys that need a signed URL. Images behind the
 * tenant-authorized API also cannot load through a bare `<img src>` because the
 * browser cannot attach the bearer token, so those retry through an
 * authenticated fetch before the preview is given up on.
 */
export default function ChatAttachmentView({ attachment }) {
  const [signedUrl, setSignedUrl] = useState('');
  const [objectUrl, setObjectUrl] = useState('');
  const [failedHref, setFailedHref] = useState('');
  const [downloading, setDownloading] = useState(false);
  const objectUrlRef = useRef('');
  const authRetryRef = useRef('');

  const isImage = isImageAttachment(attachment);
  const size = formatAttachmentSize(attachment?.size);
  const fileKey = attachment?.fileKey || '';
  const fileName = attachment?.name || 'Attachment';
  const href = toAbsoluteAttachmentUrl(attachment?.url) || signedUrl;
  const previewFailed = Boolean(href) && failedHref === href;

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  useEffect(() => {
    if (href || !fileKey) return undefined;
    let cancelled = false;
    getDocumentDownloadUrl(fileKey)
      .then((resolved) => {
        if (cancelled) return;
        setSignedUrl(resolved ? toAbsoluteAttachmentUrl(resolved) : '');
      })
      .catch(() => {
        if (!cancelled) setSignedUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [href, fileKey]);

  const handleImageError = useCallback(() => {
    if (!href || authRetryRef.current === href || !isApiHostedUrl(href)) {
      setFailedHref(href);
      return;
    }
    authRetryRef.current = href;
    fetchAsObjectUrl(href)
      .then((url) => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = url;
        setObjectUrl(url);
      })
      .catch(() => setFailedHref(href));
  }, [href]);

  const handleFileOpen = useCallback(async (event) => {
    if (!href || !isApiHostedUrl(href) || downloading) return;
    event.preventDefault();
    setDownloading(true);
    try {
      const url = await fetchAsObjectUrl(href);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      window.open(href, '_blank', 'noopener');
    } finally {
      setDownloading(false);
    }
  }, [href, downloading, fileName]);

  if (!href && !fileKey) {
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

  if (isImage && !previewFailed) {
    return (
      <a
        href={objectUrl || href || undefined}
        target="_blank"
        rel="noreferrer"
        className="messages-attachment"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={objectUrl || href}
          alt={fileName}
          loading="lazy"
          onError={handleImageError}
        />
      </a>
    );
  }

  return (
    <a
      href={href || undefined}
      target="_blank"
      rel="noreferrer"
      download={fileName}
      className="messages-attachment"
      onClick={(event) => {
        event.stopPropagation();
        void handleFileOpen(event);
      }}
    >
      <span className="messages-attachment__file">
        {isImage ? <TriangleAlert size={18} /> : <FileText size={18} />}
        <span>
          <strong>{fileName}</strong>
          <small>
            {downloading
              ? 'Downloading…'
              : [isImage ? 'Preview unavailable' : '', size].filter(Boolean).join(' · ') || 'Download'}
          </small>
        </span>
        <Download size={15} className="messages-attachment__download" aria-hidden />
      </span>
    </a>
  );
}
