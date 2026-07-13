import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getPortalConfig,
  getAdminPortalConfig,
  savePortalConfig,
  getAdminSelectedSchoolId,
  setAdminSelectedSchoolId,
  setPublicSchoolId,
} from '../services/portalConfigService.js';
import { listSchoolsAdmin } from '../services/schoolService.js';
import { getNavigationForRole } from '../services/navigationService.js';
import { isApiEnabled } from '../services/api/config.js';
import { useTenant } from './TenantContext.jsx';
import { mergeMissingBuiltinNavItems, resolveNavItemsForRole } from '../utils/navUtils.js';
import { prefixTenantPath } from '../utils/tenantUtils.js';
import { applyPortalTheme } from '../utils/themeUtils.js';
import { ROLES } from '../constants/roles.js';
import {
  getDefaultPlatformConfig,
  getPlatformConfig,
  savePlatformConfig,
} from '../services/platformConfigService.js';
import { DEFAULT_PORTAL_CONFIG } from '../data/defaultPortalConfig.js';
import { DEFAULT_ENROLLMENT_FORM } from '../data/defaultEnrollmentFormConfig.js';

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
  isAdminRoute,
  isTenantSubdomain,
  isTenantRoute,
  isPlatformPublic,
  adminSelectedSchoolId,
  schools,
}) {
  if (isPlatformPublic) {
    return null;
  }

  if (isAdminRoute) {
    if (user?.role === ROLES.SUPER_ADMIN) {
      return adminSelectedSchoolId
        || getAdminSelectedSchoolId()
        || schools[0]?.id
        || urlSchoolId
        || null;
    }
    if (user?.schoolId) {
      return user.schoolId;
    }
    return urlSchoolId || schools[0]?.id || null;
  }

  if ((isTenantSubdomain || isTenantRoute) && urlSchoolId) {
    return urlSchoolId;
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
    isPlatformPublic,
    isPlatformEnrollment,
    isAdminRoute,
    isTenantSubdomain,
    isTenantRoute,
    tenantSlug,
  } = useTenant();

  const [config, setConfig] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [schools, setSchools] = useState([]);
  const [apiNavByRole, setApiNavByRole] = useState({});
  const [navLoadedRoles, setNavLoadedRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [adminSelectedSchoolId, setAdminSelectedSchoolIdState] = useState(
    () => getAdminSelectedSchoolId(),
  );

  const activeSchoolId = useMemo(
    () => resolveActiveSchoolId({
      user,
      urlSchoolId,
      isSchoolPublicRoute,
      isAdminRoute,
      isTenantSubdomain,
      isTenantRoute,
      isPlatformPublic,
      adminSelectedSchoolId,
      schools,
    }),
    [user, urlSchoolId, isSchoolPublicRoute, isAdminRoute, isTenantSubdomain, isTenantRoute, isPlatformPublic, adminSelectedSchoolId, schools],
  );

  const isPlatformAdmin = user?.role === ROLES.SUPER_ADMIN;
  const isTenantContext = isTenantRoute || isTenantSubdomain;

  const load = useCallback(async (schoolId) => {
    if (!schoolId) {
      setConfig(null);
      setLoading(false);
      return null;
    }
    try {
      const loader = (isAdminRoute && !isTenantContext)
        ? getAdminPortalConfig
        : () => getPortalConfig(schoolId);
      const data = await loader();
      setConfig(data);
      applyDocumentBranding(data);
      setLoading(false);
      return data;
    } catch (err) {
      console.error('[PortalConfig] Failed to load config', err);
      setLoading(false);
      throw err;
    }
  }, [isAdminRoute, isTenantContext]);

  useEffect(() => {
    if (isTenantContext) {
      return;
    }
    if (isAdminRoute) {
      listSchoolsAdmin().then(setSchools).catch(() => setSchools([]));
    }
    if (isPlatformPublic || isAdminRoute) {
      getPlatformConfig()
        .then(setPlatform)
        .catch((err) => {
          console.warn('[PortalConfig] Platform config unavailable, using defaults:', err?.message);
          setPlatform(getDefaultPlatformConfig());
        });
    }
  }, [isTenantContext, isAdminRoute, isPlatformPublic]);

  useEffect(() => {
    if (isPlatformPublic) {
      const activePlatform = platform ?? getDefaultPlatformConfig();
      setConfig(null);
      applyPlatformBranding(activePlatform);
      if (isPlatformEnrollment) {
        applyPortalTheme(
          activePlatform.theme || DEFAULT_PORTAL_CONFIG.theme,
          activePlatform.enrollmentTheme || DEFAULT_PORTAL_CONFIG.enrollmentTheme,
        );
      }
      setLoading(false);
      return;
    }
    if (!activeSchoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load(activeSchoolId);
  }, [activeSchoolId, isPlatformPublic, isPlatformEnrollment, platform, load]);

  const refreshNavForRole = useCallback(async (role, portalConfig = config) => {
    if (!role || !portalConfig) return [];
    if (!isApiEnabled()) {
      return resolveNavItemsForRole(role, {
        menuVisibility: portalConfig.menuVisibility,
        menuCustomization: portalConfig.menuCustomization,
        customMenuItems: portalConfig.customMenuItems,
        menuOrder: portalConfig.menuOrder,
      });
    }
    try {
      const items = await getNavigationForRole(role, portalConfig);
      setApiNavByRole((prev) => ({ ...prev, [role]: items }));
      setNavLoadedRoles((prev) => ({ ...prev, [role]: true }));
      return items;
    } catch (err) {
      console.error('[PortalConfig] Failed to load navigation', err);
      setNavLoadedRoles((prev) => ({ ...prev, [role]: false }));
      return resolveNavItemsForRole(role, {
        menuVisibility: portalConfig.menuVisibility,
        menuCustomization: portalConfig.menuCustomization,
        customMenuItems: portalConfig.customMenuItems,
        menuOrder: portalConfig.menuOrder,
      });
    }
  }, [config]);

  useEffect(() => {
    setApiNavByRole({});
    setNavLoadedRoles({});
  }, [activeSchoolId]);

  useEffect(() => {
    if (!user?.role || !config) {
      return;
    }
    refreshNavForRole(user.role, config);
  }, [
    user?.role,
    config,
    config?.menuVisibility,
    config?.menuCustomization,
    config?.customMenuItems,
    config?.menuOrder,
    refreshNavForRole,
  ]);

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
    if (user?.role) {
      await refreshNavForRole(user.role, next);
    }
    return next;
  }, [activeSchoolId, user?.role, refreshNavForRole]);

  const updatePlatformConfig = useCallback(async (updates) => {
    const next = await savePlatformConfig(updates);
    setPlatform(next);
    if (isPlatformPublic) {
      applyPlatformBranding(next);
    }
    if (isPlatformEnrollment) {
      applyPortalTheme(
        next.theme || DEFAULT_PORTAL_CONFIG.theme,
        next.enrollmentTheme || DEFAULT_PORTAL_CONFIG.enrollmentTheme,
      );
    }
    return next;
  }, [isPlatformPublic, isPlatformEnrollment]);

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
    (role) => {
      let items;
      if (isApiEnabled() && navLoadedRoles[role] && role in apiNavByRole) {
        items = mergeMissingBuiltinNavItems(apiNavByRole[role], role, {
          menuVisibility: config?.menuVisibility,
          menuCustomization: config?.menuCustomization,
          customMenuItems: config?.customMenuItems,
          menuOrder: config?.menuOrder,
        });
      } else {
        items = resolveNavItemsForRole(role, {
          menuVisibility: config?.menuVisibility,
          menuCustomization: config?.menuCustomization,
          customMenuItems: config?.customMenuItems,
          menuOrder: config?.menuOrder,
        });
      }
      if (!tenantSlug) return items;
      return items.map((item) => ({ ...item, to: prefixTenantPath(item.to, tenantSlug) }));
    },
    [config, apiNavByRole, navLoadedRoles, tenantSlug],
  );

  const value = useMemo(
    () => ({
      config,
      platform,
      school: isPlatformEnrollment ? platform?.school : config?.school,
      theme: isPlatformEnrollment
        ? (platform?.theme || DEFAULT_PORTAL_CONFIG.theme)
        : config?.theme,
      enrollmentTheme: isPlatformEnrollment
        ? (platform?.enrollmentTheme || DEFAULT_PORTAL_CONFIG.enrollmentTheme)
        : config?.enrollmentTheme,
      loginMethods: config?.loginMethods,
      enrollmentForm: isPlatformEnrollment
        ? (platform?.enrollmentForm || DEFAULT_ENROLLMENT_FORM)
        : config?.enrollmentForm,
      portalName: isPlatformPublic
        ? (platform?.platformName || 'Kids Activities')
        : (config?.portalName || 'Kids Activities'),
      tagline: isPlatformPublic
        ? (platform?.tagline || '')
        : (config?.tagline || ''),
      footerText: isPlatformPublic
        ? (platform?.footerText || DEFAULT_PORTAL_CONFIG.footerText)
        : (config?.footerText || DEFAULT_PORTAL_CONFIG.footerText),
      landingPage: isPlatformPublic ? null : config?.landingPage,
      branding: isPlatformPublic
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
      refreshNavForRole,
      updateConfig,
      updatePlatformConfig,
      setMenuItemVisible,
      getNavItems,
    }),
    [
      config,
      platform,
      isPlatformEnrollment,
      isPlatformPublic,
      activeSchoolId,
      schoolSlug,
      schools,
      isPlatformAdmin,
      isAdminRoute,
      switchSchool,
      loading,
      load,
      updateConfig,
      updatePlatformConfig,
      setMenuItemVisible,
      getNavItems,
      refreshNavForRole,
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
