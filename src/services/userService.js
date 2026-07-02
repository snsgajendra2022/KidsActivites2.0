import usersData from '../data/users.json';
import { delay } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { authenticateByEmail } from './authService.js';
import { getSchoolById } from './schoolService.js';
import { ROLE_LABELS } from '../constants/roles.js';

function sanitizeUser(user) {
  const { password, ...safe } = user;
  const school = user.schoolId ? getSchoolById(user.schoolId) : null;
  return {
    ...safe,
    schoolName: school?.name || (user.schoolId ? user.schoolId : 'Platform'),
    roleLabel: ROLE_LABELS[user.role] || user.role,
  };
}

async function mockListUsers({ schoolId, role, search } = {}) {
  await delay(200);
  let users = usersData.users.map(sanitizeUser);

  if (schoolId) {
    users = users.filter((u) => u.schoolId === schoolId);
  }
  if (role) {
    users = users.filter((u) => u.role === role);
  }
  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    users = users.filter(
      (u) => u.name.toLowerCase().includes(q)
        || u.email.toLowerCase().includes(q)
        || (u.mobile && u.mobile.includes(q)),
    );
  }

  return users;
}

async function mockUpdateProfile(user, updates) {
  await delay(300);
  return { ...user, ...updates };
}

async function mockChangePassword(user, { currentPassword, newPassword }) {
  await delay(400);
  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }
  try {
    authenticateByEmail(user.email, currentPassword);
  } catch {
    throw new Error('Current password is incorrect.');
  }
  return { success: true };
}

export async function listUsers(filters = {}, user) {
  return routeRequest({
    user,
    mockFn: () => mockListUsers(filters),
    apiFn: () => api.get('/admin/users', filters),
  });
}

export async function listTeachers(schoolId, user) {
  return listUsers({ schoolId, role: 'teacher' }, user);
}

export async function updateUserProfile(user, updates) {
  return routeRequest({
    user,
    mockFn: () => mockUpdateProfile(user, updates),
    apiFn: () => api.patch('/users/me', updates),
  });
}

export async function changeUserPassword(user, passwords) {
  return routeRequest({
    user,
    mockFn: () => mockChangePassword(user, passwords),
    apiFn: () => api.post('/users/me/change-password', passwords),
  });
}

export async function getCurrentUser(user) {
  return routeRequest({
    user,
    mockFn: async () => user,
    apiFn: () => api.get('/users/me'),
  });
}
