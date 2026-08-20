/**
 * Admin-configurable branding for the printable enrollment form.
 * Saved on portal config (API / Portal Settings) per school.
 * Empty strings mean "derive from school name / footer / logo".
 */
export const DEFAULT_PRINTABLE_FORM_BRANDING = {
  brandName: '',
  legalName: '',
  learnMark: '',
  learnSubtext: '',
  formNoDefault: '',
  alumniLabel: '',
  preschoolTagline: '',
  trustedBrandText: '',
  sealArcTop: '',
  sealArcBottom: '',
  social: {
    facebook: '',
    instagram: '',
    website: '',
  },
};

export function mergePrintableFormBranding(stored) {
  return {
    ...DEFAULT_PRINTABLE_FORM_BRANDING,
    ...(stored || {}),
    social: {
      ...DEFAULT_PRINTABLE_FORM_BRANDING.social,
      ...(stored?.social || {}),
    },
  };
}
