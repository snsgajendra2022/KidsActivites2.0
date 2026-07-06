const DOCUMENT_PERSIST_KEYS = ['name', 'size', 'type', 'fieldKey', 'fileKey', 'uploadedAt', 'status'];
const DOCUMENT_STRIP_KEYS = new Set([
  'previewUrl', 'dataUrl', 'downloadUrl', 'uploadUrl', 'base64', 'content', 'file', 'blob',
]);

function isInlineDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:') && value.length > 256;
}

/** @param {Record<string, unknown> | null | undefined} doc */
export function sanitizeDocumentForPersist(doc) {
  if (!doc) return null;
  const out = {};
  DOCUMENT_PERSIST_KEYS.forEach((key) => {
    if (doc[key] != null && !isInlineDataUrl(doc[key])) {
      out[key] = doc[key];
    }
  });
  Object.entries(doc).forEach(([key, value]) => {
    if (DOCUMENT_PERSIST_KEYS.includes(key) || DOCUMENT_STRIP_KEYS.has(key)) return;
    if (value != null && !isInlineDataUrl(value)) {
      out[key] = value;
    }
  });
  return out;
}

/** @param {Record<string, unknown>} formData */
export function sanitizeEnrollmentPayload(formData) {
  if (!formData || typeof formData !== 'object') return formData;
  const next = { ...formData };
  if (next.documents && typeof next.documents === 'object') {
    next.documents = Object.fromEntries(
      Object.entries(next.documents).map(([key, doc]) => [key, sanitizeDocumentForPersist(doc)]),
    );
  }
  return next;
}
