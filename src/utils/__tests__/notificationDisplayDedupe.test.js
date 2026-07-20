import { describe, expect, it, beforeEach } from 'vitest';
import {
  claimNotificationDisplay,
  clearNotificationDisplayDedupe,
  wasNotificationDisplayed,
} from '../notificationDisplayDedupe.js';

describe('notificationDisplayDedupe', () => {
  beforeEach(() => {
    clearNotificationDisplayDedupe();
  });

  it('allows the first claim and rejects the second for the same id', () => {
    expect(claimNotificationDisplay('n1')).toBe(true);
    expect(claimNotificationDisplay('n1')).toBe(false);
    expect(wasNotificationDisplayed('n1')).toBe(true);
  });

  it('allows different ids independently', () => {
    expect(claimNotificationDisplay('a')).toBe(true);
    expect(claimNotificationDisplay('b')).toBe(true);
  });

  it('allows display when id is missing', () => {
    expect(claimNotificationDisplay(null)).toBe(true);
    expect(claimNotificationDisplay(undefined)).toBe(true);
  });
});
