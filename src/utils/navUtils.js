import { NAV_BY_ROLE } from '../constants/navigation.js';

export function getVisibleNavForRole(role, menuVisibility = {}) {
  const items = NAV_BY_ROLE[role] || [];
  const roleVisibility = menuVisibility[role] || {};

  return items.filter((item) => roleVisibility[item.id] !== false);
}

export function getAllMenuItemsGrouped() {
  const grouped = {};
  Object.entries(NAV_BY_ROLE).forEach(([role, items]) => {
    grouped[role] = items;
  });
  return grouped;
}
