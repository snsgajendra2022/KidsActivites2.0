import { DEFAULT_PORTAL_CONFIG } from '../data/defaultPortalConfig.js';
import { DEFAULT_ENROLLMENT_FORM, cloneEnrollmentFormConfig } from '../data/defaultEnrollmentFormConfig.js';
import { NAV_BY_ROLE } from '../constants/navigation.js';
import { buildDefaultMenuVisibility } from '../data/defaultPortalConfig.js';
import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';

const KEY = 'sb_portal_config';

function mergeConfig(stored) {
  const defaults = {
    ...DEFAULT_PORTAL_CONFIG,
    school: { ...DEFAULT_PORTAL_CONFIG.school },
    branding: { ...DEFAULT_PORTAL_CONFIG.branding },
    theme: { ...DEFAULT_PORTAL_CONFIG.theme },
    enrollmentTheme: { ...DEFAULT_PORTAL_CONFIG.enrollmentTheme },
    loginMethods: { ...DEFAULT_PORTAL_CONFIG.loginMethods },
    loginScrollLines: [...DEFAULT_PORTAL_CONFIG.loginScrollLines],
    enrollmentForm: cloneEnrollmentFormConfig(DEFAULT_ENROLLMENT_FORM),
    menuVisibility: buildDefaultMenuVisibility(NAV_BY_ROLE),
  };

  if (!stored) return defaults;

  const merged = {
    ...defaults,
    ...stored,
    school: { ...defaults.school, ...stored.school },
    branding: { ...defaults.branding, ...stored.branding },
    theme: { ...defaults.theme, ...(stored.theme || {}) },
    enrollmentTheme: { ...defaults.enrollmentTheme, ...(stored.enrollmentTheme || {}) },
    loginMethods: { ...defaults.loginMethods, ...(stored.loginMethods || {}) },
    loginScrollLines: stored.loginScrollLines?.length
      ? [...stored.loginScrollLines]
      : [...defaults.loginScrollLines],
    enrollmentForm: stored.enrollmentForm?.steps?.length
      ? cloneEnrollmentFormConfig(stored.enrollmentForm)
      : cloneEnrollmentFormConfig(defaults.enrollmentForm),
    menuVisibility: {
      ...defaults.menuVisibility,
      ...(stored.menuVisibility || {}),
    },
  };

  Object.keys(NAV_BY_ROLE).forEach((role) => {
    merged.menuVisibility[role] = {
      ...defaults.menuVisibility[role],
      ...(stored.menuVisibility?.[role] || {}),
    };
    NAV_BY_ROLE[role].forEach((item) => {
      if (merged.menuVisibility[role][item.id] === undefined) {
        merged.menuVisibility[role][item.id] = true;
      }
    });
  });

  return merged;
}

function mockGetPortalConfig() {
  return mergeConfig(getStore(KEY, null));
}

function mockSavePortalConfig(updates) {
  const current = mergeConfig(getStore(KEY, null));
  const theme = updates.theme ? { ...current.theme, ...updates.theme } : current.theme;
  const enrollmentTheme = updates.enrollmentTheme
    ? { ...current.enrollmentTheme, ...updates.enrollmentTheme }
    : current.enrollmentTheme;
  const next = {
    ...current,
    ...updates,
    school: { ...current.school, ...(updates.school || {}) },
    branding: { ...current.branding, ...(updates.branding || {}) },
    theme,
    enrollmentTheme,
    loginMethods: updates.loginMethods
      ? { ...current.loginMethods, ...updates.loginMethods }
      : current.loginMethods,
    enrollmentForm: updates.enrollmentForm
      ? cloneEnrollmentFormConfig({ ...current.enrollmentForm, ...updates.enrollmentForm })
      : current.enrollmentForm,
    menuVisibility: updates.menuVisibility
      ? { ...current.menuVisibility, ...updates.menuVisibility }
      : current.menuVisibility,
  };
  setStore(KEY, next);
  return next;
}

export async function getPortalConfig() {
  return routeRequest({
    mockFn: async () => {
      await delay(120);
      return mockGetPortalConfig();
    },
    apiFn: () => api.get('/portal/config', undefined, { auth: false }),
  });
}

export async function savePortalConfig(updates) {
  return routeRequest({
    mockFn: async () => {
      await delay(300);
      return mockSavePortalConfig(updates);
    },
    apiFn: () => api.put('/admin/portal-settings', updates),
  });
}

export async function setMenuVisibility(role, menuId, visible) {
  return routeRequest({
    mockFn: async () => {
      const current = mockGetPortalConfig();
      const menuVisibility = {
        ...current.menuVisibility,
        [role]: { ...current.menuVisibility[role], [menuId]: visible },
      };
      return mockSavePortalConfig({ menuVisibility });
    },
    apiFn: () => api.patch('/admin/portal-settings/menus', {
      updates: [{ role, menuId, visible }],
    }),
  });
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function getSystemStatus() {
  return routeRequest({
    mockFn: async () => ({
      overall: 'operational',
      lastChecked: new Date().toISOString(),
      services: [
        { name: 'Enrollment Portal', status: 'operational' },
        { name: 'Parent Login', status: 'operational' },
        { name: 'Fee Payments', status: 'operational' },
        { name: 'Teacher Photos', status: 'operational' },
      ],
    }),
    apiFn: () => api.get('/support/status', undefined, { auth: false }),
  });
}
