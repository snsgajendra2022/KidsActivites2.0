# Landing Page Builder — Backend API

**Product:** Kids Activities (multi-tenant)  
**Public page:** `http://localhost:3000/{slug}` (e.g. `/shri`)  
**Admin builder:** `/{slug}/admin/portal-settings` → **Landing Page** tab  

**Related:** `LANDING-PAGE-BUILDER-PLAN.md`, `SCHOOL-LANDING-PAGE-GUIDE.md`, `backend.md` (portal config only — not duplicated here)

---

## 1. Design — one admin endpoint

All builder operations use **one RPC-style route**. Do **not** add separate REST paths such as `/landing/publish`, `/landing/draft`, or `/landing/templates`.

| Method | Path | Purpose |
|--------|------|---------|
| **`POST`** | **`/admin/landing-page`** | All builder actions (`action` field) |
| `GET` | `/portal/config` | Public read — **published** landing only (extend existing) |

**Frontend mock / client:** `src/services/landingPageApi.js` → `landingPageAction(action, payload, { schoolId })`

---

## 2. Auth & headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Admin actions | `Bearer {accessToken}` |
| `X-Tenant-Slug` | Yes | School workspace slug, e.g. `shri` |
| `Content-Type` | POST | `application/json` (multipart for `uploadAsset` — see §7) |

**Roles:** `SCHOOL_ADMIN`, `SUPER_ADMIN` with `manage_portal_settings`  
**Tenant isolation:** School admin uses JWT `schoolId`. Super admin passes `schoolId` in the request body.

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

## 3. `POST /admin/landing-page`

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
| `action` | string | Yes | See §4 |
| `schoolId` | string | Super admin | Target school. Omit for school admin. |
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

**Mock function:** `landingPageAction(action, payload, schoolId)` in `src/services/landingPageApi.js`

---

## 4. Action details

### 4.1 `getEditor`

**When:** Admin opens **Landing Page** in Portal Settings.

**Request:**

```json
{
  "action": "getEditor",
  "payload": {}
}
```

**Response `200` `data`:**

```json
{
  "schoolSlug": "shri",
  "schoolName": "Shri International School",
  "publicUrl": "/shri",
  "previewUrl": "/shri?preview=1",
  "version": 2,
  "hasV1Legacy": true,
  "draft": {
    "version": 2,
    "updatedAt": "2026-07-13T11:30:00Z",
    "theme": {
      "primaryColor": "#5B4BDB",
      "secondaryColor": "#F59E0B",
      "backgroundColor": "#FFFFFF",
      "textColor": "#1E293B",
      "fontFamily": "system",
      "borderRadius": "lg"
    },
    "seo": {
      "title": "Shri School — Admissions",
      "description": "Enroll online today."
    },
    "blocks": []
  },
  "published": {
    "version": 2,
    "publishedAt": "2026-07-12T09:00:00Z",
    "theme": {},
    "blocks": []
  },
  "isDraftDirty": true,
  "templates": [
    {
      "id": "admissions-classic",
      "name": "Admissions Classic",
      "description": "Hero + features + map + CTA",
      "thumbnailUrl": "/assets/templates/admissions-classic.png",
      "category": "school",
      "blockCount": 5
    }
  ]
}
```

**Notes:**

- If no draft exists, return published copy or auto-migrate from v1 `landingPage`.
- Include `templates` in this response so the builder needs one call on load.

---

### 4.2 `saveDraft`

**Request:**

```json
{
  "action": "saveDraft",
  "payload": {
    "landingPage": {
      "version": 2,
      "theme": { "primaryColor": "#5B4BDB" },
      "seo": { "title": "Welcome", "description": "..." },
      "blocks": [
        {
          "id": "blk_hero_1",
          "type": "hero",
          "layout": "full-bleed-image",
          "visible": true,
          "style": {
            "backgroundImageUrl": "https://cdn.example.com/hero.jpg",
            "backgroundOverlay": "rgba(0,0,0,0.45)",
            "paddingY": "xl",
            "textAlign": "center"
          },
          "content": {
            "badge": "Admissions Open",
            "title": "Welcome to Shri School",
            "subtitle": "Enroll online in minutes.",
            "primaryButton": { "label": "Start Enrollment", "href": "/enrollment/kidzee-print-form" },
            "secondaryButton": { "label": "Parent Login", "href": "/login" },
            "showPrimaryButton": true,
            "showSecondaryButton": true
          }
        }
      ]
    }
  }
}
```

**Response `200` `data`:**

```json
{
  "saved": true,
  "updatedAt": "2026-07-13T11:35:00Z",
  "draft": { }
}
```

**Validation:**

| Rule | Error code |
|------|------------|
| `landingPage.version` must be `2` | `INVALID_VERSION` |
| Max JSON size ~500 KB | `PAYLOAD_TOO_LARGE` |
| Each block must have `id`, `type`, `layout` | `VALIDATION_ERROR` |
| Image fields must be URLs (not base64) | `INVALID_ASSET_URL` |
| Max 50 blocks per page | `TOO_MANY_BLOCKS` |

---

### 4.3 `publish`

**Request:**

```json
{
  "action": "publish",
  "payload": {}
}
```

**Behavior:**

1. Validate current draft (same rules as `saveDraft`).
2. Copy `landing_page_draft` → `landing_page_published`.
3. Set `publishedAt = now()`, `publishedBy = userId`.
4. Invalidate CDN/cache for public config if used.

**Response `200` `data`:**

```json
{
  "published": true,
  "publishedAt": "2026-07-13T11:40:00Z",
  "publicUrl": "/shri",
  "published": { }
}
```

---

### 4.4 `discardDraft`

**Request:**

```json
{
  "action": "discardDraft",
  "payload": {}
}
```

**Response:** Draft reset to last `published` snapshot.

---

### 4.5 `applyTemplate`

**Request:**

```json
{
  "action": "applyTemplate",
  "payload": {
    "templateId": "admissions-classic",
    "replaceTheme": true
  }
}
```

**Response `200` `data`:**

```json
{
  "applied": true,
  "templateId": "admissions-classic",
  "draft": {
    "version": 2,
    "theme": {},
    "blocks": []
  }
}
```

**Server:** Load template from DB or static catalog. Merge school name into hero title. Do **not** publish until admin clicks Publish.

---

### 4.6 `listTemplates` / `getTemplate`

**`listTemplates` response:**

```json
{
  "items": [
    {
      "id": "admissions-classic",
      "name": "Admissions Classic",
      "description": "Hero + features + map + CTA",
      "thumbnailUrl": "/assets/templates/admissions-classic.png",
      "category": "school",
      "blockCount": 5
    }
  ]
}
```

**`getTemplate` payload:** `{ "templateId": "admissions-classic" }`  
**Response:** Full `{ theme, blocks }` for preview.

---

### 4.7 `migrateFromV1`

**When:** School has legacy `landingPage` (v1 sections) and no v2 draft.

**Request:**

```json
{
  "action": "migrateFromV1",
  "payload": {}
}
```

**Response:** `draft` with blocks converted from v1 hero, timeline, map, finalCta, footer.

**Idempotent:** If v2 draft already exists, return existing draft.

---

### 4.8 `uploadAsset`

**Option A — multipart (recommended):**

```
POST /admin/landing-page
Content-Type: multipart/form-data

action=uploadAsset
schoolId=school-1
blockId=blk_hero_1
field=style.backgroundImageUrl
file=<binary>
```

**Option B — JSON base64 (dev / small images only, &lt; 500 KB):**

```json
{
  "action": "uploadAsset",
  "payload": {
    "blockId": "blk_hero_1",
    "field": "content.items[0].imageUrl",
    "fileName": "campus.jpg",
    "mimeType": "image/jpeg",
    "dataUrl": "data:image/jpeg;base64,..."
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "url": "https://cdn.example.com/tenants/shri/landing/hero-abc123.webp",
    "width": 1920,
    "height": 1080
  }
}
```

**Reuse:** Same storage pipeline as `POST /admin/portal-settings/assets` (branding uploads).

---

## 5. Public read — extend `GET /portal/config`

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

**Frontend (`Landing.jsx`):**

1. If `landingPagePublished?.version === 2` with blocks → `LandingPageRenderer`
2. Else if `landingPage` v1 → legacy section renderer
3. Else → defaults

---

## 6. Preview before publish

**URL:** `GET /{slug}?preview=1`

| Approach | Description |
|----------|-------------|
| **Admin session** | Authenticated admin on public route reads draft (recommended for mock) |
| **Signed token** | `getEditor` returns short-lived JWT; public route accepts draft when token valid |
| **Client sessionStorage** | Current mock: builder stashes draft before opening preview tab |

---

## 7. Data model

Store on **`portal_configs`** (or JSON column per school):

| Column | Type | Description |
|--------|------|-------------|
| `landing_page_v1` | JSONB | Legacy format (optional) |
| `landing_page_draft` | JSONB | Builder draft (v2) |
| `landing_page_published` | JSONB | Live on `/{slug}` |
| `landing_draft_updated_at` | TIMESTAMP | |
| `landing_published_at` | TIMESTAMP | |
| `landing_published_by` | UUID | User id |

**System templates** — table or static JSON:

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

**Block types:** `hero`, `features`, `imageBanner`, `map`, `cta`, `footer`  
**Frontend registry:** `src/landing-builder/blockRegistry.js`

---

## 8. Error codes

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Invalid block schema |
| `INVALID_ACTION` | 400 | Unknown `action` |
| `PAYLOAD_TOO_LARGE` | 413 | JSON &gt; 500 KB |
| `INVALID_ASSET_URL` | 400 | Base64 in saveDraft |
| `TOO_MANY_BLOCKS` | 400 | &gt; 50 blocks |
| `TEMPLATE_NOT_FOUND` | 404 | Bad `templateId` |
| `FORBIDDEN` | 403 | Wrong school / role |
| `NO_DRAFT` | 404 | publish with empty draft |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 9. Backend implementation

### Controller

```text
POST /admin/landing-page
  switch (action):
    getEditor      → LandingPageService.getEditor(schoolId, user)
    saveDraft      → LandingPageService.saveDraft(schoolId, payload)
    publish        → LandingPageService.publish(schoolId, user)
    discardDraft   → LandingPageService.discardDraft(schoolId)
    applyTemplate  → LandingPageService.applyTemplate(schoolId, templateId)
    listTemplates  → LandingPageService.listTemplates()
    getTemplate    → LandingPageService.getTemplate(templateId)
    uploadAsset    → LandingPageService.uploadAsset(schoolId, file, meta)
    migrateFromV1  → LandingPageService.migrateFromV1(schoolId)
```

### Service layers

| Layer | Responsibility |
|-------|----------------|
| `LandingPageService` | Draft / publish business logic |
| `LandingPageValidator` | JSON schema / block validation |
| `LandingPageMigrationService` | v1 → v2 conversion |
| `LandingTemplateCatalog` | Predefined templates |
| `PortalConfigService` | Extend public `GET /portal/config` |

---

## 10. Relationship to other APIs

| Existing | Change |
|----------|--------|
| `GET /portal/config` | Add `landingPagePublished` |
| `PUT /admin/portal-settings` | Branding, menus, enrollment — **not** landing v2 |
| `POST /admin/portal-settings/assets` | Reuse storage for `uploadAsset` |
| `landingPage` in PUT (v1) | Deprecated; use `migrateFromV1` once |

---

## 11. Predefined templates (seed)

| ID | Name |
|----|------|
| `admissions-classic` | Admissions Classic |
| `admissions-minimal` | Minimal Clean |
| `single-cta` | One Page Enroll |
| `photo-gallery-focus` | Photo Gallery Focus |

**Frontend catalog:** `src/landing-builder/templates/index.js`

---

## 12. Admin UI → API flow

```
1. Open Landing Page tab     → POST { action: "getEditor" }
2. Edit blocks / images      → POST { action: "uploadAsset" } per image
3. Save draft                → POST { action: "saveDraft", payload: { landingPage } }
4. Preview                   → /{slug}?preview=1
5. Publish                   → POST { action: "publish" }
   → Live at http://localhost:3000/{slug}/
```

---

*Document version: 1.0 — July 2026*
