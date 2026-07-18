import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { isApiEnabled } from './api/config.js';
import { fetchPortalConfigRaw } from './portalConfigApi.js';
import { MOCK_SCHOOLS } from '../data/mockSchools.js';

const SCHOOLS_KEY = 'sb_schools';

function readSchoolsStore() {
  if (isApiEnabled()) return [];
  const stored = getStore(SCHOOLS_KEY, null);
  if (stored?.length) return stored;
  const seeded = [...MOCK_SCHOOLS];
  setStore(SCHOOLS_KEY, seeded);
  return seeded;
}

function writeSchoolsStore(schools) {
  setStore(SCHOOLS_KEY, schools);
  return schools;
}

export function getSchoolBySlug(slug) {
  if (!slug) return null;
  const normalized = slug.toLowerCase();
  return readSchoolsStore().find((s) => s.slug.toLowerCase() === normalized) || null;
}

export function getSchoolById(schoolId) {
  return readSchoolsStore().find((s) => s.id === schoolId) || null;
}

export async function resolveSchoolBySlug(slug) {
  if (!slug) return null;
  return getSchoolBySlugApi(slug);
}

export async function listSchools() {
  return routeRequest({
    mockFn: async () => {
      await delay(100);
      return [...readSchoolsStore()];
    },
    apiFn: () => api.get('/schools', undefined, { auth: false }),
  });
}

export async function listSchoolsAdmin() {
  return routeRequest({
    mockFn: async () => {
      await delay(100);
      return [...readSchoolsStore()];
    },
    // Master context so SUPER_ADMIN sees every workspace, not only the login tenant.
    apiFn: () => api.get('/admin/schools', undefined, {
      skipTenantHeader: true,
      headers: { 'X-Tenant-Slug': 'admin' },
    }),
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

export async function getSchoolBySlugApi(slug) {
  return routeRequest({
    mockFn: async () => {
      await delay(80);
      const school = getSchoolBySlug(slug);
      if (!school) throw new Error('School not found');
      return school;
    },
    apiFn: async () => {
      const normalized = slug?.toLowerCase();
      if (!normalized) throw new Error('School not found');

      // Platform operator workspace — master DB, not a school tenant portal.
      if (normalized === 'admin') {
        return {
          id: 'platform',
          slug: 'admin',
          name: 'Kids Activities Platform',
          status: 'active',
          academicYear: '',
        };
      }

      // Always resolve against the requested slug (not whatever the current URL is).
      const config = await fetchPortalConfigRaw(normalized);
      const school = config?.school;
      if (!school?.id) throw new Error('School not found');
      return {
        ...school,
        slug: normalized,
        status: school.status || 'active',
      };
    },
  });
}

export async function saveSchool(school) {
  return routeRequest({
    mockFn: async () => {
      await delay(200);
      const schools = readSchoolsStore();
      const index = schools.findIndex((s) => s.id === school.id);
      const next = index >= 0
        ? schools.map((s, i) => (i === index ? { ...s, ...school } : s))
        : [...schools, school];
      writeSchoolsStore(next);
      return school;
    },
    apiFn: () => api.put(`/admin/schools/${school.id}`, school),
  });
}
