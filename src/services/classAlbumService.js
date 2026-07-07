import { api, ApiError } from './api/client.js';
import { extractPhotoStudioImageId, uploadPhotoStudioImage } from './photoStudioService.js';

function isUploadEndpointUnavailable(err) {
  if (!err) return false;
  if (err instanceof TypeError) return true;
  if (err instanceof ApiError) {
    if (err.status === 0 || err.code === 'NETWORK_ERROR') return true;
    if ([404, 405, 413, 501, 502, 503].includes(err.status)) return true;
  }
  return err?.message === 'Failed to fetch';
}

async function uploadViaPhotoStudioAndLink({ albumId, caption, files }) {
  const externalAssetIds = [];
  for (const file of files) {
    const result = await uploadPhotoStudioImage(file);
    const id = extractPhotoStudioImageId(result);
    if (!id) {
      throw new ApiError(`Uploaded "${file.name}" but the server did not return an image id.`, 500);
    }
    externalAssetIds.push(String(id));
  }
  return linkExistingToAlbum({ albumId, externalAssetIds, caption });
}

export const UPLOAD_TARGETS = {
  CLASS_ALBUM: 'CLASS_ALBUM',
  PARENT_DIRECT: 'PARENT_DIRECT',
  CLASS_ALBUM_AND_PARENT: 'CLASS_ALBUM_AND_PARENT',
};

export async function getTeacherAlbumClasses() {
  return api.get('/teacher/albums/my-classes');
}

export async function getTeacherAlbumByClass(classId) {
  return api.get(`/teacher/albums/${classId}`);
}

export async function uploadTeacherAlbumMedia({
  uploadTarget,
  classId,
  studentId,
  caption,
  files,
}) {
  const formData = new FormData();
  formData.append('uploadTarget', uploadTarget);
  if (classId) formData.append('classId', classId);
  if (studentId) formData.append('studentId', studentId);
  if (caption) formData.append('caption', caption);
  files.forEach((file) => formData.append('files', file));
  return api.post('/teacher/albums/upload', formData);
}

export async function updateTeacherAlbumMedia(classId, mediaLinkId, body) {
  return api.patch(`/teacher/albums/${classId}/media/${mediaLinkId}`, body);
}

export async function deleteTeacherAlbumMedia(classId, mediaLinkId) {
  return api.delete(`/teacher/albums/${classId}/media/${mediaLinkId}`);
}

export async function listAdminAlbums() {
  return api.get('/admin/albums');
}

export async function getAdminAlbum(albumId) {
  return api.get(`/admin/albums/${albumId}`);
}

export async function updateAdminAlbum(albumId, body) {
  return api.patch(`/admin/albums/${albumId}`, body);
}

export async function regenerateAlbumCode(albumId) {
  return api.post(`/admin/albums/${albumId}/regenerate-code`);
}

export async function backfillAlbums() {
  return api.post('/admin/albums/backfill');
}

export async function linkExistingToAlbum({ albumId, externalAssetIds, caption }) {
  return api.post(`/admin/albums/${albumId}/link-existing`, {
    externalAssetIds,
    caption: caption || undefined,
  });
}

export async function uploadAdminAlbumMedia({ albumId, caption, files }) {
  const formData = new FormData();
  formData.append('albumId', albumId);
  if (caption) formData.append('caption', caption);
  files.forEach((file) => formData.append('files', file));

  try {
    return await api.post('/admin/albums/upload', formData);
  } catch (primaryErr) {
    if (!isUploadEndpointUnavailable(primaryErr)) throw primaryErr;
    console.warn(
      '[KidsActivites] Album upload endpoint unavailable; using photo-studio upload + album link.',
      primaryErr?.message,
    );
    return uploadViaPhotoStudioAndLink({ albumId, caption, files });
  }
}

export async function updateAlbumMedia(albumId, mediaLinkId, body) {
  return api.patch(`/admin/albums/${albumId}/media/${mediaLinkId}`, body);
}

export async function verifyTvAlbumCode(albumCode) {
  return api.post('/tv/albums/verify', { albumCode }, { auth: false });
}

export async function getTvAlbumPlayback(albumCode) {
  return api.get(`/tv/albums/${encodeURIComponent(albumCode)}/playback`, null, { auth: false });
}
