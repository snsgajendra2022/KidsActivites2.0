import { TEACHER_CLASSES, CLASS_STUDENTS } from '../data/mockPhotos.js';
import { delay } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { getPhotos } from './mediaService.js';
import { getConversationsForUser } from './chatService.js';

async function mockGetTeacherClasses(teacherId) {
  await delay(150);
  void teacherId;
  return TEACHER_CLASSES;
}

async function mockGetTeacherStudents(teacherId) {
  await delay(150);
  void teacherId;
  return CLASS_STUDENTS;
}

async function mockGetTeacherStats(teacherId) {
  await delay(150);
  const [photos, conversations] = await Promise.all([
    getPhotos({ teacherId }),
    getConversationsForUser(teacherId),
  ]);
  const unread = conversations.reduce((sum, c) => sum + (c.unread?.[teacherId] || 0), 0);
  const totalStudents = TEACHER_CLASSES.reduce((sum, c) => sum + c.studentCount, 0);

  return {
    classCount: TEACHER_CLASSES.length,
    totalStudents,
    photosShared: photos.length,
    unreadMessages: unread,
  };
}

export async function getTeacherClasses(teacherId) {
  return routeRequest({
    mockFn: () => mockGetTeacherClasses(teacherId),
    apiFn: () => api.get('/teacher/classes'),
  });
}

export async function getTeacherStudents(teacherId) {
  return routeRequest({
    mockFn: () => mockGetTeacherStudents(teacherId),
    apiFn: () => api.get('/teacher/students'),
  });
}

export async function getTeacherStats(teacherId) {
  return routeRequest({
    mockFn: () => mockGetTeacherStats(teacherId),
    apiFn: () => api.get('/teacher/dashboard/stats'),
  });
}
