const HERO_IMAGE = '/assets/hero_banner_kids.png';

export const DEFAULT_PORTAL_CONFIG = {
  portalName: 'Kids Activities',
  tagline: 'Activity enrollment and parent communication platform',
  footerText: '© 2026 Kids Activities. All rights reserved.',
  school: {
    id: 'school-1',
    name: 'Green Valley International School',
    academicYear: '2026–2027',
    address: '123 Education Lane, New Delhi, 110001',
    phone: '+91 11 4567 8900',
    email: 'admissions@greenvalley.edu.in',
  },
  branding: {
    logoUrl: null,
    logoIconUrl: null,
    faviconUrl: null,
    heroImageUrl: HERO_IMAGE,
    loginHeroUrl: HERO_IMAGE,
  },
  theme: {
    brandColor: '#1B2E4B',
    accentColor: '#0058BE',
  },
  enrollmentTheme: {
    brandNavy: '#1B2E4B',
    brandRed: '#C81E1E',
    brandGrayLight: '#E5E7EB',
    formBg: '#F3F4F6',
  },
  loginMethods: {
    emailLogin: true,
    mobileOtp: true,
    emailOtp: true,
    qrLogin: true,
  },
  loginScrollLines: [
    'Admissions open for 2026–2027 — enroll online today',
    'Last date for fee submission: 31 July 2026',
    'Track applications, documents & fees in your parent portal',
    'Need help? Contact admissions@greenvalley.edu.in',
  ],
  /** role → menuId → visible (false = hidden) */
  menuVisibility: {},
  /** menuId → { label?, icon? } — overrides built-in sidebar labels/icons */
  menuCustomization: {},
  /** Custom sidebar links added by super admin */
  customMenuItems: [],
  /** role → ordered menuId[] — sidebar display order per role */
  menuOrder: {},
};

export function buildDefaultMenuVisibility(navByRole) {
  const visibility = {};
  Object.entries(navByRole).forEach(([role, items]) => {
    visibility[role] = {};
    items.forEach((item) => {
      visibility[role][item.id] = true;
    });
  });
  return visibility;
}
