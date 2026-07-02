import { getPhotos } from './mediaService.js';
import { getConversationsForUser } from './chatService.js';
import usersData from '../data/users.json';
import { TEACHER_CLASSES, CLASS_STUDENTS } from '../data/mockPhotos.js';
import { delay } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { getSchoolById } from './schoolService.js';
import { ROLE_LABELS } from '../constants/roles.js';

function sanitizeTeacher(user) {
  const school = user.schoolId ? getSchoolById(user.schoolId) : null;
  return {
    ...user,
    schoolName: school?.name || (user.schoolId ? user.schoolId : 'Platform'),
    roleLabel: ROLE_LABELS[user.role] || user.role,
    status: user.status || (user.active === false ? 'inactive' : 'active'),
    subjects: user.subjects || [],
    classesAssigned: user.classesAssigned || [],
  };
}

async function mockListTeachers({ schoolId, search, status } = {}) {
  await delay(200);
  let teachers = usersData.users
    .filter((u) => u.role === 'teacher')
    .map(sanitizeTeacher);

  if (schoolId) {
    teachers = teachers.filter((t) => t.schoolId === schoolId);
  }
  if (status && status !== 'all') {
    teachers = teachers.filter((t) => t.status === status);
  }
  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    teachers = teachers.filter(
      (t) => t.name.toLowerCase().includes(q)
        || t.email.toLowerCase().includes(q)
        || (t.mobile && t.mobile.includes(q)),
    );
  }
  return teachers;
}

async function mockCreateTeacher(payload) {
  await delay(300);
  const teacher = sanitizeTeacher({
    id: `usr-teacher-${Date.now()}`,
    ...payload,
    role: 'teacher',
    active: true,
    status: 'active',
  });
  return { teacher, tempPassword: 'TempPass1' };
}

async function mockUpdateTeacher(id, updates) {
  await delay(250);
  const existing = usersData.users.find((u) => u.id === id) || {};
  return sanitizeTeacher({ ...existing, ...updates, id });
}

async function mockDeactivateTeacher(id) {
  await delay(200);
  const existing = usersData.users.find((u) => u.id === id) || {};
  return sanitizeTeacher({ ...existing, id, active: false, status: 'inactive' });
}

async function mockAssignClasses(id, classesAssigned) {
  await delay(200);
  const existing = usersData.users.find((u) => u.id === id) || {};
  return sanitizeTeacher({ ...existing, id, classesAssigned });
}

export async function listTeachers(filters = {}, user) {
  return routeRequest({
    mockFn: () => mockListTeachers(filters),
    apiFn: () => api.get('/admin/teachers', filters),
  });
}

export async function getTeacher(teacherId, user) {
  return routeRequest({
    mockFn: async () => {
      const found = usersData.users.find((u) => u.id === teacherId);
      return found ? sanitizeTeacher(found) : null;
    },
    apiFn: () => api.get(`/admin/teachers/${teacherId}`),
  });
}

export async function createTeacher(payload, user) {
  return routeRequest({
    mockFn: () => mockCreateTeacher(payload),
    apiFn: () => api.post('/admin/teachers', payload),
  });
}

export async function updateTeacher(teacherId, updates, user) {
  return routeRequest({
    mockFn: () => mockUpdateTeacher(teacherId, updates),
    apiFn: () => api.patch(`/admin/teachers/${teacherId}`, updates),
  });
}

export async function deactivateTeacher(teacherId, user) {
  return routeRequest({
    mockFn: () => mockDeactivateTeacher(teacherId),
    apiFn: () => api.patch(`/admin/teachers/${teacherId}/deactivate`),
  });
}

export async function assignTeacherClasses(teacherId, classesAssigned, user) {
  return routeRequest({
    mockFn: () => mockAssignClasses(teacherId, classesAssigned),
    apiFn: () => api.patch(`/admin/teachers/${teacherId}/classes`, { classesAssigned }),
  });
}

/** Available class options for assignment UI */
export function getAssignableClassOptions() {
  return TEACHER_CLASSES.map((c) => c.name);
}

// --- Teacher portal (self-service) ---

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
