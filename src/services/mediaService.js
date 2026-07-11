import { INITIAL_PHOTOS } from '../data/mockPhotos.js';
import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { resolveVideoStreamUrl } from '../utils/photoStudioProgressive.js';

const KEY = 'sb_photos';

function normalizePhoto(photo) {
  if (!photo || typeof photo !== 'object') return photo;
  const mediaType = photo.mediaType || (photo.fileType === 'mp4' ? 'VIDEO' : 'IMAGE');
  const isVideo = mediaType === 'VIDEO';
  const imageUrl = photo.imageUrl
    || (isVideo ? photo.thumbnailUrl : null)
    || photo.previewUrl
    || photo.thumbnailUrl
    || photo.downloadUrl
    || '';
  const streamUrl = resolveVideoStreamUrl(photo);
  return {
    ...photo,
    imageUrl,
    sentAt: photo.sentAt || photo.createdAt || photo.uploadTime,
    mediaType,
    type: photo.type || (isVideo ? 'video' : undefined),
    streamUrl: streamUrl || photo.streamUrl || photo.playbackUrl || undefined,
    videoStatusUrl: photo.videoStatusUrl || photo.statusPollUrl,
  };
}

function getAll() {
  return getStore(KEY, INITIAL_PHOTOS);
}

function photoVisibleToFilter(photo, filters) {
  const studentId = filters.studentId ? String(filters.studentId) : null;
  const classId = filters.classId ? String(filters.classId) : null;

  if (studentId) {
    const directMatch = photo.studentIds?.some((id) => String(id) === studentId);
    if (directMatch) return true;
  }

  if (classId && photo.classId && String(photo.classId) === classId) {
    if (photo.recipients === 'class' || photo.recipients === 'selected') return true;
  }

  if (studentId && photo.recipients === 'class' && !photo.classId) {
    return true;
  }

  return false;
}

export async function getPhotos(filters = {}) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      let photos = getAll();
      if (filters.studentId || filters.classId) {
        photos = photos.filter((photo) => photoVisibleToFilter(photo, filters));
      }
      if (filters.teacherId) {
        photos = photos.filter((p) => p.teacherId === filters.teacherId);
      }
      return photos.map(normalizePhoto);
    },
    apiFn: async () => {
      const data = await api.get('/media/photos', filters);
      return Array.isArray(data) ? data.map(normalizePhoto) : data;
    },
  });
}

export async function sendPhotos({ teacherId, teacherName, className, caption, recipients, studentIds, imageUrl }) {
  return routeRequest({
    mockFn: async () => {
      await delay(600);
      const photos = getAll();
      const entry = {
        id: `photo-${Date.now()}`,
        teacherId: teacherId || 'usr-teacher',
        teacherName: teacherName || 'Teacher',
        className,
        caption,
        sentAt: new Date().toISOString(),
        recipients,
        studentIds: studentIds || [],
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop',
      };
      photos.unshift(entry);
      setStore(KEY, photos);
      return entry;
    },
    apiFn: () => api.post('/media/photos', {
      className,
      caption,
      recipients,
      studentIds,
      imageFileKey: imageUrl,
    }),
  });
}

export async function deletePhoto(photoId) {
  return routeRequest({
    mockFn: async () => {
      const photos = getAll().filter((p) => p.id !== photoId);
      setStore(KEY, photos);
      return { success: true };
    },
    apiFn: () => api.delete(`/media/photos/${photoId}`),
  });
}
