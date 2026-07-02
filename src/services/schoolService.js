import { delay } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { MOCK_SCHOOLS, getSchoolById } from '../data/mockSchools.js';

export async function listSchools() {
  return routeRequest({
    mockFn: async () => {
      await delay(100);
      return [...MOCK_SCHOOLS];
    },
    apiFn: () => api.get('/admin/schools'),
  });
}

export async function getSchool(schoolId) {
  return routeRequest({
    mockFn: async () => {
      await delay(80);
      const school = getSchoolById(schoolId);
      if (!school) throw new Error('School not found');
      return school;
    },
    apiFn: () => api.get(`/admin/schools/${schoolId}`),
  });
}
