const PREVIEW_STORE_KEY = 'sb_document_previews';

/** @param {string} fileKey */
export function getStoredDocumentPreview(fileKey) {
  if (!fileKey) return null;
  try {
    const store = JSON.parse(localStorage.getItem(PREVIEW_STORE_KEY) || '{}');
    return store[fileKey] || null;
  } catch {
    return null;
  }
}

/** @param {string} fileKey @param {string} previewUrl */
export function saveDocumentPreview(fileKey, previewUrl) {
  if (!fileKey || !previewUrl) return;
  try {
    const store = JSON.parse(localStorage.getItem(PREVIEW_STORE_KEY) || '{}');
    store[fileKey] = previewUrl;
    localStorage.setItem(PREVIEW_STORE_KEY, JSON.stringify(store));
  } catch {
    /* quota or private mode */
  }
}

/** @param {Record<string, unknown> | null | undefined} doc */
export function getDocumentPreviewUrl(doc) {
  if (!doc) return null;
  const inline = doc.previewUrl || doc.dataUrl || doc.downloadUrl;
  if (inline) return inline;
  if (doc.fileKey) return getStoredDocumentPreview(String(doc.fileKey));
  return null;
}

/** @param {Record<string, unknown> | null | undefined} doc */
export function canPreviewDocument(doc) {
  if (!doc?.name && !getDocumentPreviewUrl(doc)) return false;
  if (getDocumentPreviewUrl(doc)) return true;
  return Boolean(doc?.name && doc?.status && doc.status !== 'pending');
}

/** @param {Record<string, unknown> | null | undefined} doc */
export function isImageDocument(doc) {
  const type = String(doc?.type || '');
  const name = String(doc?.name || '');
  return type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name);
}

/** @param {Record<string, unknown> | null | undefined} doc */
export function isPdfDocument(doc) {
  const type = String(doc?.type || '');
  const name = String(doc?.name || '');
  return type === 'application/pdf' || /\.pdf$/i.test(name);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Persist preview for mock uploads (images + PDFs under 5 MB). */
export async function buildDocumentPreviewFields(file) {
  const maxBytes = 5 * 1024 * 1024;
  if (!file || file.size > maxBytes) {
    return { previewUrl: null };
  }
  try {
    const dataUrl = await readFileAsDataUrl(file);
    return { previewUrl: dataUrl, dataUrl };
  } catch {
    return { previewUrl: null };
  }
}
