import { delay } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { authenticateByEmail } from './authService.js';

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
