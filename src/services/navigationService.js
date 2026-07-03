import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { NAV_BY_ROLE } from '../constants/navigation.js';
import { resolveMenuIcon } from '../constants/menuIcons.js';
import { resolveNavItemsForRole } from '../utils/navUtils.js';
import { getStoredUser } from './api/demoMode.js';

function findBuiltinItem(role, id) {
  return (NAV_BY_ROLE[role] || []).find((item) => item.id === id);
}

function mapApiNavItem(item, role) {
  const builtin = findBuiltinItem(role, item.id);
  return {
    id: item.id,
    to: item.path || item.to,
    label: item.label,
    icon: resolveMenuIcon(
      typeof item.icon === 'string' ? item.icon : item.iconName,
      builtin?.icon,
    ),
    section: item.section || builtin?.section,
    custom: item.custom === true,
  };
}

/**
 * Navigation for a role — live API or derived from portal config (mock).
 */
export async function getNavigationForRole(role, portalConfig = {}) {
  return routeRequest({
    user: getStoredUser(),
    mockFn: async () => resolveNavItemsForRole(role, portalConfig),
    apiFn: async () => {
      const data = await api.get('/navigation');
      const resolvedRole = data?.role || role;
      const items = data?.items || [];
      return items.map((item) => mapApiNavItem(item, resolvedRole));
    },
  });
}
