import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, LoaderCircle, TriangleAlert, X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

/**
 * Full-viewport preview for a single chat attachment.
 *
 * `src` may be an object URL created from an authenticated fetch, so the download
 * and "open in new tab" actions are handed in by the owner rather than rebuilt here.
 */
export default function ChatAttachmentLightbox({
  kind,
  src,
  name,
  meta,
  loading = false,
  failed = false,
  downloading = false,
  onDownload,
  onClose,
}) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const restoreFocusRef = useRef(null);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(panelRef.current?.querySelectorAll(FOCUSABLE) || [])
      .filter((node) => node.offsetParent !== null || node.tagName === 'IFRAME');
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }, [onClose]);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      const restore = restoreFocusRef.current;
      if (restore instanceof HTMLElement) restore.focus();
    };
  }, []);

  // Rendered at the document root: the trigger sits inside a selectable message
  // bubble, so the overlay must not inherit its stacking context or click handling.
  return createPortal((
    <div
      className="chat-lightbox"
      role="presentation"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="chat-lightbox__panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="chat-lightbox__bar">
          <span className="chat-lightbox__title">
            <strong title={name}>{name}</strong>
            {meta && <small>{meta}</small>}
          </span>
          <span className="chat-lightbox__actions">
            {src && (
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="chat-lightbox__action"
                aria-label={`Open ${name} in a new tab`}
              >
                <ExternalLink size={17} />
              </a>
            )}
            {onDownload && (
              <button
                type="button"
                className="chat-lightbox__action"
                onClick={onDownload}
                disabled={downloading}
                aria-label={`Download ${name}`}
              >
                {downloading ? <LoaderCircle size={17} className="is-spinning" /> : <Download size={17} />}
              </button>
            )}
            <button
              type="button"
              className="chat-lightbox__action"
              ref={closeRef}
              onClick={onClose}
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </span>
        </header>

        <div className="chat-lightbox__stage">
          {loading && (
            <p className="chat-lightbox__status">
              <LoaderCircle size={22} className="is-spinning" />
              Loading preview…
            </p>
          )}
          {!loading && (failed || !src) && (
            <p className="chat-lightbox__status">
              <TriangleAlert size={22} />
              This file cannot be previewed here. Use Download to open it.
            </p>
          )}
          {!loading && !failed && src && (
            kind === 'pdf'
              ? <iframe className="chat-lightbox__frame" src={src} title={name} />
              : <img className="chat-lightbox__image" src={src} alt={name} />
          )}
        </div>
      </div>
    </div>
  ), document.body);
}
