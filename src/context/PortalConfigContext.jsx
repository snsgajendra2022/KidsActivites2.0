import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getPortalConfig, savePortalConfig } from '../services/portalConfigService.js';
import { resolveNavItemsForRole } from '../utils/navUtils.js';
import { applyPortalTheme } from '../utils/themeUtils.js';

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

export function PortalConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getPortalConfig();
    setConfig(data);
    applyDocumentBranding(data);
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateConfig = useCallback(async (updates) => {
    const next = await savePortalConfig(updates);
    setConfig(next);
    applyDocumentBranding(next);
    return next;
  }, []);

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
      loading,
      reload: load,
      updateConfig,
      setMenuItemVisible,
      getNavItems,
    }),
    [config, loading, load, updateConfig, setMenuItemVisible, getNavItems],
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
