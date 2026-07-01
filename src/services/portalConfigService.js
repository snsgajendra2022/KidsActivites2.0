import { DEFAULT_PORTAL_CONFIG } from '../data/defaultPortalConfig.js';
import { NAV_BY_ROLE } from '../constants/navigation.js';
import { buildDefaultMenuVisibility } from '../data/defaultPortalConfig.js';
import { delay, getStore, setStore } from './mockApi.js';

const KEY = 'sb_portal_config';

function mergeConfig(stored) {
  const defaults = {
    ...DEFAULT_PORTAL_CONFIG,
    school: { ...DEFAULT_PORTAL_CONFIG.school },
    branding: { ...DEFAULT_PORTAL_CONFIG.branding },
    theme: { ...DEFAULT_PORTAL_CONFIG.theme },
    enrollmentTheme: { ...DEFAULT_PORTAL_CONFIG.enrollmentTheme },
    loginMethods: { ...DEFAULT_PORTAL_CONFIG.loginMethods },
    menuVisibility: buildDefaultMenuVisibility(NAV_BY_ROLE),
  };

  if (!stored) {
    return defaults;
  }

  const merged = {
    ...defaults,
    ...stored,
    school: { ...defaults.school, ...stored.school },
    branding: { ...defaults.branding, ...stored.branding },
    theme: { ...defaults.theme, ...(stored.theme || {}) },
    enrollmentTheme: { ...defaults.enrollmentTheme, ...(stored.enrollmentTheme || {}) },
    loginMethods: { ...defaults.loginMethods, ...(stored.loginMethods || {}) },
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

export async function getPortalConfig() {
  await delay(120);
  return mergeConfig(getStore(KEY, null));
}

export async function savePortalConfig(updates) {
  await delay(300);
  const current = mergeConfig(getStore(KEY, null));
  const theme = updates.theme
    ? { ...current.theme, ...updates.theme }
    : current.theme;
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
    menuVisibility: updates.menuVisibility
      ? { ...current.menuVisibility, ...updates.menuVisibility }
      : current.menuVisibility,
  };
  setStore(KEY, next);
  return next;
}

export async function setMenuVisibility(role, menuId, visible) {
  const current = mergeConfig(getStore(KEY, null));
  const menuVisibility = {
    ...current.menuVisibility,
    [role]: {
      ...current.menuVisibility[role],
      [menuId]: visible,
    },
  };
  return savePortalConfig({ menuVisibility });
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
