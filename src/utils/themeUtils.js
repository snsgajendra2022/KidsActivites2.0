const DEFAULT_BRAND = '#0f172a';
const DEFAULT_ACCENT = '#fbbf24';

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function mixHex(hex, target, amount) {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount,
  );
}

/** Apply single brand color across the entire app via CSS variables */
export function applyPortalTheme(theme = {}, enrollmentTheme = {}) {
  const brand = theme.brandColor || DEFAULT_BRAND;
  const accent = theme.accentColor || DEFAULT_ACCENT;
  const root = document.documentElement;

  const enrollNavy = enrollmentTheme.brandNavy || brand;
  const enrollRed = enrollmentTheme.brandRed || brand;

  root.style.setProperty('--sb-primary', brand);
  root.style.setProperty('--sb-secondary', accent);
  root.style.setProperty('--sb-accent', accent);
  root.style.setProperty('--sb-navy', brand);
  root.style.setProperty('--sb-gold', accent);
  root.style.setProperty('--enroll-navy', enrollNavy);
  root.style.setProperty('--enroll-red', enrollRed);
  root.style.setProperty('--enroll-gray-light', enrollmentTheme.brandGrayLight || '#E5E7EB');
  root.style.setProperty('--enroll-form-bg', enrollmentTheme.formBg || '#F3F4F6');
  root.style.setProperty('--primary', brand);
  root.style.setProperty('--navy', brand);
  root.style.setProperty('--primary-dark', mixHex(brand, '#000000', 0.25));
  root.style.setProperty('--primary-light', mixHex(accent, '#ffffff', 0.88));
  root.style.setProperty('--sb-surface-container-high', mixHex(accent, '#ffffff', 0.86));
  root.style.setProperty('--sb-surface-container', mixHex(brand, '#ffffff', 0.93));
  root.style.setProperty('--sb-on-primary', '#ffffff');
  root.style.setProperty('--sb-on-primary-muted', 'rgba(255, 255, 255, 0.6)');
  root.style.setProperty('--sb-on-primary-subtle', 'rgba(255, 255, 255, 0.45)');
  root.style.setProperty('--sb-on-primary-faint', 'rgba(255, 255, 255, 0.4)');
  root.style.setProperty('--sb-notification-unread', mixHex(accent, '#ffffff', 0.88));

  /* Portal shell chrome (sidebar/header) tracks brand — names kept for layout.css */
  root.style.setProperty('--admin-purple-deep', brand);
  root.style.setProperty('--admin-purple-mid', mixHex(brand, '#ffffff', 0.12));
  root.style.setProperty('--admin-purple-light', mixHex(brand, '#ffffff', 0.22));
  root.style.setProperty('--admin-purple-surface', '#ffffff');
  root.style.setProperty(
    '--admin-purple-border',
    `color-mix(in srgb, ${mixHex(brand, '#ffffff', 0.12)} 12%, #e2e8f0)`,
  );

  root.style.setProperty('--sb-font-heading', "'Fredoka', sans-serif");
  root.style.setProperty('--sb-font-body', "'Fredoka', sans-serif");
  root.style.setProperty('--font-display', "'Fredoka', sans-serif");
  root.style.setProperty('--font-main', "'Fredoka', sans-serif");
}

export const THEME_PRESETS = [
  { name: 'Kids Landing', brandColor: '#0f172a', accentColor: '#fbbf24' },
  { name: 'Institutional Navy', brandColor: '#0B1F3A', accentColor: '#C9A24A' },
  { name: 'Kids Activities Classic', brandColor: '#091426', accentColor: '#C9A24A' },
  { name: 'Forest Green', brandColor: '#1B4332', accentColor: '#2D6A4F' },
  { name: 'Royal Purple', brandColor: '#3C1874', accentColor: '#7B2CBF' },
  { name: 'Crimson', brandColor: '#7F1D1D', accentColor: '#DC2626' },
];
