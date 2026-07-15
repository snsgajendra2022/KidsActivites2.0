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

export function getDefaultMenuIdsForRole(role, customMenuItems = []) {
  const baseIds = (NAV_BY_ROLE[role] || []).map((item) => item.id);
  const customIds = customMenuItems
    .filter((item) => item.roles?.includes(role))
    .map((item) => item.id);
  return [...baseIds, ...customIds];
}

/** Merge saved order with defaults; append any new menu ids at the end. */
export function resolveMenuOrderForRole(role, menuOrder = {}, customMenuItems = []) {
  const allIds = getDefaultMenuIdsForRole(role, customMenuItems);
  const saved = menuOrder[role];
  if (!saved?.length) return allIds;
  const ordered = saved.filter((id) => allIds.includes(id));
  const tail = allIds.filter((id) => !ordered.includes(id));
  return [...ordered, ...tail];
}

export function sortNavItemsByOrder(items, orderIds = []) {
  if (!orderIds.length) return items;
  const rank = new Map(orderIds.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const ai = rank.has(a.id) ? rank.get(a.id) : 9999;
    const bi = rank.has(b.id) ? rank.get(b.id) : 9999;
    return ai - bi;
  });
}

function navPathKey(to) {
  if (!to) return '';
  // Ignore tenant prefix and trailing slash so /s/demo/parent/photos ≡ /parent/photos
  return String(to).replace(/\/+$/, '').replace(/^\/[^/]+(?=\/(?:parent|teacher|admin|profile)\b)/, '');
}

/** Append built-in nav items missing from API responses (e.g. newly shipped routes). */
export function mergeMissingBuiltinNavItems(apiItems, role, config = {}) {
  const localItems = resolveNavItemsForRole(role, config);
  const seenIds = new Set(apiItems.map((item) => item.id));
  const seenPaths = new Set(
    apiItems.map((item) => navPathKey(item.to)).filter(Boolean),
  );
  // Prefer API items; drop renamed-id duplicates that open the same route.
  const dedupedApiItems = [];
  const pathsKept = new Set();
  for (const item of apiItems) {
    const pathKey = navPathKey(item.to);
    if (pathKey && pathsKept.has(pathKey)) continue;
    if (pathKey) pathsKept.add(pathKey);
    dedupedApiItems.push(item);
  }
  const missing = localItems.filter((item) => {
    if (seenIds.has(item.id)) return false;
    const pathKey = navPathKey(item.to);
    if (pathKey && seenPaths.has(pathKey)) return false;
    return true;
  });
  if (!missing.length) return dedupedApiItems;
  const orderIds = resolveMenuOrderForRole(role, config.menuOrder, config.customMenuItems);
  return sortNavItemsByOrder([...dedupedApiItems, ...missing], orderIds);
}

/**
 * Ordered editor rows for a role (built-in + custom).
 * @returns {{ id: string, kind: 'builtin' | 'custom', item: object }[]}
 */
export function buildRoleMenuEntries(role, customMenuItems = [], menuOrder = {}) {
  const baseItems = NAV_BY_ROLE[role] || [];
  const customForRole = customMenuItems.filter((item) => item.roles?.includes(role));
  const orderIds = resolveMenuOrderForRole(role, menuOrder, customMenuItems);
  const entryMap = new Map();

  baseItems.forEach((item) => entryMap.set(item.id, { kind: 'builtin', item }));
  customForRole.forEach((item) => entryMap.set(item.id, { kind: 'custom', item }));

  return orderIds
    .filter((id) => entryMap.has(id))
    .map((id) => ({ id, ...entryMap.get(id) }));
}

/**
 * Resolve sidebar nav for a role with portal menu overrides.
 * @param {string} role
 * @param {{ menuVisibility?: object, menuCustomization?: object, customMenuItems?: object[], menuOrder?: object }} config
 */
export function resolveNavItemsForRole(role, config = {}) {
  const {
    menuVisibility = {},
    menuCustomization = {},
    customMenuItems = [],
    menuOrder = {},
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

  const orderIds = resolveMenuOrderForRole(role, menuOrder, customMenuItems);
  return sortNavItemsByOrder([...resolvedBase, ...resolvedCustom], orderIds);
}

/** @deprecated use resolveNavItemsForRole */
export function getVisibleNavForRole(role, menuVisibility = {}, menuCustomization = {}, customMenuItems = []) {
  return resolveNavItemsForRole(role, { menuVisibility, menuCustomization, customMenuItems });
}
