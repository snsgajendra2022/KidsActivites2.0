import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { DEFAULT_PORTAL_CONFIG } from '../data/defaultPortalConfig.js';
import { cloneEnrollmentFormConfig, DEFAULT_ENROLLMENT_FORM } from '../data/defaultEnrollmentFormConfig.js';

const PLATFORM_KEY = 'sb_platform_config';

const DEFAULT_PLATFORM_CONFIG = {
  platformName: 'Kids Activities',
  tagline: 'Multi-school enrollment platform',
  footerText: DEFAULT_PORTAL_CONFIG.footerText,
  heroHeadline: 'Modern School Enrollment,\nBuilt for Premium Education',
  heroSubtext:
    "Complete your child's admission online. Submit documents, pay fees, and stay connected — all in one trusted platform.",
  school: { ...DEFAULT_PORTAL_CONFIG.school },
  branding: {
    heroImageUrl: DEFAULT_PORTAL_CONFIG.branding.heroImageUrl,
    logoIconUrl: null,
    faviconUrl: null,
  },
  theme: { ...DEFAULT_PORTAL_CONFIG.theme },
  enrollmentTheme: { ...DEFAULT_PORTAL_CONFIG.enrollmentTheme },
  enrollmentForm: cloneEnrollmentFormConfig(DEFAULT_ENROLLMENT_FORM),
};

export function getDefaultPlatformConfig() {
  return mergePlatformConfig(null);
}

function mergePlatformConfig(stored) {
  const base = { ...DEFAULT_PLATFORM_CONFIG, ...(stored || {}) };
  return {
    ...base,
    school: { ...DEFAULT_PLATFORM_CONFIG.school, ...(stored?.school || {}) },
    branding: {
      ...DEFAULT_PLATFORM_CONFIG.branding,
      ...(stored?.branding || {}),
    },
    theme: {
      ...DEFAULT_PLATFORM_CONFIG.theme,
      ...(stored?.theme || {}),
    },
    enrollmentTheme: {
      ...DEFAULT_PLATFORM_CONFIG.enrollmentTheme,
      ...(stored?.enrollmentTheme || {}),
    },
    enrollmentForm: stored?.enrollmentForm?.steps?.length
      ? cloneEnrollmentFormConfig(stored.enrollmentForm)
      : cloneEnrollmentFormConfig(DEFAULT_ENROLLMENT_FORM),
  };
}

export async function getPlatformConfig() {
  return routeRequest({
    mockFn: async () => {
      await delay(80);
      return mergePlatformConfig(getStore(PLATFORM_KEY, null));
    },
    apiFn: () => api.get('/platform/config', undefined, { auth: false, skipTenantHeader: true }),
  });
}

export async function savePlatformConfig(updates) {
  return routeRequest({
    mockFn: async () => {
      await delay(200);
      const current = mergePlatformConfig(getStore(PLATFORM_KEY, null));
      const next = mergePlatformConfig({
        ...current,
        ...updates,
        school: updates.school ? { ...current.school, ...updates.school } : current.school,
        branding: {
          ...current.branding,
          ...(updates.branding || {}),
        },
        theme: {
          ...current.theme,
          ...(updates.theme || {}),
        },
        enrollmentTheme: {
          ...current.enrollmentTheme,
          ...(updates.enrollmentTheme || {}),
        },
        enrollmentForm: updates.enrollmentForm
          ? cloneEnrollmentFormConfig(updates.enrollmentForm)
          : current.enrollmentForm,
      });
      setStore(PLATFORM_KEY, next);
      return next;
    },
    apiFn: () => api.put('/admin/platform-settings', updates),
  });
}
