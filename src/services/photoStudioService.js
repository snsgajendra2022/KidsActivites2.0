import { api, ApiError } from './api/client.js';

export async function getPhotoStudioConfig() {
  return api.get('/photo-studio/config');
}

export async function listPhotoStudioImages({ page = 0, size = 20 } = {}) {
  return api.get('/photo-studio/images', { page, size });
}

export async function uploadPhotoStudioImage(file, { onProgress } = {}) {
  const formData = new FormData();
  formData.append('file', file);

  onProgress?.(10);

  const result = await api.post('/photo-studio/images/upload', formData);

  onProgress?.(100);
  return result;
}

export async function deletePhotoStudioImage(imageId) {
  return api.delete(`/photo-studio/images/${imageId}`);
}

/** Replace image bytes in place (same id). Falls back to upload + delete if replace route is unavailable. */
export async function replacePhotoStudioImage(imageId, file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    return await api.post(`/photo-studio/images/${encodeURIComponent(imageId)}/replace`, formData);
  } catch (primaryErr) {
    if (!(primaryErr instanceof ApiError) || ![404, 405, 501].includes(primaryErr.status)) {
      throw primaryErr;
    }
  }

  try {
    return await api.put(`/photo-studio/images/${encodeURIComponent(imageId)}`, formData);
  } catch (secondaryErr) {
    if (!(secondaryErr instanceof ApiError) || ![404, 405, 501].includes(secondaryErr.status)) {
      throw secondaryErr;
    }
  }

  const uploaded = await uploadPhotoStudioImage(file);
  const newId = extractPhotoStudioImageId(uploaded);
  await deletePhotoStudioImage(imageId);
  return { ...uploaded, id: newId, replacedFrom: imageId };
}

/** Extract image id from Photo Studio upload response. */
export function extractPhotoStudioImageId(response) {
  if (!response) return null;
  return response.id ?? response.image?.id ?? response.imageId ?? null;
}
