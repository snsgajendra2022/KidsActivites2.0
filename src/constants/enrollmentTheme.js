/** Fixed enrollment form palette — scoped to /enroll only (not global app theme). */
export const DEFAULT_ENROLLMENT_THEME = {
  brandNavy: '#1B2E4B',
  brandRed: '#C81E1E',
  brandGrayLight: '#E5E7EB',
  formBg: '#F3F4F6',
};

export function enrollmentThemeToCssVars(theme = {}) {
  const t = { ...DEFAULT_ENROLLMENT_THEME, ...theme };
  return {
    '--enroll-navy': t.brandNavy,
    '--enroll-red': t.brandRed,
    '--enroll-gray-light': t.brandGrayLight,
    '--enroll-form-bg': t.formBg,
  };
}
