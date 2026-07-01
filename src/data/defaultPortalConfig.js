const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA1Jp3AHHVfUbFSqzf3O-N5gFgr6s8ML-K8DwGD2GEXOTz15s-4fyzZM4Y1dwZ6vZaWqtLWEKGdZc1bwrXQMzn5bsiPQqN0FxnQdD3b2YNt-S05QXmCsAO0IBilprdNSAsdI39s5hIV7B5YPuyk0f-9esE0RwWHTQT0N5w6Qv9bcBb0Q1upVt_zm2uL6H9KaHy8QbCqOoaRNzNUIsoa0zzl2ZYB9sGHKd1fetYmj5dyKWuq4kD1hxjHmQ';

export const DEFAULT_PORTAL_CONFIG = {
  portalName: 'SchoolBridge',
  tagline: 'School Enrollment Platform',
  footerText: '© 2026 SchoolBridge Systems. All rights reserved.',
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
    accentColor: '#1B2E4B',
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
  },
  /** role → menuId → visible (false = hidden) */
  menuVisibility: {},
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
