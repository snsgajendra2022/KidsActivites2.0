
const HERO_IMAGE = '/assets/hero_banner_kids.png';

import { DEFAULT_FOOTER } from './defaultFooterConfig.js';
import { DEFAULT_PRINTABLE_FORM_BRANDING } from './defaultPrintableFormBranding.js';

// const HERO_IMAGE =
//   'https://lh3.googleusercontent.com/aida-public/AB6AXuA1Jp3AHHVfUbFSqzf3O-N5gFgr6s8ML-K8DwGD2GEXOTz15s-4fyzZM4Y1dwZ6vZaWqtLWEKGdZc1bwrXQMzn5bsiPQqN0FxnQdD3b2YNt-S05QXmCsAO0IBilprdNSAsdI39s5hIV7B5YPuyk0f-9esE0RwWHTQT0N5w6Qv9bcBb0Q1upVt_zm2uL6H9KaHy8QbCqOoaRNzNUIsoa0zzl2ZYB9sGHKd1fetYmj5dyKWuq4kD1hxjHmQ';


export const DEFAULT_PORTAL_CONFIG = {
  portalName: 'Kids Activities',
  tagline: 'Activity enrollment and parent communication platform',
  footerText: '© 2026 Kids Activities. All rights reserved.',
  footer: {
    ...DEFAULT_FOOTER,
    socialLinks: { ...DEFAULT_FOOTER.socialLinks },
    quickLinks: [],
  },
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
  /** Printable enrollment form names / socials (admin-configured per school). */
  printableFormBranding: { ...DEFAULT_PRINTABLE_FORM_BRANDING, social: { ...DEFAULT_PRINTABLE_FORM_BRANDING.social } },
  theme: {
    brandColor: '#0f172a',
    accentColor: '#fbbf24',
  },
  enrollmentTheme: {
    brandNavy: '#0f172a',
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
  courseCertificates: {
    enabled: true,
    selectedTemplateId: 'classic-gold',
    title: 'Certificate of Completion',
    subtitle: 'This is to certify that',
    bodyText:
      '{{studentName}} has successfully completed the course {{courseName}} with distinction and dedication.',
    signatoryName: 'Principal',
    signatoryTitle: 'Head of Institution',
    coSignatoryName: 'Course Director',
    coSignatoryTitle: 'Academic Lead',
    footerNote: 'Issued by {{schoolName}} · {{academicYear}}',
    showLogo: true,
    showSeal: true,
    showQrHint: false,
    sealUrl: null,
    accentOverride: null,
  },
  loginScrollLines: [
    'Admissions open for 2026–2027 — enroll online today',
    'Last date for fee submission: 31 July 2026',
    'Track applications, documents & fees in your parent portal',
    'Need help? Contact admissions@greenvalley.edu.in',
  ],
  emailSettings: {
    useSchoolSmtp: false,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
    passwordConfigured: false,
  },
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
