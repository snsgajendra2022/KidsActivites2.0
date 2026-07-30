import { describe, expect, it } from 'vitest';
import {
  ADMIN_NAV,
  SCHOOL_ADMIN_NAV,
  SUPER_ADMIN_NAV,
} from './navigation.js';

const hasSubscriptionPlans = (items) => (
  items.some((item) => item.to === '/admin/subscription')
);

describe('subscription plan navigation access', () => {
  it('shows subscription plans to platform and school administrators', () => {
    expect(hasSubscriptionPlans(SUPER_ADMIN_NAV)).toBe(true);
    expect(hasSubscriptionPlans(SCHOOL_ADMIN_NAV)).toBe(true);
  });

  it('does not expose subscription plans to admission officers', () => {
    expect(hasSubscriptionPlans(ADMIN_NAV)).toBe(false);
  });
});
