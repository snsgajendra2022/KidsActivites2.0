import { delay } from './mockApi.js';
import { UPLOAD_STATUS } from '../utils/uploadValidation.js';

/**
 * Simulates file upload with progress. Pauses when isOnline is false.
 * Replace with real signed-URL upload when backend is ready.
 */
export async function uploadFile({ file, fieldKey, onProgress, isOnline, signal }) {
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

  return {
    success: true,
    status: UPLOAD_STATUS.UPLOADED,
    data: {
      name: file.name,
      size: file.size,
      type: file.type,
      fieldKey,
      uploadedAt: new Date().toISOString(),
      // In production: fileKey from S3
      fileKey: `mock/${fieldKey}/${Date.now()}-${file.name}`,
    },
  };
}
