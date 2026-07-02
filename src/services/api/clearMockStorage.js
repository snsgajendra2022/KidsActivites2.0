/** Mock-only localStorage keys cleared when the live API is enabled. */
const MOCK_KEYS = [
  'sb_applications',
  'sb_portal_config',
  'sb_portal_configs',
  'sb_schools',
  'sb_platform_config',
  'sb_school_settings',
  'sb_fee_structures',
  'sb_fees',
  'sb_photos',
  'sb_notifications',
  'sb_conversations',
  'sb_messages',
  'sb_audit_logs',
];

const MOCK_PREFIXES = ['sb_portal_config_', 'sb_portal_branding_'];

/** Remove stale mock data so API responses are not shadowed by localStorage. */
export function clearMockStorage() {
  try {
    MOCK_KEYS.forEach((key) => localStorage.removeItem(key));

    const prefixed = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && MOCK_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        prefixed.push(key);
      }
    }
    prefixed.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore quota / privacy errors */
  }
}
