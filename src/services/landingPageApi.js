import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { delay, getStore, setStore } from './mockApi.js';
import {
  getAdminSelectedSchoolId,
  getPublicSchoolId,
  mockGetPortalConfigInternal,
  persistSchoolConfigForLanding,
} from './portalConfigService.js';
import { migrateLandingV1ToV2 } from '../landing-builder/migrateV1ToV2.js';
import { applyTemplate, listTemplateSummaries, getTemplateById } from '../landing-builder/templates/index.js';
import { createEmptyLandingPage } from '../landing-builder/blockRegistry.js';

function landingStorageKey(schoolId, kind) {
  return `sb_landing_${kind}_${schoolId}`;
}

function readLandingPage(schoolId, kind) {
  return getStore(landingStorageKey(schoolId, kind), null);
}

function writeLandingPage(schoolId, kind, page) {
  setStore(landingStorageKey(schoolId, kind), page);
}

function resolveSchoolId(explicitId) {
  return explicitId || getAdminSelectedSchoolId() || getPublicSchoolId();
}

function ensureDraft(config, schoolId) {
  let draft = readLandingPage(schoolId, 'draft') || config.landingPageDraft;
  if (draft?.version === 2 && draft.blocks?.length) return draft;

  draft = migrateLandingV1ToV2(config.landingPage, {
    portalName: config.portalName,
    schoolName: config.school?.name,
  });
  writeLandingPage(schoolId, 'draft', draft);
  return draft;
}

async function mockLandingAction(action, payload = {}, schoolId) {
  await delay(150);
  const id = resolveSchoolId(schoolId);
  const config = mockGetPortalConfigInternal(id);
  const slug = config.school?.slug || '';
  const schoolName = config.school?.name || config.portalName;
  const portalName = config.portalName;

  switch (action) {
    case 'getEditor': {
      const draft = ensureDraft(config, id);
      const published = readLandingPage(id, 'published') || config.landingPagePublished || null;
      return {
        schoolSlug: slug,
        schoolName,
        publicUrl: slug ? `/${slug}` : '/',
        previewUrl: slug ? `/${slug}?preview=1` : '/?preview=1',
        version: 2,
        hasV1Legacy: Boolean(config.landingPage),
        draft,
        published,
        isDraftDirty: JSON.stringify(draft) !== JSON.stringify(published),
        templates: listTemplateSummaries(),
      };
    }

    case 'saveDraft': {
      const landingPage = payload.landingPage;
      if (!landingPage?.blocks) {
        throw new Error('Invalid landing page draft');
      }
      const draft = {
        ...landingPage,
        version: 2,
        updatedAt: new Date().toISOString(),
      };
      writeLandingPage(id, 'draft', draft);
      persistSchoolConfigForLanding(id, { landingPageDraft: draft });
      return { saved: true, updatedAt: draft.updatedAt, draft };
    }

    case 'publish': {
      const draft = ensureDraft(config, id);
      const published = {
        ...draft,
        publishedAt: new Date().toISOString(),
      };
      writeLandingPage(id, 'published', published);
      persistSchoolConfigForLanding(id, {
        landingPageDraft: draft,
        landingPagePublished: published,
      });
      return {
        published: true,
        publishedAt: published.publishedAt,
        publicUrl: slug ? `/${slug}` : '/',
        published,
      };
    }

    case 'discardDraft': {
      const published = readLandingPage(id, 'published') || config.landingPagePublished;
      if (!published) {
        const draft = ensureDraft(config, id);
        return { draft };
      }
      writeLandingPage(id, 'draft', published);
      persistSchoolConfigForLanding(id, { landingPageDraft: published });
      return { draft: published };
    }

    case 'applyTemplate': {
      const templateId = payload.templateId;
      const page = applyTemplate(templateId, { schoolName, portalName });
      if (!page) throw new Error('Template not found');
      if (payload.replaceTheme !== false) {
        // theme already on page
      }
      writeLandingPage(id, 'draft', page);
      persistSchoolConfigForLanding(id, { landingPageDraft: page });
      return { applied: true, templateId, draft: page };
    }

    case 'listTemplates':
      return { items: listTemplateSummaries() };

    case 'getTemplate': {
      const template = getTemplateById(payload.templateId);
      if (!template) throw new Error('Template not found');
      return { template: applyTemplate(template.id, { schoolName, portalName }) };
    }

    case 'migrateFromV1': {
      const draft = migrateLandingV1ToV2(config.landingPage, { portalName, schoolName });
      writeLandingPage(id, 'draft', draft);
      persistSchoolConfigForLanding(id, { landingPageDraft: draft });
      return { draft };
    }

    case 'uploadAsset': {
      // Mock: return data URL as-is for dev; production uses multipart on same route
      const url = payload.dataUrl || payload.url;
      if (!url) throw new Error('No image provided');
      return { url, width: null, height: null };
    }

    default:
      throw new Error(`Unknown landing page action: ${action}`);
  }
}

async function apiLandingAction(action, payload = {}, schoolId) {
  const body = { action, payload };
  if (schoolId) body.schoolId = schoolId;
  return api.post('/admin/landing-page', body);
}

/** Single entry point for all landing page builder operations. */
export async function landingPageAction(action, payload = {}, { schoolId } = {}) {
  return routeRequest({
    mockFn: () => mockLandingAction(action, payload, schoolId),
    apiFn: () => apiLandingAction(action, payload, schoolId),
  });
}

export function getPublishedLandingFromConfig(config, schoolId) {
  const id = schoolId || config?.school?.id;
  if (!id) return config?.landingPagePublished || null;
  return readLandingPage(id, 'published') || config?.landingPagePublished || null;
}

export function bootstrapEmptyLandingIfNeeded(schoolId, { schoolName, portalName } = {}) {
  if (readLandingPage(schoolId, 'draft')) return;
  const page = createEmptyLandingPage({ schoolName, portalName });
  writeLandingPage(schoolId, 'draft', page);
}
