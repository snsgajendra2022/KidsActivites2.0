import {
  FINANCE_NAV_IDS,
  NAV_BY_ROLE,
  NAV_SECTION_FALLBACK_ICONS,
  NAV_SECTION_ICONS,
} from '../constants/navigation.js';
import { resolveMenuIcon } from '../constants/menuIcons.js';

export function getAllMenuItemsGrouped() {
  const grouped = {};
  Object.entries(NAV_BY_ROLE).forEach(([role, items]) => {
    grouped[role] = items;
  });
  return grouped;
}

const NAV_SECTION_ICON_BY_LOWER = Object.fromEntries(
  Object.entries(NAV_SECTION_ICONS).map(([key, icon]) => [key.toLowerCase(), icon]),
);

const FINANCE_NAV_ID_SET = new Set(FINANCE_NAV_IDS);

/** Display aliases that should collapse into the Finance sidebar group. */
const FINANCE_SECTION_ALIASES = new Set([
  'finance',
  'fees & finance',
  'fees and finance',
  'finance & fees',
  'finance and fees',
  'reports',
]);

/**
 * Canonicalize sidebar section titles so finance items never split across
 * "Fees & Finance" / "Reports" / "Finance".
 */
export function normalizeNavSection(section, itemId) {
  if (itemId && FINANCE_NAV_ID_SET.has(itemId)) return 'Finance';
  const key = String(section || '').trim();
  if (!key) return key;
  if (FINANCE_SECTION_ALIASES.has(key.toLowerCase())) return 'Finance';
  return key;
}

/** Keyword → icon for API section titles that aren't exact map keys. */
const SECTION_ICON_KEYWORDS = [
  [/students?\s*&?\s*classes?|students?/, NAV_SECTION_ICONS['Students & Classes']],
  [/school\s*setup|setup/, NAV_SECTION_ICONS['School Setup']],
  [/classroom|academics?|learning|lms/, NAV_SECTION_ICONS.Classroom],
  [/transport|bus|fleet/, NAV_SECTION_ICONS.Transport],
  [/finance|fees?|payroll|accounting|money|reports?/, NAV_SECTION_ICONS.Finance],
  [/communicat|message|notice|notif/, NAV_SECTION_ICONS.Communication],
  [/settings?|config|admin|security/, NAV_SECTION_ICONS.Settings],
  [/family|parent|home/, NAV_SECTION_ICONS.Family],
  [/account|profile/, NAV_SECTION_ICONS.Account],
  [/platform|operator/, NAV_SECTION_ICONS.Platform],
  [/\bschool\b/, NAV_SECTION_ICONS.School],
  [/more|other/, NAV_SECTION_ICONS.More],
];

function hashSectionKey(section) {
  let hash = 0;
  for (let i = 0; i < section.length; i += 1) {
    hash = ((hash << 5) - hash) + section.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
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

/** Resolve the lucide icon for a nav section group (collapsed rail). */
export function resolveSectionIcon(section) {
  const key = String(section || '').trim();
  if (!key) return NAV_SECTION_FALLBACK_ICONS[0];

  const exact = NAV_SECTION_ICONS[key] || NAV_SECTION_ICON_BY_LOWER[key.toLowerCase()];
  if (exact) return exact;

  const lower = key.toLowerCase();
  for (const [pattern, icon] of SECTION_ICON_KEYWORDS) {
    if (pattern.test(lower)) return icon;
  }

  const palette = NAV_SECTION_FALLBACK_ICONS;
  return palette[hashSectionKey(lower) % palette.length];
}

/**
 * Build rail entries for collapsed sidebar:
 * - items without a section stay as direct links
 * - consecutive sectioned items become a group with a flyout
 */
export function buildCollapsedNavGroups(items = []) {
  const groups = [];
  let current = null;

  for (const item of items) {
    const section = String(item?.section || '').trim();
    if (!section) {
      current = null;
      groups.push({ type: 'link', key: item.id || item.to, item });
      continue;
    }
    if (!current || current.section !== section) {
      current = {
        type: 'group',
        key: `section:${section}`,
        section,
        icon: resolveSectionIcon(section),
        items: [],
      };
      groups.push(current);
    }
    current.items.push(item);
  }

  return groups;
}

/**
 * Group items so each section header appears once.
 * Leading items without a section stay first (e.g. Dashboard).
 */
export function coalesceNavBySection(items = []) {
  if (!items.length) return items;

  const leading = [];
  const sectionOrder = [];
  const buckets = new Map();
  const trailing = [];
  let seenSection = false;

  for (const item of items) {
    const section = String(item?.section || '').trim();
    if (!section) {
      if (!seenSection) leading.push(item);
      else trailing.push(item);
      continue;
    }
    seenSection = true;
    if (!buckets.has(section)) {
      sectionOrder.push(section);
      buckets.set(section, []);
    }
    buckets.get(section).push(item);
  }

  return [
    ...leading,
    ...sectionOrder.flatMap((section) => buckets.get(section) || []),
    ...trailing,
  ];
}

function navPathKey(to) {
  if (!to) return '';
  // Ignore tenant prefix and trailing slash so /s/demo/parent/photos ≡ /parent/photos
  return String(to).replace(/\/+$/, '').replace(/^\/[^/]+(?=\/(?:parent|teacher|admin|profile)\b)/, '');
}

/** Append built-in nav items missing from API responses (e.g. newly shipped routes). */
export function mergeMissingBuiltinNavItems(apiItems, role, config = {}) {
  const localItems = resolveNavItemsForRole(role, config);
  const localById = new Map(localItems.map((item) => [item.id, item]));
  const seenIds = new Set(apiItems.map((item) => item.id));
  const seenPaths = new Set(
    apiItems.map((item) => navPathKey(item.to)).filter(Boolean),
  );
  // Prefer API items; drop renamed-id duplicates that open the same route.
  // Backfill subtitle/group/section from local builtins when API omits them.
  const dedupedApiItems = [];
  const pathsKept = new Set();
  for (const item of apiItems) {
    const pathKey = navPathKey(item.to);
    if (pathKey && pathsKept.has(pathKey)) continue;
    if (pathKey) pathsKept.add(pathKey);
    const local = localById.get(item.id);
    dedupedApiItems.push(local ? {
      ...item,
      subtitle: item.subtitle || local.subtitle || '',
      group: item.group || local.group || '',
      section: normalizeNavSection(item.section || local.section, item.id),
    } : item);
  }
  const missing = localItems.filter((item) => {
    if (seenIds.has(item.id)) return false;
    const pathKey = navPathKey(item.to);
    if (pathKey && seenPaths.has(pathKey)) return false;
    return true;
  });
  if (!missing.length) return coalesceNavBySection(dedupedApiItems);
  const orderIds = resolveMenuOrderForRole(role, config.menuOrder, config.customMenuItems);
  return coalesceNavBySection(sortNavItemsByOrder([...dedupedApiItems, ...missing], orderIds));
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
        subtitle: custom?.subtitle?.trim() || item.subtitle || '',
        group: custom?.group?.trim() || item.group || '',
        icon: resolveMenuIcon(custom?.icon, item.icon),
        section: normalizeNavSection(item.section, item.id),
      };
    });

  const resolvedCustom = customMenuItems
    .filter((item) => item.roles?.includes(role) && roleVisibility[item.id] !== false)
    .map((item) => ({
      id: item.id,
      to: item.to,
      label: item.label,
      subtitle: item.subtitle || '',
      group: item.group || '',
      icon: resolveMenuIcon(item.icon),
      section: normalizeNavSection(item.section || 'More', item.id),
      custom: true,
    }));

  const orderIds = resolveMenuOrderForRole(role, menuOrder, customMenuItems);
  return coalesceNavBySection(sortNavItemsByOrder([...resolvedBase, ...resolvedCustom], orderIds));
}

/** @deprecated use resolveNavItemsForRole */
export function getVisibleNavForRole(role, menuVisibility = {}, menuCustomization = {}, customMenuItems = []) {
  return resolveNavItemsForRole(role, { menuVisibility, menuCustomization, customMenuItems });
}
