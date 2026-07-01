import { INITIAL_PHOTOS } from '../data/mockPhotos.js';
import { delay, getStore, setStore } from './mockApi.js';

const KEY = 'sb_photos';

function getAll() {
  return getStore(KEY, INITIAL_PHOTOS);
}

export async function getPhotos(filters = {}) {
  await delay();
  let photos = getAll();
  if (filters.studentId) {
    photos = photos.filter(
      (p) => p.recipients === 'class' || p.studentIds?.includes(filters.studentId)
    );
  }
  return photos;
}

export async function sendPhotos({ className, caption, recipients, studentIds, imageUrl }) {
  await delay(600);
  const photos = getAll();
  const entry = {
    id: `photo-${Date.now()}`,
    teacherId: 'u-teacher',
    teacherName: 'Anita Verma',
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
}
