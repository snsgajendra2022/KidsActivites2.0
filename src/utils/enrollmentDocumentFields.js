import { DEFAULT_ENROLLMENT_FORM } from '../data/defaultEnrollmentFormConfig.js';

export function getEnrollmentDocumentFields(enrollmentForm) {
  const steps = enrollmentForm?.steps || DEFAULT_ENROLLMENT_FORM.steps;
  const step = steps.find(
    (s) => s.stepType === 'documents' || s.sectionKey === 'documents' || s.id === 'step-documents',
  );
  const fields = step?.fields || [];
  return fields
    .filter((f) => f.type === 'file' && f.key)
    .map((f) => ({
      key: f.key,
      label: f.label || f.key,
      required: Boolean(f.required),
      fileCategory: f.fileCategory || 'document',
      maxSizeMB: f.validation?.maxSizeMB,
    }));
}

export function formatDocumentFieldLabel(key) {
  if (!key) return '';
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function getCorrectionRequestedDocuments(app) {
  const fromRequest = app?.correctionRequest?.requestedDocuments;
  if (Array.isArray(fromRequest) && fromRequest.length > 0) {
    return fromRequest.map(String);
  }
  // Fallback: any currently rejected docs
  const docs = app?.documents || {};
  const rejected = Object.entries(docs)
    .filter(([, doc]) => doc?.status === 'rejected')
    .map(([key]) => key);
  if (rejected.length > 0) return rejected;
  return [];
}

/**
 * Kidzee printable forms store passport photos under formData.photos while portal
 * document fields use keys like studentPhoto. Merge so correction upload UI can show
 * the image the parent already submitted.
 */
export function mergeFormPhotosIntoDocuments(documents = {}, formData = {}) {
  const next = { ...(documents || {}) };
  const photos = formData?.photos && typeof formData.photos === 'object' ? formData.photos : {};

  const applyPhoto = (fieldKey, photoValue, fallbackName) => {
    if (!photoValue || next[fieldKey]) return;
    if (typeof photoValue === 'string' && photoValue.startsWith('data:')) {
      const mime = photoValue.slice(5, photoValue.indexOf(';')) || 'image/png';
      next[fieldKey] = {
        name: fallbackName,
        type: mime,
        previewUrl: photoValue,
        dataUrl: photoValue,
        status: 'uploaded',
        source: 'formPhoto',
      };
      return;
    }
    if (typeof photoValue === 'object') {
      next[fieldKey] = {
        ...photoValue,
        name: photoValue.name || fallbackName,
        status: photoValue.status || 'uploaded',
        previewUrl: photoValue.previewUrl || photoValue.dataUrl || photoValue.downloadUrl,
        source: photoValue.source || 'formPhoto',
      };
    }
  };

  applyPhoto('studentPhoto', photos.child, 'Student photo');
  applyPhoto('fatherPhoto', photos.father, 'Father photo');
  applyPhoto('motherPhoto', photos.mother, 'Mother photo');
  return next;
}

export function getCorrectionRequestNote(app) {
  if (app?.correctionRequest?.note) {
    return String(app.correctionRequest.note).trim();
  }
  const history = Array.isArray(app?.statusHistory) ? app.statusHistory : [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.status === 'correction_required' && history[i]?.note) {
      return String(history[i].note).trim();
    }
  }
  return '';
}
