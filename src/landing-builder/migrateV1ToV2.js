import { mergeLandingPage } from '../data/defaultLandingPage.js';
import { BLOCK_TYPES, createDefaultBlock } from './blockRegistry.js';
import { buildDefaultTheme } from './defaultTheme.js';

function newId(prefix = 'blk') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Convert legacy landingPage v1 (sections object) to v2 blocks array. */
export function migrateLandingV1ToV2(v1, { portalName = 'Kids Activities', schoolName = 'our school' } = {}) {
  const lp = mergeLandingPage(v1, portalName, schoolName);
  const sections = lp.sections || {};
  const blocks = [];
  const theme = buildDefaultTheme();

  if (sections.hero !== false) {
    blocks.push({
      id: newId('hero'),
      type: BLOCK_TYPES.HERO,
      layout: 'full-bleed-image',
      visible: true,
      style: {
        backgroundImageUrl: null,
        backgroundOverlay: 'rgba(0,0,0,0.45)',
        paddingY: 'xl',
        textAlign: 'center',
      },
      content: {
        badge: lp.hero?.badge || 'Admissions Open',
        title: lp.hero?.title || schoolName,
        subtitle: lp.hero?.subtitle || '',
        primaryButton: {
          label: lp.hero?.primaryCtaLabel || 'Start Enrollment',
          href: '/enrollment/kidzee-print-form',
        },
        secondaryButton: {
          label: lp.hero?.secondaryCtaLabel || 'Parent Login',
          href: '/login',
        },
        showPrimaryButton: lp.hero?.primaryCtaEnabled !== false,
        showSecondaryButton: lp.hero?.secondaryCtaEnabled !== false,
      },
    });
  }

  if (sections.campusBanner !== false && lp.campusBanner?.imageUrl) {
    blocks.push({
      id: newId('banner'),
      type: BLOCK_TYPES.IMAGE_BANNER,
      layout: 'wide',
      visible: true,
      style: { paddingY: 'md' },
      content: {
        title: lp.campusBanner.title || 'Experience Our Campus',
        subtitle: lp.campusBanner.subtitle || '',
        imageUrl: lp.campusBanner.imageUrl,
      },
    });
  }

  if (sections.timeline !== false) {
    blocks.push({
      id: newId('features'),
      type: BLOCK_TYPES.FEATURES,
      layout: 'timeline',
      visible: true,
      style: { backgroundColor: '#F8FAFC', paddingY: 'lg' },
      content: {
        title: lp.timeline?.title || `Why Families Choose ${portalName}`,
        subtitle: lp.timeline?.subtitle || '',
        items: (lp.timeline?.steps || []).map((step, i) => ({
          id: newId('item'),
          title: step.title,
          description: step.description,
          imageUrl: step.imageUrl,
          icon: ['shield', 'file', 'wallet', 'users'][i] || 'star',
        })),
      },
    });
  }

  if (sections.map !== false) {
    blocks.push({
      id: newId('map'),
      type: BLOCK_TYPES.MAP,
      layout: 'embed',
      visible: true,
      style: { paddingY: 'lg' },
      content: {
        title: lp.map?.title || 'Visit Our Campus',
        subtitle: lp.map?.subtitle || '',
        embedUrl: lp.map?.embedUrl || '',
        imageUrl: lp.map?.imageUrl || null,
        showAddress: lp.map?.showAddress !== false,
      },
    });
  }

  if (sections.finalCta !== false) {
    blocks.push({
      id: newId('cta'),
      type: BLOCK_TYPES.CTA,
      layout: lp.finalCta?.imageUrl ? 'image-bg' : 'solid-color',
      visible: true,
      style: {
        backgroundImageUrl: lp.finalCta?.imageUrl || null,
        backgroundColor: theme.primaryColor,
        paddingY: 'xl',
      },
      content: {
        title: lp.finalCta?.title || schoolName,
        subtitle: lp.finalCta?.subtitle || '',
        button: {
          label: lp.finalCta?.ctaLabel || 'Start Enrollment',
          href: '/enrollment/kidzee-print-form',
        },
      },
    });
  }

  if (sections.footer !== false) {
    blocks.push(createDefaultBlock(BLOCK_TYPES.FOOTER, { schoolName, portalName }));
  }

  if (blocks.length === 0) {
    return {
      version: 2,
      updatedAt: new Date().toISOString(),
      theme,
      seo: { title: `${schoolName} — Admissions`, description: '' },
      blocks: [
        createDefaultBlock(BLOCK_TYPES.HERO, { schoolName, portalName }),
        createDefaultBlock(BLOCK_TYPES.FOOTER, { schoolName, portalName }),
      ],
    };
  }

  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    theme,
    seo: {
      title: `${schoolName} — Admissions`,
      description: lp.hero?.subtitle || '',
    },
    blocks,
  };
}
