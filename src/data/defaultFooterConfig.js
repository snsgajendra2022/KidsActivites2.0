export const SOCIAL_LINK_KEYS = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourschool' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourschool' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/yourschool' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourschool' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/919876543210' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourschool' },
];

export const DEFAULT_FOOTER = {
  description: '',
  copyright: '',
  quickLinks: [],
  socialLinks: {
    facebook: '',
    instagram: '',
    twitter: '',
    youtube: '',
    whatsapp: '',
    linkedin: '',
  },
};

export function buildDefaultCopyright(schoolName) {
  const name = (schoolName || 'School').trim();
  return `© ${new Date().getFullYear()} ${name}. All rights reserved.`;
}

export function mergeFooterConfig(stored, schoolName, legacyFooterText) {
  const defaults = {
    ...DEFAULT_FOOTER,
    copyright: buildDefaultCopyright(schoolName),
    socialLinks: { ...DEFAULT_FOOTER.socialLinks },
    quickLinks: [],
  };

  const footer = {
    ...defaults,
    ...(stored || {}),
    socialLinks: {
      ...defaults.socialLinks,
      ...(stored?.socialLinks || {}),
    },
    quickLinks: Array.isArray(stored?.quickLinks)
      ? stored.quickLinks.filter((link) => link && (link.label || link.url))
      : [],
  };

  if (!footer.copyright?.trim()) {
    footer.copyright = legacyFooterText?.trim() || defaults.copyright;
  }

  return footer;
}

export function getActiveSocialLinks(socialLinks = {}) {
  return SOCIAL_LINK_KEYS
    .map(({ key, label }) => ({ key, label, url: (socialLinks[key] || '').trim() }))
    .filter(({ url }) => url);
}
