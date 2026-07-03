import { api } from './api/client.js';

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

/** Extract image id from Photo Studio upload response. */
export function extractPhotoStudioImageId(response) {
  if (!response) return null;
  return response.id ?? response.image?.id ?? response.imageId ?? null;
}
