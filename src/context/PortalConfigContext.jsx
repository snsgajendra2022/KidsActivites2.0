import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getPortalConfig,
  savePortalConfig,
  getPublicSchoolId,
  getAdminSelectedSchoolId,
  setAdminSelectedSchoolId,
  setPublicSchoolId,
} from '../services/portalConfigService.js';
import { listSchools } from '../services/schoolService.js';
import { resolveNavItemsForRole } from '../utils/navUtils.js';
import { applyPortalTheme } from '../utils/themeUtils.js';
import { ROLES } from '../constants/roles.js';
import { DEFAULT_SCHOOL_ID } from '../data/mockSchools.js';

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

function resolveSchoolIdForUser(user, adminSelectedSchoolId) {
  if (!user) return getPublicSchoolId();
  if (user.role === ROLES.SUPER_ADMIN) {
    return adminSelectedSchoolId || getAdminSelectedSchoolId();
  }
  return user.schoolId || DEFAULT_SCHOOL_ID;
}

export function PortalConfigProvider({ children, user = null }) {
  const [config, setConfig] = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminSelectedSchoolId, setAdminSelectedSchoolIdState] = useState(
    () => getAdminSelectedSchoolId(),
  );

  const activeSchoolId = useMemo(
    () => resolveSchoolIdForUser(user, adminSelectedSchoolId),
    [user, adminSelectedSchoolId],
  );

  const isPlatformAdmin = user?.role === ROLES.SUPER_ADMIN;

  const load = useCallback(async (schoolId) => {
    const id = schoolId || activeSchoolId;
    try {
      const data = await getPortalConfig(id);
      setConfig(data);
      applyDocumentBranding(data);
      setLoading(false);
      return data;
    } catch (err) {
      console.error('[PortalConfig] Failed to load config', err);
      setLoading(false);
      throw err;
    }
  }, [activeSchoolId]);

  useEffect(() => {
    listSchools().then(setSchools).catch(() => setSchools([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    load(activeSchoolId);
  }, [activeSchoolId, load]);

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
      school: config?.school,
      branding: config?.branding,
      theme: config?.theme,
      enrollmentTheme: config?.enrollmentTheme,
      loginMethods: config?.loginMethods,
      enrollmentForm: config?.enrollmentForm,
      portalName: config?.portalName || 'SchoolBridge',
      activeSchoolId,
      schools,
      isPlatformAdmin,
      switchSchool,
      loading,
      reload: () => load(activeSchoolId),
      updateConfig,
      setMenuItemVisible,
      getNavItems,
    }),
    [
      config,
      activeSchoolId,
      schools,
      isPlatformAdmin,
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
