import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getPortalConfig,
  savePortalConfig,
  getAdminSelectedSchoolId,
  setAdminSelectedSchoolId,
  setPublicSchoolId,
} from '../services/portalConfigService.js';
import { listSchoolsAdmin } from '../services/schoolService.js';
import { useTenant } from './TenantContext.jsx';
import { resolveNavItemsForRole } from '../utils/navUtils.js';
import { applyPortalTheme } from '../utils/themeUtils.js';
import { ROLES } from '../constants/roles.js';
import { getPlatformConfig } from '../services/platformConfigService.js';
import { DEFAULT_PORTAL_CONFIG } from '../data/defaultPortalConfig.js';

const PortalConfigContext = createContext(null);

function applyDocumentBranding(config) {
  if (!config) return;
  document.title = `${config.portalName} — ${config.tagline || config.school?.name || 'School Portal'}`;
  applyPortalTheme(config.theme, config.enrollmentTheme);

  const favicon = config.branding?.faviconUrl;
  if (favicon) {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = favicon;
  }
}

function applyPlatformBranding(platform) {
  if (!platform) return;
  document.title = `${platform.platformName} — ${platform.tagline || 'School Portal'}`;
}

function resolveActiveSchoolId({
  user,
  urlSchoolId,
  isSchoolPublicRoute,
  isPlatformHome,
  adminSelectedSchoolId,
  schools,
}) {
  if (isPlatformHome) {
    return null;
  }

  if (isSchoolPublicRoute && urlSchoolId) {
    setPublicSchoolId(urlSchoolId);
    return urlSchoolId;
  }

  if (user?.role === ROLES.SUPER_ADMIN) {
    return adminSelectedSchoolId
      || getAdminSelectedSchoolId()
      || schools[0]?.id
      || null;
  }

  if (user?.schoolId) {
    return user.schoolId;
  }

  return urlSchoolId || null;
}

export function PortalConfigProvider({ children, user = null }) {
  const {
    urlSchoolId,
    schoolSlug,
    isSchoolPublicRoute,
    isPlatformHome,
    isAdminRoute,
  } = useTenant();

  const [config, setConfig] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminSelectedSchoolId, setAdminSelectedSchoolIdState] = useState(
    () => getAdminSelectedSchoolId(),
  );

  const activeSchoolId = useMemo(
    () => resolveActiveSchoolId({
      user,
      urlSchoolId,
      isSchoolPublicRoute,
      isPlatformHome,
      adminSelectedSchoolId,
      schools,
    }),
    [user, urlSchoolId, isSchoolPublicRoute, isPlatformHome, adminSelectedSchoolId, schools],
  );

  const isPlatformAdmin = user?.role === ROLES.SUPER_ADMIN;

  const load = useCallback(async (schoolId) => {
    if (!schoolId) {
      setConfig(null);
      setLoading(false);
      return null;
    }
    try {
      const data = await getPortalConfig(schoolId);
      setConfig(data);
      applyDocumentBranding(data);
      setLoading(false);
      return data;
    } catch (err) {
      console.error('[PortalConfig] Failed to load config', err);
      setLoading(false);
      throw err;
    }
  }, []);

  useEffect(() => {
    listSchoolsAdmin().then(setSchools).catch(() => setSchools([]));
    getPlatformConfig().then(setPlatform).catch(() => setPlatform(null));
  }, []);

  useEffect(() => {
    if (isPlatformHome) {
      setConfig(null);
      applyPlatformBranding(platform);
      setLoading(false);
      return;
    }
    if (!activeSchoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load(activeSchoolId);
  }, [activeSchoolId, isPlatformHome, platform, load]);

  const switchSchool = useCallback(async (schoolId) => {
    if (user?.role === ROLES.SUPER_ADMIN) {
      setAdminSelectedSchoolId(schoolId);
      setAdminSelectedSchoolIdState(schoolId);
    } else if (!user) {
      setPublicSchoolId(schoolId);
    }
    return load(schoolId);
  }, [user, load]);

  const updateConfig = useCallback(async (updates) => {
    if (!activeSchoolId) return null;
    const next = await savePortalConfig(updates, activeSchoolId);
    setConfig(next);
    applyDocumentBranding(next);
    return next;
  }, [activeSchoolId]);

  const setMenuItemVisible = useCallback(async (role, menuId, visible) => {
    const nextVisibility = {
      ...config.menuVisibility,
      [role]: {
        ...config.menuVisibility[role],
        [menuId]: visible,
      },
    };
    return updateConfig({ menuVisibility: nextVisibility });
  }, [config, updateConfig]);

  const getNavItems = useCallback(
    (role) => resolveNavItemsForRole(role, {
      menuVisibility: config?.menuVisibility,
      menuCustomization: config?.menuCustomization,
      customMenuItems: config?.customMenuItems,
      menuOrder: config?.menuOrder,
    }),
    [config],
  );

  const value = useMemo(
    () => ({
      config,
      platform,
      school: config?.school,
      theme: config?.theme,
      enrollmentTheme: config?.enrollmentTheme,
      loginMethods: config?.loginMethods,
      enrollmentForm: config?.enrollmentForm,
      portalName: isPlatformHome
        ? (platform?.platformName || 'SchoolBridge')
        : (config?.portalName || 'SchoolBridge'),
      footerText: isPlatformHome
        ? (platform?.footerText || DEFAULT_PORTAL_CONFIG.footerText)
        : (config?.footerText || DEFAULT_PORTAL_CONFIG.footerText),
      branding: isPlatformHome
        ? { ...DEFAULT_PORTAL_CONFIG.branding, ...(platform?.branding || {}) }
        : config?.branding,
      activeSchoolId,
      schoolSlug,
      schools,
      isPlatformAdmin,
      isAdminRoute,
      switchSchool,
      loading,
      reload: () => load(activeSchoolId),
      updateConfig,
      setMenuItemVisible,
      getNavItems,
    }),
    [
      config,
      platform,
      isPlatformHome,
      activeSchoolId,
      schoolSlug,
      schools,
      isPlatformAdmin,
      isAdminRoute,
      switchSchool,
      loading,
      load,
      updateConfig,
      setMenuItemVisible,
      getNavItems,
    ],
  );

  return (
    <PortalConfigContext.Provider value={value}>
      {children}
    </PortalConfigContext.Provider>
  );
}

export function usePortalConfig() {
  const ctx = useContext(PortalConfigContext);
  if (!ctx) throw new Error('usePortalConfig must be used inside PortalConfigProvider');
  return ctx;
}
