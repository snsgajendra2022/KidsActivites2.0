import { NAV_BY_ROLE } from '../constants/navigation.js';
import { resolveMenuIcon } from '../constants/menuIcons.js';

export function getAllMenuItemsGrouped() {
  const grouped = {};
  Object.entries(NAV_BY_ROLE).forEach(([role, items]) => {
    grouped[role] = items;
  });
  return grouped;
}

/** Unique built-in menu items across all roles (by id). */
export function getUniqueBuiltinMenuItems() {
  const map = new Map();
  Object.values(NAV_BY_ROLE).flat().forEach((item) => {
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
}

/**
 * Resolve sidebar nav for a role with portal menu overrides.
 * @param {string} role
 * @param {{ menuVisibility?: object, menuCustomization?: object, customMenuItems?: object[] }} config
 */
export function resolveNavItemsForRole(role, config = {}) {
  const {
    menuVisibility = {},
    menuCustomization = {},
    customMenuItems = [],
  } = config;

  const baseItems = NAV_BY_ROLE[role] || [];
  const roleVisibility = menuVisibility[role] || {};

  const resolvedBase = baseItems
    .filter((item) => roleVisibility[item.id] !== false)
    .map((item) => {
      const custom = menuCustomization[item.id];
      return {
        ...item,
        label: custom?.label?.trim() || item.label,
        icon: resolveMenuIcon(custom?.icon, item.icon),
      };
    });

  const resolvedCustom = customMenuItems
    .filter((item) => item.roles?.includes(role) && roleVisibility[item.id] !== false)
    .map((item) => ({
      id: item.id,
      to: item.to,
      label: item.label,
      icon: resolveMenuIcon(item.icon),
      custom: true,
    }));

  return [...resolvedBase, ...resolvedCustom];
}

/** @deprecated use resolveNavItemsForRole */
export function getVisibleNavForRole(role, menuVisibility = {}, menuCustomization = {}, customMenuItems = []) {
  return resolveNavItemsForRole(role, { menuVisibility, menuCustomization, customMenuItems });
}
