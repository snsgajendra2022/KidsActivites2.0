import { createEmptyLandingPage } from '../blockRegistry.js';
import { buildDefaultTheme } from '../defaultTheme.js';
import { createLaughAndLearnPage, LAUGH_AND_LEARN_TEMPLATE_META } from './laughAndLearn.js';

function tpl(id, name, description, pageFactory) {
  const page = pageFactory();
  return {
    id,
    name,
    description,
    thumbnailUrl: `/assets/kidsactivites-hero-placeholder.svg`,
    category: 'school',
    blockCount: page.blocks.length,
    page,
  };
}

export const LANDING_TEMPLATES = [
  tpl('admissions-classic', 'Admissions Classic', 'Hero, features, map, CTA, and footer', ({ schoolName = 'Our School', portalName = 'Kids Activities' } = {}) =>
    createEmptyLandingPage({ schoolName, portalName })),

  tpl('admissions-minimal', 'Minimal Clean', 'Hero and enrollment CTA only', () => {
    const page = createEmptyLandingPage({ schoolName: 'Our School', portalName: 'Kids Activities' });
    return {
      ...page,
      blocks: page.blocks.filter((b) => b.type === 'hero' || b.type === 'cta' || b.type === 'footer'),
    };
  }),

  tpl('single-cta', 'One Page Enroll', 'Focused hero with strong CTA', () => {
    const page = createEmptyLandingPage({ schoolName: 'Our School', portalName: 'Kids Activities' });
    return {
      ...page,
      theme: buildDefaultTheme({ primaryColor: '#0F4C5C', secondaryColor: '#E36414' }),
      blocks: page.blocks.filter((b) => b.type === 'hero' || b.type === 'cta'),
    };
  }),

  tpl('photo-gallery-focus', 'Photo Gallery Focus', 'Hero, image banner, features, CTA', () => {
    const page = createEmptyLandingPage({ schoolName: 'Our School', portalName: 'Kids Activities' });
    return {
      ...page,
      blocks: page.blocks.filter((b) => b.type !== 'map'),
    };
  }),

  (() => {
    const page = createLaughAndLearnPage();
    return {
      id: LAUGH_AND_LEARN_TEMPLATE_META.id,
      name: LAUGH_AND_LEARN_TEMPLATE_META.name,
      description: LAUGH_AND_LEARN_TEMPLATE_META.description,
      thumbnailUrl: LAUGH_AND_LEARN_TEMPLATE_META.thumbnailUrl,
      category: LAUGH_AND_LEARN_TEMPLATE_META.category,
      blockCount: LAUGH_AND_LEARN_TEMPLATE_META.blockCount || page.blocks.length,
      page,
    };
  })(),
];

export function getTemplateById(templateId) {
  return LANDING_TEMPLATES.find((t) => t.id === templateId) || null;
}

export function listTemplateSummaries() {
  return LANDING_TEMPLATES.map(({ id, name, description, thumbnailUrl, category, blockCount }) => ({
    id,
    name,
    description,
    thumbnailUrl,
    category,
    blockCount,
  }));
}

export function applyTemplate(templateId, { schoolName, portalName } = {}) {
  if (templateId === LAUGH_AND_LEARN_TEMPLATE_META.id) {
    // Always return exact demo content — same images and text as original HTML.
    const page = createLaughAndLearnPage();
    page.updatedAt = new Date().toISOString();
    return page;
  }

  const template = getTemplateById(templateId);
  if (!template) return null;
  const page = JSON.parse(JSON.stringify(template.page));
  page.updatedAt = new Date().toISOString();
  page.blocks = page.blocks.map((block) => {
    const next = { ...block, id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` };
    if (next.type === 'hero' && next.content) {
      next.content.title = schoolName || next.content.title;
      next.content.subtitle = next.content.subtitle?.replace(/our school|Our School/g, schoolName || 'our school');
    }
    if (next.type === 'cta' && next.content) {
      next.content.title = schoolName || next.content.title;
    }
    return next;
  });
  page.seo = {
    title: `${schoolName || portalName} — Admissions`,
    description: page.blocks.find((b) => b.type === 'hero')?.content?.subtitle || '',
  };
  return page;
}
