import { api } from './api/client.js';
import { TENANT_HEADER } from './api/config.js';
import { routeRequest } from './api/routeRequest.js';
import { delay, getStore } from './mockApi.js';
import { MOCK_SCHOOLS } from '../data/mockSchools.js';

/** Master-context header so SUPER_ADMIN can see every workspace. */
const PLATFORM_ADMIN_OPTS = {
  skipTenantHeader: true,
  headers: { [TENANT_HEADER]: 'admin' },
};

function mockTenantsFromSchools() {
  return MOCK_SCHOOLS.map((school) => ({
    id: school.id,
    schoolId: school.id,
    slug: school.slug,
    name: school.name,
    status: school.status || 'ACTIVE',
    plan: school.plan || 'trial',
    ownerName: school.ownerName || null,
    ownerEmail: school.email || null,
    ownerPhone: school.phone || null,
    domain: null,
    customDomain: null,
    appUrl: `/${school.slug}`,
    loginUrl: `/${school.slug}/login`,
    fileVault: {
      username: `sb-${school.slug}`,
      connectionStatus: 'CONNECTED',
      statusMessage: 'OK',
      provisionedAt: null,
      connected: true,
      hasApiToken: true,
      studioBaseUrl: 'https://backendstudio.mytiny.us',
      studioConsoleUrl: 'https://photostudio.mytiny.us',
    },
  }));
}

/** List all tenants + FileVault/config for platform super admin. */
export async function listTenantsAdmin() {
  return routeRequest({
    mockFn: async () => {
      await delay(100);
      const stored = getStore('sb_schools', null);
      if (stored?.length) {
        return stored.map((school) => ({
          ...mockTenantsFromSchools().find((t) => t.slug === school.slug),
          ...school,
          fileVault: {
            username: `sb-${school.slug}`,
            connectionStatus: 'CONNECTED',
            connected: true,
            hasApiToken: true,
          },
        }));
      }
      return mockTenantsFromSchools();
    },
    apiFn: () => api.get('/admin/tenants', undefined, PLATFORM_ADMIN_OPTS),
  });
}

export async function getTenantAdmin(slug) {
  return routeRequest({
    mockFn: async () => {
      await delay(80);
      const tenant = mockTenantsFromSchools().find((t) => t.slug === slug);
      if (!tenant) throw new Error('Tenant not found');
      return tenant;
    },
    apiFn: () => api.get(`/admin/tenants/${slug}`, undefined, PLATFORM_ADMIN_OPTS),
  });
}

export async function retryTenantFileVault(slug) {
  return routeRequest({
    mockFn: async () => {
      await delay(200);
      const tenant = await getTenantAdmin(slug);
      return {
        ...tenant,
        fileVault: {
          ...tenant.fileVault,
          connectionStatus: 'CONNECTED',
          connected: true,
          statusMessage: 'OK',
        },
      };
    },
    apiFn: () => api.post(`/admin/tenants/${slug}/retry-filevault`, undefined, PLATFORM_ADMIN_OPTS),
  });
}
