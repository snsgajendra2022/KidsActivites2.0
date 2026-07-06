import { INITIAL_PHOTOS } from '../data/mockPhotos.js';
import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';

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
  return {
    ...photo,
    imageUrl,
    sentAt: photo.sentAt || photo.createdAt || photo.uploadTime,
    mediaType,
    type: photo.type || (isVideo ? 'video' : undefined),
    streamUrl: photo.streamUrl || (isVideo ? photo.previewUrl : undefined),
    videoStatusUrl: photo.videoStatusUrl || photo.statusPollUrl,
  };
}

function getAll() {
  return getStore(KEY, INITIAL_PHOTOS);
}

export async function getPhotos(filters = {}) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      let photos = getAll();
      if (filters.studentId) {
        photos = photos.filter(
          (p) => p.recipients === 'class' || p.studentIds?.includes(filters.studentId),
        );
      }
      if (filters.teacherId) {
        photos = photos.filter((p) => p.teacherId === filters.teacherId);
      }
      return photos;
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
