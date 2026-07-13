import { DEFAULT_LANDING_TIMELINE_STEPS } from '../data/defaultLandingPage.js';
import { buildDefaultTheme } from './defaultTheme.js';

export const BLOCK_TYPES = {
  HERO: 'hero',
  FEATURES: 'features',
  IMAGE_BANNER: 'imageBanner',
  MAP: 'map',
  CTA: 'cta',
  FOOTER: 'footer',
  CONTENT_SPLIT: 'contentSplit',
  BENTO_PAIR: 'bentoPair',
  FEATURE_PANEL: 'featurePanel',
  HIGHLIGHTS: 'highlights',
  TESTIMONIALS: 'testimonials',
};

export const BLOCK_PALETTE = [
  { type: BLOCK_TYPES.HERO, label: 'Hero Banner', desc: 'Top headline with buttons', defaultLayout: 'full-bleed-image' },
  { type: BLOCK_TYPES.FEATURES, label: 'Features', desc: 'Timeline or grid highlights', defaultLayout: 'timeline' },
  { type: BLOCK_TYPES.IMAGE_BANNER, label: 'Image Banner', desc: 'Wide campus or promo image', defaultLayout: 'wide' },
  { type: BLOCK_TYPES.MAP, label: 'Campus Map', desc: 'Location and address', defaultLayout: 'embed' },
  { type: BLOCK_TYPES.CTA, label: 'Call to Action', desc: 'Bottom enrollment banner', defaultLayout: 'image-bg' },
  { type: BLOCK_TYPES.FOOTER, label: 'Footer', desc: 'Contact and links', defaultLayout: 'default' },
];

export const LAYOUT_OPTIONS = {
  [BLOCK_TYPES.HERO]: [
    { id: 'full-bleed-image', label: 'Full width image' },
    { id: 'minimal', label: 'Minimal (no bg image)' },
    { id: 'split-playful', label: 'Split hero (playful)' },
  ],
  [BLOCK_TYPES.FEATURES]: [
    { id: 'timeline', label: 'Timeline scroll' },
    { id: 'grid-3', label: '3-column grid' },
    { id: 'circular-icons', label: 'Circular icons' },
    { id: 'curriculum-grid', label: 'Curriculum cards (6)' },
  ],
  [BLOCK_TYPES.IMAGE_BANNER]: [
    { id: 'wide', label: 'Wide banner' },
    { id: 'contained', label: 'Contained' },
  ],
  [BLOCK_TYPES.MAP]: [
    { id: 'embed', label: 'Map embed' },
  ],
  [BLOCK_TYPES.CTA]: [
    { id: 'image-bg', label: 'Image background' },
    { id: 'solid-color', label: 'Solid color' },
  ],
  [BLOCK_TYPES.FOOTER]: [
    { id: 'default', label: 'Default footer' },
    { id: 'rich-contact', label: 'Contact footer' },
  ],
  [BLOCK_TYPES.CONTENT_SPLIT]: [
    { id: 'image-left', label: 'Image left' },
    { id: 'image-right', label: 'Image right' },
  ],
  [BLOCK_TYPES.BENTO_PAIR]: [
    { id: 'default', label: 'Two cards' },
  ],
  [BLOCK_TYPES.FEATURE_PANEL]: [
    { id: 'split-card', label: 'Split card' },
  ],
  [BLOCK_TYPES.HIGHLIGHTS]: [
    { id: 'dark-grid', label: 'Dark icon grid' },
  ],
  [BLOCK_TYPES.TESTIMONIALS]: [
    { id: 'grid', label: 'Review grid' },
  ],
};

function newId(prefix = 'blk') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultBlock(type, { schoolName = 'our school', portalName = 'Kids Activities' } = {}) {
  const layout = BLOCK_PALETTE.find((b) => b.type === type)?.defaultLayout || 'default';

  switch (type) {
    case BLOCK_TYPES.HERO:
      return {
        id: newId(),
        type,
        layout,
        visible: true,
        style: {
          backgroundImageUrl: null,
          backgroundOverlay: 'rgba(0,0,0,0.45)',
          paddingY: 'xl',
          textAlign: 'center',
        },
        content: {
          badge: 'Admissions Open',
          title: schoolName,
          subtitle: `Complete your child's admission to ${schoolName} online.`,
          primaryButton: { label: 'Start Enrollment', href: '/enrollment/kidzee-print-form' },
          secondaryButton: { label: 'Parent Login', href: '/login' },
          showPrimaryButton: true,
          showSecondaryButton: true,
        },
      };
    case BLOCK_TYPES.FEATURES:
      return {
        id: newId(),
        type,
        layout,
        visible: true,
        style: { backgroundColor: '#F8FAFC', paddingY: 'lg' },
        content: {
          title: `Why Families Choose ${portalName}`,
          subtitle: 'Enrollments, payments, documents, and parent communication.',
          items: DEFAULT_LANDING_TIMELINE_STEPS.map((step, i) => ({
            id: newId('item'),
            title: step.title,
            description: step.description,
            imageUrl: step.imageUrl,
            icon: ['shield', 'file', 'wallet', 'users'][i] || 'star',
          })),
        },
      };
    case BLOCK_TYPES.IMAGE_BANNER:
      return {
        id: newId(),
        type,
        layout,
        visible: true,
        style: { paddingY: 'md' },
        content: {
          title: 'Experience Our Campus',
          subtitle: 'Explore our facilities',
          imageUrl: null,
        },
      };
    case BLOCK_TYPES.MAP:
      return {
        id: newId(),
        type,
        layout,
        visible: true,
        style: { paddingY: 'lg' },
        content: {
          title: 'Visit Our Campus',
          subtitle: `Experience ${schoolName} in person or explore online.`,
          embedUrl: '',
          imageUrl: null,
          showAddress: true,
        },
      };
    case BLOCK_TYPES.CTA:
      return {
        id: newId(),
        type,
        layout,
        visible: true,
        style: {
          backgroundImageUrl: null,
          backgroundColor: '#5B4BDB',
          paddingY: 'xl',
        },
        content: {
          title: schoolName,
          subtitle: '',
          button: { label: 'Start Enrollment', href: '/enrollment/kidzee-print-form' },
        },
      };
    case BLOCK_TYPES.FOOTER:
      return {
        id: newId(),
        type,
        layout,
        visible: true,
        style: {},
        content: { compact: true },
      };
    default:
      return {
        id: newId(),
        type: BLOCK_TYPES.HERO,
        layout: 'full-bleed-image',
        visible: true,
        style: {},
        content: {},
      };
  }
}

export function createEmptyLandingPage({ schoolName, portalName, theme } = {}) {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    theme: theme || buildDefaultTheme(),
    seo: {
      title: `${schoolName || portalName || 'School'} — Admissions`,
      description: `Enroll at ${schoolName || 'our school'} online.`,
    },
    blocks: [
      createDefaultBlock(BLOCK_TYPES.HERO, { schoolName, portalName }),
      createDefaultBlock(BLOCK_TYPES.FEATURES, { schoolName, portalName }),
      createDefaultBlock(BLOCK_TYPES.MAP, { schoolName, portalName }),
      createDefaultBlock(BLOCK_TYPES.CTA, { schoolName, portalName }),
      createDefaultBlock(BLOCK_TYPES.FOOTER, { schoolName, portalName }),
    ],
  };
}
