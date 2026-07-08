const DOCUMENT_PERSIST_KEYS = ['name', 'size', 'type', 'fieldKey', 'fileKey', 'uploadedAt', 'status'];
const DOCUMENT_STRIP_KEYS = new Set([
  'previewUrl', 'dataUrl', 'downloadUrl', 'uploadUrl', 'base64', 'content', 'file', 'blob',
]);

/**
 * Form paths where inline data URLs are intentionally persisted (signatures + passport photos).
 * These are small, bounded images that belong to the printable form itself; there is no separate
 * media/object-storage endpoint for them, so they are kept inline like signatures.
 */
const INLINE_ALLOWED_PATHS = new Set([
  'permissions.emergency.signature',
  'permissions.fieldTrip.signature',
  'permissions.verification.signature',
  'officeUse.signature',
  'declaration.signature',
  'photos.child',
  'photos.father',
  'photos.mother',
]);

/** Keys under `photos` whose inline data URLs are persisted (passport-style photos). */
const PHOTO_KEYS = new Set(['child', 'father', 'mother']);

function isInlineDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:') && value.length > 256;
}

function sanitizeFormValue(value, path = '') {
  if (value == null) return value;
  if (typeof value === 'string') {
    return isInlineDataUrl(value) && !INLINE_ALLOWED_PATHS.has(path) ? null : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeFormValue(item, path));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => {
        const nestedPath = path ? `${path}.${key}` : key;
        return [key, sanitizeFormValue(nested, nestedPath)];
      }),
    );
  }
  return value;
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

function sanitizePhotosForPersist(photos) {
  if (!photos || typeof photos !== 'object') return photos;
  return Object.fromEntries(
    Object.entries(photos).map(([key, value]) => {
      if (isInlineDataUrl(value)) {
        return PHOTO_KEYS.has(key) ? [key, value] : [key, null];
      }
      if (value && typeof value === 'object') {
        return [key, sanitizeDocumentForPersist(value)];
      }
      return [key, value];
    }),
  );
}

function sanitizePrintableEnrollment(printable) {
  if (!printable || typeof printable !== 'object') return printable;
  const next = sanitizeFormValue(printable);
  if (next.photos) {
    next.photos = sanitizePhotosForPersist(next.photos);
  }
  return next;
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
  if (next.printableEnrollment && typeof next.printableEnrollment === 'object') {
    next.printableEnrollment = sanitizePrintableEnrollment(next.printableEnrollment);
  }
  if (next.formData && typeof next.formData === 'object') {
    next.formData = sanitizePrintableEnrollment(next.formData);
  }
  return next;
}
