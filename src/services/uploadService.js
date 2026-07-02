import { delay } from './mockApi.js';
import { UPLOAD_STATUS } from '../utils/uploadValidation.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { buildDocumentPreviewFields, saveDocumentPreview } from '../utils/documentPreview.js';

async function mockUploadFile({ file, fieldKey, onProgress, isOnline, signal }) {
  if (!isOnline) {
    return { success: false, status: UPLOAD_STATUS.WAITING_FOR_INTERNET, error: 'Waiting for internet connection.' };
  }

  const totalSteps = 10;
  for (let i = 1; i <= totalSteps; i++) {
    if (signal?.aborted) {
      return { success: false, status: UPLOAD_STATUS.PAUSED, error: 'Upload cancelled.' };
    }
    if (!isOnline()) {
      return { success: false, status: UPLOAD_STATUS.PAUSED, error: 'Upload paused due to network issue.' };
    }
    await delay(150 + Math.random() * 100);
    onProgress?.(Math.round((i / totalSteps) * 100));
  }

  const previewFields = await buildDocumentPreviewFields(file);
  const fileKey = `mock/${fieldKey}/${Date.now()}-${file.name}`;

  if (previewFields.previewUrl) {
    saveDocumentPreview(fileKey, previewFields.previewUrl);
  }

  return {
    success: true,
    status: UPLOAD_STATUS.UPLOADED,
    data: {
      name: file.name,
      size: file.size,
      type: file.type,
      fieldKey,
      uploadedAt: new Date().toISOString(),
      fileKey,
      status: 'uploaded',
      ...previewFields,
    },
  };
}

async function apiUploadFile({ file, fieldKey, onProgress, applicationId, schoolId }) {
  onProgress?.(5);
  const signed = await api.post('/documents/upload', {
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    category: fieldKey.includes('photo') ? 'photo' : 'document',
    fieldKey,
    applicationId,
    schoolId,
  });

  onProgress?.(30);
  await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  onProgress?.(80);
  const confirmed = await api.post('/documents/confirm', {
    fileKey: signed.fileKey,
    fieldKey,
    applicationId,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });

  onProgress?.(100);
  return {
    success: true,
    status: UPLOAD_STATUS.UPLOADED,
    data: confirmed,
  };
}

export async function uploadFile(options) {
  return routeRequest({
    mockFn: () => mockUploadFile(options),
    apiFn: () => apiUploadFile(options),
  });
}
