import { describe, expect, it } from 'vitest';
import { SUPER_ADMIN_NAV } from './navigation.js';
import { hasPermission, PERMISSIONS } from './permissions.js';
import { ROLES } from './roles.js';

describe('chat access configuration', () => {
  it('shows chat in super-admin navigation', () => {
    expect(SUPER_ADMIN_NAV.some((item) => item.to === '/admin/chat')).toBe(true);
  });

  it('allows messaging only for roles with SEND_MESSAGES', () => {
    expect(hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.SEND_MESSAGES)).toBe(true);
    expect(hasPermission(ROLES.TEACHER, PERMISSIONS.SEND_MESSAGES)).toBe(true);
    expect(hasPermission(ROLES.PARENT, PERMISSIONS.SEND_MESSAGES)).toBe(true);
    expect(hasPermission(ROLES.ADMISSION_OFFICER, PERMISSIONS.SEND_MESSAGES)).toBe(false);
  });
});
