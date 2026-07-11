import { DEFAULT_PORTAL_CONFIG } from '../data/defaultPortalConfig.js';
import { mergeLandingPage } from '../data/defaultLandingPage.js';
import { DEFAULT_ENROLLMENT_FORM, cloneEnrollmentFormConfig } from '../data/defaultEnrollmentFormConfig.js';
import { NAV_BY_ROLE } from '../constants/navigation.js';
import { buildDefaultMenuVisibility } from '../data/defaultPortalConfig.js';
import { delay, getStore, setStore, removeStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { isApiEnabled } from './api/config.js';
import { DEFAULT_SCHOOL_ID, schoolToPortalSchool } from '../data/mockSchools.js';
import { getSchoolById } from './schoolService.js';
import { resolveTenantSlug } from './api/config.js';
import {
  resolveConfigBranding,
  sanitizeBranding,
} from '../utils/brandingUrlUtils.js';
import {
  cachePortalConfig,
  fetchPortalConfigRaw,
  getCachedPortalConfig,
} from './portalConfigApi.js';

const LEGACY_SINGLE_KEY = 'sb_portal_config';
const LEGACY_BULK_KEY = 'sb_portal_configs';
export const PUBLIC_SCHOOL_KEY = 'sb_public_school_id';
export const ADMIN_SCHOOL_KEY = 'sb_admin_selected_school';

const BRANDING_KEYS = ['logoUrl', 'logoIconUrl', 'faviconUrl', 'heroImageUrl', 'loginHeroUrl'];

const BRANDING_FIELD_TO_ASSET_TYPE = {
  logoUrl: 'logo',
  logoIconUrl: 'logo_icon',
  faviconUrl: 'favicon',
  heroImageUrl: 'hero',
  loginHeroUrl: 'login_hero',
};

const ASSET_TYPE_TO_BRANDING_KEY = {
  logo: 'logoUrl',
  logo_icon: 'logoIconUrl',
  favicon: 'faviconUrl',
  hero: 'heroImageUrl',
  login_hero: 'loginHeroUrl',
};

function configKey(schoolId) {
  return `sb_portal_config_${schoolId}`;
}

function brandingKey(schoolId) {
  return `sb_portal_branding_${schoolId}`;
}

let migrationDone = false;

function migrateLegacyStorage() {
  if (migrationDone) return;
  migrationDone = true;

  const bulk = getStore(LEGACY_BULK_KEY, null);
  if (bulk && typeof bulk === 'object') {
    Object.entries(bulk).forEach(([schoolId, config]) => {
      if (config && !getStore(configKey(schoolId), null)) {
        persistSchoolConfig(schoolId, config);
      }
    });
    removeStore(LEGACY_BULK_KEY);
  }

  const legacy = getStore(LEGACY_SINGLE_KEY, null);
  if (legacy && !getStore(configKey(DEFAULT_SCHOOL_ID), null)) {
    persistSchoolConfig(DEFAULT_SCHOOL_ID, legacy);
  }
  removeStore(LEGACY_SINGLE_KEY);
}

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

function splitBranding(branding = {}) {
  const lean = { ...branding };
  const assets = {};
  BRANDING_KEYS.forEach((key) => {
    if (isDataUrl(lean[key])) {
      assets[key] = lean[key];
      lean[key] = `__asset__:${key}`;
    }
  });
  return { lean, assets };
}

function hydrateBranding(lean = {}, schoolId) {
  const assets = getStore(brandingKey(schoolId), {});
  const branding = sanitizeBranding({ ...lean });
  BRANDING_KEYS.forEach((key) => {
    if (lean[key] === `__asset__:${key}` && assets[key]) {
      branding[key] = assets[key];
    }
  });
  return branding;
}

function persistSchoolConfig(schoolId, config) {
  const { lean, assets } = splitBranding(config.branding || {});
  const toSave = { ...config, branding: lean };

  if (Object.keys(assets).length > 0) {
    if (!setStore(brandingKey(schoolId), assets)) {
      BRANDING_KEYS.forEach((key) => {
        if (assets[key]) lean[key] = null;
      });
      toSave.branding = lean;
    }
  }

  if (!setStore(configKey(schoolId), toSave)) {
    const minimal = {
      portalName: toSave.portalName,
      tagline: toSave.tagline,
      footerText: toSave.footerText,
      school: toSave.school,
      theme: toSave.theme,
      enrollmentTheme: toSave.enrollmentTheme,
      loginMethods: toSave.loginMethods,
      loginScrollLines: toSave.loginScrollLines,
      menuVisibility: toSave.menuVisibility,
      menuCustomization: toSave.menuCustomization,
      customMenuItems: toSave.customMenuItems,
      menuOrder: toSave.menuOrder,
      branding: lean,
    };
    setStore(configKey(schoolId), minimal);
    console.warn(`[portalConfig] Saved lean config for ${schoolId} (storage quota). Re-upload images if needed.`);
  }
}

export function getPublicSchoolId() {
  try {
    return localStorage.getItem(PUBLIC_SCHOOL_KEY) || DEFAULT_SCHOOL_ID;
  } catch {
    return DEFAULT_SCHOOL_ID;
  }
}

export function setPublicSchoolId(schoolId) {
  localStorage.setItem(PUBLIC_SCHOOL_KEY, schoolId);
}

export function getAdminSelectedSchoolId() {
  try {
    return localStorage.getItem(ADMIN_SCHOOL_KEY) || DEFAULT_SCHOOL_ID;
  } catch {
    return DEFAULT_SCHOOL_ID;
  }
}

export function setAdminSelectedSchoolId(schoolId) {
  localStorage.setItem(ADMIN_SCHOOL_KEY, schoolId);
}

function buildDefaultsForSchool(schoolId, schoolFromApi = null) {
  const school = schoolFromApi || getSchoolById(schoolId);
  const baseSchool = school
    ? schoolToPortalSchool(school)
    : {
      ...DEFAULT_PORTAL_CONFIG.school,
      id: schoolId,
      name: schoolFromApi?.name || DEFAULT_PORTAL_CONFIG.school.name,
      slug: schoolFromApi?.slug,
    };
  return {
    ...DEFAULT_PORTAL_CONFIG,
    portalName: baseSchool.name || DEFAULT_PORTAL_CONFIG.portalName,
    school: baseSchool,
    branding: { ...DEFAULT_PORTAL_CONFIG.branding },
    theme: school?.id === 'school-2'
      ? { brandColor: '#0F4C5C', accentColor: '#E36414' }
      : { ...DEFAULT_PORTAL_CONFIG.theme },
    enrollmentTheme: school?.id === 'school-2'
      ? { brandNavy: '#0F4C5C', brandRed: '#E36414', brandGrayLight: '#E5E7EB', formBg: '#F3F4F6' }
      : { ...DEFAULT_PORTAL_CONFIG.enrollmentTheme },
    loginMethods: { ...DEFAULT_PORTAL_CONFIG.loginMethods },
    loginScrollLines: school?.id === 'school-2'
      ? [
        'Sunrise Academy admissions 2026–2027 are open',
        'Visit our campus on Saturdays 10 AM – 1 PM',
        'Email admissions@sunrise.edu.in for assistance',
      ]
      : [...DEFAULT_PORTAL_CONFIG.loginScrollLines],
    enrollmentForm: cloneEnrollmentFormConfig(DEFAULT_ENROLLMENT_FORM),
    menuVisibility: buildDefaultMenuVisibility(NAV_BY_ROLE),
    menuCustomization: {},
    customMenuItems: [],
    menuOrder: {},
    landingPage: mergeLandingPage(null, baseSchool.name || DEFAULT_PORTAL_CONFIG.portalName, baseSchool.name || 'our school'),
  };
}

/** Normalize live API portal config to the shape the UI expects. */
export async function normalizeApiPortalConfig(stored) {
  if (!stored) return null;
  const schoolId = stored.school?.id || stored.schoolId;
  const merged = mergeConfig(stored, schoolId, stored.school);
  return resolveConfigBranding(merged);
}

function mergeConfig(stored, schoolId = DEFAULT_SCHOOL_ID, schoolFromApi = null) {
  const defaults = buildDefaultsForSchool(schoolId, schoolFromApi);

  if (!stored) return defaults;

  const merged = {
    ...defaults,
    ...stored,
    school: { ...defaults.school, ...stored.school },
    branding: hydrateBranding(
      { ...defaults.branding, ...stored.branding },
      schoolId,
    ),
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
    menuCustomization: {
      ...defaults.menuCustomization,
      ...(stored.menuCustomization || {}),
    },
    customMenuItems: stored.customMenuItems?.length
      ? [...stored.customMenuItems]
      : [...defaults.customMenuItems],
    menuOrder: {
      ...defaults.menuOrder,
      ...(stored.menuOrder || {}),
    },
    emailSettings: {
      ...defaults.emailSettings,
      ...(stored.emailSettings || {}),
    },
    landingPage: mergeLandingPage(
      stored.landingPage,
      stored.portalName || defaults.portalName,
      stored.school?.name || defaults.school?.name || 'our school',
    ),
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

async function dataUrlToFile(dataUrl, fileName = 'upload.png') {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || 'image/png' });
}

/** Upload a branding image via S3 and register it on portal config. */
export async function uploadBrandingAsset(file, assetType) {
  const signed = await api.post('/documents/upload', {
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    category: 'branding',
    fieldKey: assetType,
  });

  await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  await api.post('/documents/confirm', {
    fileKey: signed.fileKey,
    fieldKey: assetType,
  });

  const registered = await api.post('/admin/portal-settings/assets', {
    type: assetType,
    fileKey: signed.fileKey,
  });

  const brandingKey = ASSET_TYPE_TO_BRANDING_KEY[assetType];
  const fromBranding = brandingKey ? registered?.branding?.[brandingKey] : null;
  let url = registered?.url || fromBranding || null;

  if (!url && (registered?.fileKey || signed.fileKey)) {
    const { getDocumentDownloadUrl } = await import('./documentService.js');
    url = await getDocumentDownloadUrl(registered?.fileKey || signed.fileKey);
  }

  return url;
}

async function uploadLandingImage(file, fieldKey) {
  const signed = await api.post('/documents/upload', {
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    category: 'branding',
    fieldKey,
  });

  await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  const confirmed = await api.post('/documents/confirm', {
    fileKey: signed.fileKey,
    fieldKey,
  });

  return confirmed?.downloadUrl || confirmed?.url || signed.fileKey;
}

async function prepareLandingPageForSave(landingPage = {}) {
  if (!isApiEnabled() || !landingPage) return landingPage;

  const next = JSON.parse(JSON.stringify(landingPage));

  const uploadIfDataUrl = async (value, fieldKey) => {
    if (!isDataUrl(value)) return value;
    const file = await dataUrlToFile(value, `${fieldKey}.png`);
    return uploadLandingImage(file, fieldKey);
  };

  if (next.campusBanner?.imageUrl) {
    next.campusBanner.imageUrl = await uploadIfDataUrl(next.campusBanner.imageUrl, 'landing_campus');
  }
  if (next.finalCta?.imageUrl) {
    next.finalCta.imageUrl = await uploadIfDataUrl(next.finalCta.imageUrl, 'landing_cta');
  }
  if (Array.isArray(next.timeline?.steps)) {
    next.timeline.steps = await Promise.all(
      next.timeline.steps.map(async (step, index) => {
        if (!step?.imageUrl) return step;
        return {
          ...step,
          imageUrl: await uploadIfDataUrl(step.imageUrl, `landing_timeline_${index}`),
        };
      }),
    );
  }

  return next;
}

async function prepareBrandingForSave(branding = {}) {
  const next = sanitizeBranding({ ...branding });
  if (!isApiEnabled()) return next;
  await Promise.all(BRANDING_KEYS.map(async (key) => {
    const value = next[key];
    if (!isDataUrl(value)) return;
    const assetType = BRANDING_FIELD_TO_ASSET_TYPE[key];
    const file = await dataUrlToFile(value, `${assetType}.png`);
    const url = await uploadBrandingAsset(file, assetType);
    next[key] = url;
    if (key === 'logoIconUrl') next.logoUrl = url;
    if (key === 'logoUrl' && !next.logoIconUrl) next.logoIconUrl = url;
  }));
  return next;
}

function loadSchoolConfigRaw(schoolId) {
  migrateLegacyStorage();
  return getStore(configKey(schoolId), null);
}

function mockGetPortalConfig(schoolId) {
  const id = schoolId || getPublicSchoolId();
  const stored = loadSchoolConfigRaw(id);
  return mergeConfig(stored, id);
}

function mockSavePortalConfig(updates, schoolId) {
  const id = schoolId || getPublicSchoolId();
  const current = mockGetPortalConfig(id);
  const theme = updates.theme ? { ...current.theme, ...updates.theme } : current.theme;
  const enrollmentTheme = updates.enrollmentTheme
    ? { ...current.enrollmentTheme, ...updates.enrollmentTheme }
    : current.enrollmentTheme;
  const next = {
    ...current,
    ...updates,
    school: { ...current.school, ...(updates.school || {}), id },
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
    menuCustomization: updates.menuCustomization
      ? { ...current.menuCustomization, ...updates.menuCustomization }
      : current.menuCustomization,
    customMenuItems: updates.customMenuItems
      ? [...updates.customMenuItems]
      : current.customMenuItems,
    menuOrder: updates.menuOrder
      ? { ...current.menuOrder, ...updates.menuOrder }
      : current.menuOrder,
    landingPage: updates.landingPage
      ? mergeLandingPage(
        { ...current.landingPage, ...updates.landingPage },
        updates.portalName || current.portalName,
        updates.school?.name || current.school?.name,
      )
      : current.landingPage,
  };
  persistSchoolConfig(id, next);
  return next;
}

async function fetchPortalConfigFromApi() {
  const tenantSlug = resolveTenantSlug();
  const normalizedCached = getCachedPortalConfig(tenantSlug);
  if (normalizedCached) return normalizedCached;

  const data = await fetchPortalConfigRaw();
  const normalized = await normalizeApiPortalConfig(data);
  cachePortalConfig(normalized, tenantSlug);
  return normalized;
}

export async function getPortalConfig(schoolId) {
  const id = schoolId || getPublicSchoolId();
  return routeRequest({
    mockFn: async () => {
      await delay(120);
      return mockGetPortalConfig(id);
    },
    apiFn: fetchPortalConfigFromApi,
  });
}

export async function getAdminPortalConfig() {
  return routeRequest({
    mockFn: async () => {
      await delay(120);
      return mockGetPortalConfig(getAdminSelectedSchoolId());
    },
    apiFn: async () => {
      const data = await api.get('/admin/portal-settings');
      return normalizeApiPortalConfig(data);
    },
  });
}

export async function savePortalConfig(updates, schoolId) {
  const id = schoolId || getAdminSelectedSchoolId();
  return routeRequest({
    mockFn: async () => {
      await delay(300);
      return mockSavePortalConfig(updates, id);
    },
    apiFn: async () => {
      const branding = updates.branding
        ? await prepareBrandingForSave(updates.branding)
        : undefined;
      const landingPage = updates.landingPage
        ? await prepareLandingPageForSave(updates.landingPage)
        : undefined;
      const payload = { ...updates };
      if (branding) payload.branding = branding;
      if (landingPage) payload.landingPage = landingPage;
      if (payload.emailSettings) {
        const { password, passwordConfigured, ...rest } = payload.emailSettings;
        payload.emailSettings = { ...rest };
        if (password && password.trim()) {
          payload.emailSettings.password = password;
        }
      }
      const data = await api.put('/admin/portal-settings', payload);
      return normalizeApiPortalConfig(data);
    },
  });
}

export async function setMenuVisibility(role, menuId, visible, schoolId) {
  const id = schoolId || getAdminSelectedSchoolId();
  return routeRequest({
    mockFn: async () => {
      const current = mockGetPortalConfig(id);
      const menuVisibility = {
        ...current.menuVisibility,
        [role]: { ...current.menuVisibility[role], [menuId]: visible },
      };
      return mockSavePortalConfig({ menuVisibility }, id);
    },
    apiFn: async () => {
      const data = await api.patch('/admin/portal-settings/menus', {
        items: [{ role, menuId, visible }],
      });
      return normalizeApiPortalConfig(data);
    },
  });
}

export async function updateMenuItemCustomization(menuId, patch, schoolId) {
  const id = schoolId || getAdminSelectedSchoolId();
  return routeRequest({
    mockFn: async () => {
      const current = mockGetPortalConfig(id);
      const menuCustomization = {
        ...current.menuCustomization,
        [menuId]: { ...current.menuCustomization[menuId], ...patch },
      };
      return mockSavePortalConfig({ menuCustomization }, id);
    },
    apiFn: () => api.patch(`/admin/portal-settings/menus/${menuId}`, patch),
  });
}

export async function saveCustomMenuItems(customMenuItems, schoolId) {
  const id = schoolId || getAdminSelectedSchoolId();
  return routeRequest({
    mockFn: async () => mockSavePortalConfig({ customMenuItems }, id),
    apiFn: async () => {
      const data = await api.put('/admin/portal-settings/menus/custom', { items: customMenuItems });
      return normalizeApiPortalConfig(data);
    },
  });
}

export async function addCustomMenuItem(item, schoolId) {
  const id = schoolId || getAdminSelectedSchoolId();
  return routeRequest({
    mockFn: async () => {
      const current = mockGetPortalConfig(id);
      const customMenuItems = [...current.customMenuItems, item];
      return mockSavePortalConfig({ customMenuItems }, id);
    },
    apiFn: async () => {
      const data = await api.post('/admin/portal-settings/menus/custom', item);
      return normalizeApiPortalConfig(data);
    },
  });
}

export async function removeCustomMenuItem(menuId, schoolId) {
  const id = schoolId || getAdminSelectedSchoolId();
  return routeRequest({
    mockFn: async () => {
      const current = mockGetPortalConfig(id);
      const customMenuItems = current.customMenuItems.filter((i) => i.id !== menuId);
      const menuVisibility = { ...current.menuVisibility };
      Object.keys(menuVisibility).forEach((role) => {
        if (menuVisibility[role]?.[menuId] !== undefined) {
          const { [menuId]: _, ...rest } = menuVisibility[role];
          menuVisibility[role] = rest;
        }
      });
      return mockSavePortalConfig({ customMenuItems, menuVisibility }, id);
    },
    apiFn: async () => {
      const data = await api.delete(`/admin/portal-settings/menus/custom/${menuId}`);
      return normalizeApiPortalConfig(data);
    },
  });
}

export async function reorderMenuItems(role, order, schoolId) {
  const id = schoolId || getAdminSelectedSchoolId();
  return routeRequest({
    mockFn: async () => {
      const current = mockGetPortalConfig(id);
      return mockSavePortalConfig({
        menuOrder: { ...current.menuOrder, [role]: order },
      }, id);
    },
    apiFn: async () => {
      const data = await api.patch('/admin/portal-settings/menus/order', { role, order });
      return normalizeApiPortalConfig(data);
    },
  });
}

/** Clear oversized legacy portal storage (run once if quota errors persist). */
export function clearLegacyPortalStorage() {
  removeStore(LEGACY_BULK_KEY);
  removeStore(LEGACY_SINGLE_KEY);
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
