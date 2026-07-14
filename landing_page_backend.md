# Landing Page Builder — Backend API (v2)

**Product:** Kids Activities (multi-tenant)  
**Public page:** `https://{host}/{slug}` (e.g. `/shri`)  
**Admin builder:** `/{slug}/admin/portal-settings` → **Landing Page** tab  

**Frontend (already implemented):**

| Area | Path |
|------|------|
| API client | `src/services/landingPageApi.js` |
| Block registry | `src/landing-builder/blockRegistry.js` |
| Templates (5) | `src/landing-builder/templates/index.js` |
| Laugh & Learn template | `src/landing-builder/templates/laughAndLearn.js` |
| Renderer | `src/landing-builder/LandingPageRenderer.jsx` |
| Admin UI | `src/landing-builder/admin/LandingBuilder.jsx` |
| Public page | `src/pages/public/Landing.jsx` |
| v1 → v2 migration | `src/landing-builder/migrateV1ToV2.js` |

**Related docs:** `LANDING-PAGE-BUILDER-PLAN.md`, `SCHOOL-LANDING-PAGE-GUIDE.md`  
**Not in `backend.md`** — portal branding/settings stay separate from landing v2.

---

## 1. Current status

| Layer | Status |
|-------|--------|
| Frontend builder + renderer | **Done** (12 block types incl. `gallery`) |
| Laugh & Learn template | **Done** — **9 sections** incl. Our Gallery |
| Backend `POST /admin/landing-page` | **Done** — JSON actions + multipart `uploadAsset` (≤ 100 MB) |
| `GET /portal/config` → `landingPagePublished` | **Done** — draft stripped from public response |
| Image CDN upload for builder | **Done** — multipart preferred; data URL materialized on save |
| Templates catalog | **Done** — includes `laugh-and-learn-academy` (`preserveBrand`) |

**Production:** live API via `VITE_API_URL`. Mock only when `VITE_FORCE_MOCK`, no API URL, or `VITE_API_FALLBACK_MOCK`. No silent 404/401 → localStorage fallback.

---

## 2. API design — one admin endpoint

All builder operations use **one RPC-style route**. Do **not** add separate REST paths (`/landing/publish`, `/landing/draft`, etc.).

| Method | Path | Purpose |
|--------|------|---------|
| **`POST`** | **`/api/v1/admin/landing-page`** | All builder actions (`action` field) |
| `GET` | `/api/v1/portal/config` | Public read — **published** landing only (extend existing) |

**Frontend entry point:**

```js
landingPageAction(action, payload, { schoolId })
// → POST /admin/landing-page
```

---

## 3. Auth & headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Admin actions | `Bearer {accessToken}` |
| `X-Tenant-Slug` | Yes | School workspace slug, e.g. `shri` |
| `Content-Type` | POST | `application/json` (multipart for `uploadAsset` — see §8) |

**Roles:** `SCHOOL_ADMIN`, `SUPER_ADMIN` with `manage_portal_settings`  
**Tenant isolation:** School admin uses JWT `schoolId`. Super admin passes `schoolId` in request body.

**Response envelope:**

```json
{
  "success": true,
  "data": { },
  "error": null
}
```

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message"
  }
}
```

---

## 4. `POST /admin/landing-page`

### Request (all actions)

```json
{
  "action": "getEditor",
  "schoolId": "school-1",
  "payload": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | Yes | See §5 |
| `schoolId` | string | Super admin only | Target school. Omit for school admin. |
| `payload` | object | Per action | Action-specific data |

### Actions summary

| `action` | Purpose |
|----------|---------|
| `getEditor` | Load draft, published snapshot, templates, migration status |
| `saveDraft` | Save full v2 draft (blocks, theme, SEO) |
| `publish` | Copy draft → published; set `publishedAt` |
| `discardDraft` | Revert draft to last published |
| `applyTemplate` | Replace draft from system template |
| `listTemplates` | List template metadata (optional if inlined in `getEditor`) |
| `getTemplate` | Full template JSON by `templateId` |
| `uploadAsset` | Upload section image; return CDN URL |
| `migrateFromV1` | Convert legacy `landingPage` v1 → v2 draft |

---

## 5. Action details

### 5.1 `getEditor`

**When:** Admin opens **Landing Page** in Portal Settings.

**Request:**

```json
{ "action": "getEditor", "payload": {} }
```

**Response `data`:**

```json
{
  "schoolSlug": "shri",
  "schoolName": "Shri International School",
  "publicUrl": "/shri",
  "previewUrl": "/shri?preview=1",
  "version": 2,
  "hasV1Legacy": true,
  "draft": { "version": 2, "updatedAt": "...", "theme": {}, "seo": {}, "blocks": [] },
  "published": { "version": 2, "publishedAt": "...", "theme": {}, "seo": {}, "blocks": [] },
  "isDraftDirty": true,
  "templates": [
    {
      "id": "admissions-classic",
      "name": "Admissions Classic",
      "description": "Hero, features, map, CTA, and footer",
      "thumbnailUrl": "/assets/kidsactivites-hero-placeholder.svg",
      "category": "school",
      "blockCount": 5
    }
  ]
}
```

**Notes:**

- If no draft exists, return published copy or auto-migrate from v1 `landingPage`.
- Include `templates` in this response so the builder needs one call on load.
- Frontend also calls `listTemplateSummaries()` client-side; server templates should match IDs in §12.

---

### 5.2 `saveDraft`

**Request:**

```json
{
  "action": "saveDraft",
  "payload": {
    "landingPage": {
      "version": 2,
      "theme": { "primaryColor": "#5B4BDB", "skin": "laugh-and-learn" },
      "seo": { "title": "Welcome", "description": "..." },
      "blocks": []
    }
  }
}
```

**Response `data`:**

```json
{
  "saved": true,
  "updatedAt": "2026-07-13T11:35:00Z",
  "draft": {}
}
```

**Validation:**

| Rule | Error code |
|------|------------|
| `landingPage.version` must be `2` | `INVALID_VERSION` |
| Max landing page JSON ~100 MB (URLs only — no base64 in production) | `PAYLOAD_TOO_LARGE` |
| Each block must have `id`, `type`, `layout`, `visible` | `VALIDATION_ERROR` |
| Image fields must be URLs (not base64) in production | `INVALID_ASSET_URL` |
| Max 50 blocks per page | `TOO_MANY_BLOCKS` |
| Unknown `type`/`layout` — **warn only**, store JSON as-is (forward compatible; must accept `gallery`) | — |

---

### 5.3 `publish`

**Request:** `{ "action": "publish", "payload": {} }`

**Behavior:**

1. Validate current draft (same rules as `saveDraft`).
2. Copy `landing_page_draft` → `landing_page_published`.
3. Set `publishedAt = now()`, `publishedBy = userId`.
4. Invalidate CDN/cache for public config if used.

**Response `data`:**

```json
{
  "published": true,
  "publishedAt": "2026-07-13T11:40:00Z",
  "publicUrl": "/shri",
  "published": {}
}
```

---

### 5.4 `discardDraft`

**Request:** `{ "action": "discardDraft", "payload": {} }`

**Response:** Draft reset to last `published` snapshot.

---

### 5.5 `applyTemplate`

**Request:**

```json
{
  "action": "applyTemplate",
  "payload": {
    "templateId": "laugh-and-learn-academy",
    "replaceTheme": true
  }
}
```

**Response `data`:**

```json
{
  "applied": true,
  "templateId": "laugh-and-learn-academy",
  "draft": { "version": 2, "theme": {}, "seo": {}, "blocks": [] }
}
```

**Server template rules:**

| Template ID | Behavior |
|-------------|----------|
| `laugh-and-learn-academy` | Return **fixed demo content** — do **not** replace brand name, text, or images with portal school name |
| All other templates | Merge `schoolName` into hero title and CTA title; regenerate block IDs; set SEO title from school name |

Do **not** publish until admin clicks Publish.

---

### 5.6 `listTemplates` / `getTemplate`

**`listTemplates` response:**

```json
{
  "items": [
    {
      "id": "laugh-and-learn-academy",
      "name": "Laugh & Learn Academy",
      "description": "Exact preschool demo — same images, text, and layout",
      "thumbnailUrl": "https://...",
      "category": "preschool",
      "blockCount": 8
    }
  ]
}
```

**`getTemplate` payload:** `{ "templateId": "admissions-classic" }`  
**Response:** Full `{ theme, seo, blocks }` for preview.

---

### 5.7 `migrateFromV1`

**When:** School has legacy `landingPage` (v1 sections) and no v2 draft.

**Request:** `{ "action": "migrateFromV1", "payload": {} }`

**Response:** `draft` with blocks converted from v1 hero, campusBanner, timeline, map, finalCta, footer.

**Idempotent:** If v2 draft already exists, return existing draft.

**Reference:** `src/landing-builder/migrateV1ToV2.js`

---

### 5.8 `uploadAsset`

**Option A — multipart (recommended for production):**

```
POST /admin/landing-page
Content-Type: multipart/form-data

action=uploadAsset
schoolId=school-1
blockId=blk_gallery_1
field=content.images[0].imageUrl
file=<binary>
```

**Limits (production multipart):** max **100 MB** per image file. Allowed MIME: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.

**Option B — JSON data URL (dev / local builder only):**

Frontend may send a data URL while CDN upload is unavailable; production `saveDraft` should still prefer CDN URLs and reject huge base64 bodies in persisted JSON.

```json
{
  "action": "uploadAsset",
  "payload": {
    "blockId": "blk_hero_1",
    "field": "content.heroImageUrl",
    "fileName": "campus.jpg",
    "mimeType": "image/jpeg",
    "dataUrl": "data:image/jpeg;base64,..."
  }
}
```

**Response `data`:**

```json
{
  "url": "https://cdn.example.com/tenants/shri/landing/hero-abc123.webp",
  "width": 1920,
  "height": 1080
}
```

**Reuse:** Same storage pipeline as `POST /admin/portal-settings/assets` (branding uploads).

---

## 6. Public read — extend `GET /portal/config`

Do **not** create a separate public landing endpoint. Extend the existing portal config response.

**Add to `data`:**

```json
{
  "landingPage": null,
  "landingPagePublished": {
    "version": 2,
    "publishedAt": "2026-07-13T11:40:00Z",
    "theme": {},
    "seo": {},
    "blocks": []
  }
}
```

| Field | Public | Description |
|-------|--------|-------------|
| `landingPage` | Legacy v1 | Backward compatibility |
| `landingPagePublished` | v2 published only | **Never expose draft** on public GET |

**Frontend render order (`Landing.jsx`):**

1. `landingPagePublished.version === 2` with blocks → `LandingPageRenderer`
2. Else legacy `landingPage` v1 → section renderer
3. Else → platform defaults

**Theme `skin`:** When `theme.skin === 'laugh-and-learn'`, frontend uses Laugh & Learn skin renderers for matching block layouts.

---

## 7. Preview before publish

**URL:** `GET /{slug}?preview=1`

| Approach | Phase | Description |
|----------|-------|-------------|
| Client sessionStorage | **Current (mock)** | Builder stashes draft key before opening preview tab |
| Admin session | v1 backend | Authenticated admin on public route reads draft |
| Signed token | v2 optional | `getEditor` returns short-lived JWT; public route accepts draft when token valid |

---

## 8. Data model

Store on **`portal_configs`** (or JSON column per school):

| Column | Type | Description |
|--------|------|-------------|
| `landing_page_v1` | JSONB | Legacy format (optional) |
| `landing_page_draft` | JSONB | Builder draft (v2) |
| `landing_page_published` | JSONB | Live on `/{slug}` |
| `landing_draft_updated_at` | TIMESTAMPTZ | |
| `landing_published_at` | TIMESTAMPTZ | |
| `landing_published_by` | UUID | User id |

**System templates** — table or static JSON files:

```sql
CREATE TABLE landing_page_templates (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category VARCHAR(32) DEFAULT 'school',
  theme JSONB NOT NULL,
  blocks JSONB NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Alternatively: seed from frontend template files at deploy time (same IDs as §12).

---

## 9. v2 JSON schema

### 9.1 Page root

```json
{
  "version": 2,
  "updatedAt": "2026-07-13T11:30:00Z",
  "publishedAt": "2026-07-13T11:40:00Z",
  "theme": {},
  "seo": { "title": "...", "description": "..." },
  "blocks": []
}
```

### 9.2 Theme

```json
{
  "primaryColor": "#5B4BDB",
  "secondaryColor": "#F59E0B",
  "accentColor": "#feb700",
  "tertiaryColor": "#a7391e",
  "backgroundColor": "#FFFFFF",
  "textColor": "#1E293B",
  "fontFamily": "system",
  "borderRadius": "lg",
  "skin": "laugh-and-learn",
  "preserveBrand": true
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `primaryColor`, `secondaryColor`, `backgroundColor`, `textColor` | Yes | Hex colors |
| `fontFamily` | No | `system` or `plus-jakarta` |
| `borderRadius` | No | `sm`, `md`, `lg` |
| `skin` | No | `laugh-and-learn` activates preschool skin |
| `preserveBrand` | No | When true, template brand text is not auto-replaced |

### 9.3 Block shell (all types)

```json
{
  "id": "blk_hero_1",
  "type": "hero",
  "layout": "split-playful",
  "visible": true,
  "style": {
    "backgroundColor": "#ebf5ff",
    "backgroundImageUrl": null,
    "backgroundOverlay": "rgba(0,0,0,0.45)",
    "paddingY": "xl",
    "textAlign": "center"
  },
  "content": {}
}
```

### 9.4 Block types & layouts

| `type` | Allowed `layout` values |
|--------|-------------------------|
| `hero` | `full-bleed-image`, `minimal`, `split-playful` |
| `features` | `timeline`, `grid-3`, `circular-icons`, `curriculum-grid` |
| `imageBanner` | `wide`, `contained` |
| `gallery` | `photo-grid` |
| `map` | `embed` |
| `cta` | `image-bg`, `solid-color` |
| `footer` | `default`, `rich-contact` |
| `contentSplit` | `image-left`, `image-right` |
| `bentoPair` | `default` |
| `featurePanel` | `split-card` |
| `highlights` | `dark-grid` |
| `testimonials` | `grid` |

**Registry:** `src/landing-builder/blockRegistry.js`

Backend validators must accept **`gallery`** (and all types above) as opaque JSON — store and return without stripping unknown content fields.

### 9.5 Content shapes (by type)

#### `hero` (layout `split-playful` — Laugh & Learn header + hero)

```json
{
  "brandName": "Laugh and Learn Academy",
  "badge": "LAUGH AND LEARN ACADEMY",
  "title": "Learn skills and be confident while",
  "titleHighlight": "sharing a laugh",
  "titleSuffix": "with friends!",
  "subtitle": "...",
  "logoUrl": "https://...",
  "heroImageUrl": "https://...",
  "primaryButton": { "label": "Schedule a Visit", "href": "/enrollment/kidzee-print-form" },
  "secondaryButton": { "label": "Explore Programs", "href": "#curriculum" },
  "showPrimaryButton": true,
  "showSecondaryButton": true,
  "navLinks": [
    { "label": "Home", "href": "#home" },
    { "label": "Gallery", "href": "#gallery" },
    { "label": "Reviews", "href": "#reviews" }
  ],
  "loginLabel": "Login",
  "loginHref": "/login",
  "enrollLabel": "Enroll Now",
  "enrollHref": "/enrollment/kidzee-print-form"
}
```

> **Login / Enroll buttons** are stored in hero `content` — no separate API. Paths are tenant-relative (`/login`, `/enrollment/...`).  
> **Gallery** nav targets section id `#gallery` (block type `gallery`).

#### `hero` (layout `full-bleed-image` — standard)

```json
{
  "badge": "Admissions Open",
  "title": "School Name",
  "subtitle": "...",
  "primaryButton": { "label": "Start Enrollment", "href": "/enrollment/kidzee-print-form" },
  "secondaryButton": { "label": "Parent Login", "href": "/login" },
  "showPrimaryButton": true,
  "showSecondaryButton": true
}
```

#### `features`

```json
{
  "title": "...",
  "subtitle": "...",
  "items": [
    { "id": "...", "title": "...", "description": "...", "imageUrl": "...", "icon": "shield" }
  ]
}
```

For `curriculum-grid`: items use Material icon names (`diversity_3`, `science`, etc.).

#### `contentSplit`

```json
{
  "title": "Our Philosophy",
  "body": ["paragraph 1", "paragraph 2"],
  "quote": "Optional pull quote",
  "imageUrl": "https://..."
}
```

#### `bentoPair`

```json
{
  "cards": [
    {
      "id": "...",
      "icon": "visibility",
      "title": "Our Vision",
      "description": "...",
      "imageUrl": "https://...",
      "variant": "primary"
    }
  ]
}
```

#### `featurePanel`

```json
{
  "title": "The Learning Environment",
  "description": "...",
  "imageUrl": "https://...",
  "highlights": [
    { "icon": "deck", "title": "Indoor Spaces", "description": "..." }
  ]
}
```

#### `highlights`

```json
{
  "title": "What To Expect From Us",
  "subtitle": "...",
  "items": [
    { "id": "...", "icon": "favorite", "title": "...", "description": "..." }
  ]
}
```

#### `gallery` (layout `photo-grid` — Our Gallery)

Section id on public page: `#gallery`. Default layout is **3 columns × 3 rows** (9 images). `columns` may be `3` or `4`.

```json
{
  "title": "Our Gallery",
  "subtitle": "A glimpse into our classrooms, play areas, and happy moments.",
  "columns": 3,
  "images": [
    { "id": "gal_1", "imageUrl": "https://cdn.example.com/.../campus-1.webp", "alt": "Happy children learning together" },
    { "id": "gal_2", "imageUrl": "https://cdn.example.com/.../campus-2.webp", "alt": "Classroom" },
    { "id": "gal_3", "imageUrl": "https://cdn.example.com/.../campus-3.webp", "alt": "" }
  ]
}
```

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Section heading |
| `subtitle` | string | Optional |
| `columns` | number | `3` or `4` |
| `images` | array | Dynamic list; admin can add/remove/upload |
| `images[].id` | string | Required |
| `images[].imageUrl` | string \| null | CDN URL after `uploadAsset` |
| `images[].alt` | string | Accessibility text |

#### `testimonials`

```json
{
  "title": "What Our Parents Say",
  "rating": 5,
  "items": [
    { "id": "...", "quote": "...", "name": "...", "role": "Happy Parent", "avatar": "https://..." }
  ]
}
```

#### `footer` (layout `rich-contact`)

Quick Links are **dynamic** (`links[]`) — labels and hrefs are edited in the builder. Laugh & Learn default:

```json
{
  "compact": false,
  "brandName": "Laugh and Learn Academy",
  "tagline": "...",
  "address": "Frisco, TX",
  "email": "...",
  "phone": "...",
  "copyrightYear": 2024,
  "badges": ["LICENSED DAYCARE", "CPR CERTIFIED"],
  "socialLinks": [{ "icon": "face_nod", "href": "#" }],
  "links": [
    { "label": "Home", "href": "#home" },
    { "label": "Gallery", "href": "#gallery" },
    { "label": "Curriculum", "href": "#curriculum" }
  ]
}
```

---

## 10. Error codes

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Invalid block schema |
| `INVALID_VERSION` | 400 | `version !== 2` |
| `INVALID_ACTION` | 400 | Unknown `action` |
| `PAYLOAD_TOO_LARGE` | 413 | JSON draft or multipart body too large |
| `INVALID_ASSET_URL` | 400 | Invalid / missing image URL in production save |
| `TOO_MANY_BLOCKS` | 400 | > 50 blocks |
| `TEMPLATE_NOT_FOUND` | 404 | Bad `templateId` |
| `FORBIDDEN` | 403 | Wrong school / role |
| `NO_DRAFT` | 404 | publish with empty draft |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 11. Backend implementation checklist

### Controller

```text
POST /admin/landing-page
  switch (action):
    getEditor      → LandingPageService.getEditor(schoolId, user)
    saveDraft      → LandingPageService.saveDraft(schoolId, payload)
    publish        → LandingPageService.publish(schoolId, user)
    discardDraft   → LandingPageService.discardDraft(schoolId)
    applyTemplate  → LandingPageService.applyTemplate(schoolId, templateId, options)
    listTemplates  → LandingPageService.listTemplates()
    getTemplate    → LandingPageService.getTemplate(templateId, schoolContext)
    uploadAsset    → LandingPageService.uploadAsset(schoolId, file, meta)
    migrateFromV1  → LandingPageService.migrateFromV1(schoolId)
```

### Service layers

| Layer | Responsibility |
|-------|----------------|
| `LandingPageService` | Draft / publish business logic |
| `LandingPageValidator` | JSON schema / block validation (flexible on unknown fields) |
| `LandingPageMigrationService` | v1 → v2 conversion (mirror `migrateV1ToV2.js`) |
| `LandingTemplateCatalog` | Predefined templates (§12) |
| `PortalConfigService` | Extend public `GET /portal/config` with `landingPagePublished` |

### Recommended build order

```
1. DB columns (draft + published)
2. GET /portal/config → add landingPagePublished
3. POST /admin/landing-page → getEditor, saveDraft, publish
4. uploadAsset (reuse portal-settings asset storage)
5. applyTemplate + listTemplates (seed §12)
6. migrateFromV1 (schools with legacy landingPage)
7. Preview token (optional)
```

---

## 12. Predefined templates (seed)

| ID | Name | Blocks | Notes |
|----|------|--------|-------|
| `admissions-classic` | Admissions Classic | 5 | Hero, features, map, CTA, footer |
| `admissions-minimal` | Minimal Clean | 3 | Hero, CTA, footer |
| `single-cta` | One Page Enroll | 2 | Hero + CTA |
| `photo-gallery-focus` | Photo Gallery Focus | 4 | No map section |
| `laugh-and-learn-academy` | Laugh & Learn Academy | **9** | Fixed demo brand; `theme.skin = laugh-and-learn`; includes **Our Gallery** |

### 12.1 Laugh & Learn Academy — 9 sections (seed order)

| # | Block `type` | Layout | Section id / role |
|---|--------------|--------|-------------------|
| 1 | `hero` | `split-playful` | `#home` + header nav (Home, Gallery, Reviews) + Login / Enroll Now |
| 2 | `features` | `curriculum-grid` | `#curriculum` |
| 3 | `contentSplit` | `image-left` | Our Philosophy |
| 4 | `bentoPair` | `default` | Vision & Mission |
| 5 | `featurePanel` | `split-card` | Learning Environment |
| 6 | `highlights` | `dark-grid` | What To Expect |
| 7 | `gallery` | `photo-grid` | `#gallery` — Our Gallery (3 cols × 3 rows images) |
| 8 | `testimonials` | `grid` | `#reviews` |
| 9 | `footer` | `rich-contact` | Quick Links: Home, Gallery, Curriculum |

**Seed rules:**

- Do **not** replace brand name / demo text / images with portal school name (`preserveBrand: true`).
- Footer Quick Links default: `Home → #home`, `Gallery → #gallery`, `Curriculum → #curriculum`.
- `getEditor.templates[]` / `listTemplates` must report `blockCount: 9` for this template.

**Frontend catalog:** `src/landing-builder/templates/index.js`  
**Laugh & Learn full JSON:** `src/landing-builder/templates/laughAndLearn.js`

---

## 13. Relationship to other APIs

| Existing API | Change |
|--------------|--------|
| `GET /portal/config` | Add `landingPagePublished` (required) |
| `POST /admin/landing-page` | **New** — all builder actions |
| `PUT /admin/portal-settings` | Branding, menus, enrollment — **not** landing v2 |
| `POST /admin/portal-settings/assets` | Reuse storage for `uploadAsset` |
| `landingPage` in PUT (v1) | Deprecated; use `migrateFromV1` once |

**No backend work needed for:**

- Login / Enroll buttons in header — hero block JSON (`loginLabel`, `loginHref`, `enrollLabel`, `enrollHref`)
- Footer Quick Link labels — footer `links[]` JSON (editable in builder)
- Gallery image grid UI — frontend only; backend stores `gallery` block JSON + image URLs
- Separate public landing route — uses existing `GET /portal/config`
- Template rendering / skin CSS — frontend only (`LandingPageRenderer.jsx`, `laughAndLearnRenderers.jsx`)

---

## 14. Admin UI → API flow

```
1. Open Landing Page tab     → POST { action: "getEditor" }
2. Edit blocks / images      → POST { action: "uploadAsset" } per image
3. Save draft                → POST { action: "saveDraft", payload: { landingPage } }
4. Preview                   → /{slug}?preview=1
5. Publish                   → POST { action: "publish" }
   → Live at /{slug} via GET /portal/config → landingPagePublished
```

---

*Document version: 2.2 — July 2026 (backend implemented: Laugh & Learn seed, multipart uploadAsset 100 MB, landingPagePublished on public config)*
