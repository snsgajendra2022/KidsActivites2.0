import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import {
  getDocumentPreviewUrl,
  isImageDocument,
  isPdfDocument,
} from '../../utils/documentPreview.js';
import { getDocumentDownloadUrl } from '../../services/documentService.js';

function formatDocLabel(key = '') {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
}

export default function DocumentPreviewModal({ open, onClose, docKey, doc }) {
  const [resolvedUrl, setResolvedUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  useEffect(() => {
    if (!open || !doc) {
      setResolvedUrl(null);
      return undefined;
    }

    const inline = getDocumentPreviewUrl(doc);
    if (inline) {
      setResolvedUrl(inline);
      return undefined;
    }

    if (!doc.fileKey) {
      setResolvedUrl(null);
      return undefined;
    }

    let cancelled = false;
    setLoadingUrl(true);
    getDocumentDownloadUrl(doc.fileKey)
      .then((url) => {
        if (!cancelled) setResolvedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setResolvedUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingUrl(false);
      });

    return () => { cancelled = true; };
  }, [open, doc]);

  const previewUrl = resolvedUrl;
  const fileName = doc?.name || 'Document';
  const label = formatDocLabel(docKey);

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleOpenTab = () => {
    if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={label || 'Document Preview'}
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {previewUrl && (
            <>
              <Button variant="outline" onClick={handleOpenTab}>Open in Tab</Button>
              <Button variant="primary" onClick={handleDownload}>
                <Download size={16} />
                Download
              </Button>
            </>
          )}
        </>
      )}
    >
      {!doc?.name ? (
        <div className="doc-preview-empty">
          <FileText size={40} strokeWidth={1.5} />
          <p>No file uploaded for this document yet.</p>
        </div>
      ) : !previewUrl ? (
        <div className="doc-preview-empty">
          <FileText size={40} strokeWidth={1.5} />
          <p>
            <strong>{fileName}</strong>
          </p>
          <p className="doc-preview-empty__hint">
            {loadingUrl
              ? 'Loading document preview…'
              : 'Preview is not available for this file. Try Open in Tab or Download when a signed URL is available.'}
          </p>
        </div>
      ) : isImageDocument(doc) ? (
        <div className="doc-preview-frame doc-preview-frame--image">
          <img src={previewUrl} alt={fileName} />
        </div>
      ) : isPdfDocument(doc) ? (
        <div className="doc-preview-frame doc-preview-frame--pdf">
          <iframe src={previewUrl} title={fileName} />
        </div>
      ) : (
        <div className="doc-preview-empty">
          <FileText size={40} strokeWidth={1.5} />
          <p><strong>{fileName}</strong></p>
          <p className="doc-preview-empty__hint">This file type cannot be previewed inline. Use Open in Tab or Download.</p>
          <Button variant="outline" onClick={handleOpenTab} style={{ marginTop: 12 }}>Open File</Button>
        </div>
      )}
      {doc?.name && (
        <p className="doc-preview-meta">
          {fileName}
          {doc.size ? ` · ${(doc.size / 1024).toFixed(1)} KB` : ''}
          {doc.status ? ` · ${doc.status}` : ''}
        </p>
      )}
    </Modal>
  );
}
