export const DEFAULT_LANDING_THEME = {
  primaryColor: '#5B4BDB',
  secondaryColor: '#F59E0B',
  backgroundColor: '#FFFFFF',
  textColor: '#1E293B',
  fontFamily: 'system',
  borderRadius: 'lg',
};

export function buildDefaultTheme(overrides = {}) {
  return { ...DEFAULT_LANDING_THEME, ...overrides };
}
