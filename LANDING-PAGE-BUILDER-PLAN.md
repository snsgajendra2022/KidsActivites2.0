# Landing Page Builder — Full Implementation Plan

**Product:** Kids Activities (multi-tenant)  
**Goal:** School admins can design `http://localhost:3000/{slug}` like a visual page builder — drag sections, pick templates, change colors, images, text, layouts — without developer help.

**Related:** `SCHOOL-LANDING-PAGE-GUIDE.md` (what exists today), `landingpage.md` (current section text)

---

## 1. What you have today vs what you want

| Feature | Today | You want |
|---------|-------|----------|
| Per-school URL `/{slug}` | ✅ Yes | ✅ Keep |
| Edit text per section | ✅ Yes (forms in Portal Settings) | ✅ + inline / visual |
| Upload images | ✅ Yes (hero, campus, timeline, CTA) | ✅ Any section |
| Turn sections on/off | ✅ Yes (6 fixed types) | ✅ Unlimited sections |
| **Reorder sections (drag)** | ❌ Fixed order in code | ✅ Mouse drag |
| **Add / cut any section** | ❌ Only 6 predefined | ✅ Add, duplicate, delete |
| **Custom layouts** (circles, grids, split) | ❌ Fixed components | ✅ Per-section layout |
| **Background image per section** | ⚠️ Only some sections | ✅ Every section |
| **Colors / theme picker** | ⚠️ Global branding only | ✅ Per-page + per-section |
| **Predefined templates** | ❌ One default layout | ✅ Gallery → click → apply |
| **Live preview while editing** | ❌ Save then open `/shri` | ✅ Split screen preview |
| **Draw / freeform layout** | ❌ Not supported | ⚠️ Phase 3 (advanced) |

**Conclusion:** You need a **Landing Page Builder** (block-based CMS), not just more form fields. This is a **large feature** — plan it in phases.

---

## 2. Recommended approach (industry pattern)

Use a **block-based page builder**:

```
Page = ordered list of Blocks
Each Block = { type, layout, style, content }
Templates = saved list of blocks (starter pages)
```

Same idea as: Webflow sections, Notion blocks, WordPress Gutenberg, Framer.

**Do NOT** build a full “draw anything on canvas” tool in v1 — that takes years. Instead:

1. **Phase 1–2:** Drag predefined **section blocks** with **layout variants** (hero full-width, hero split, timeline grid, circular features, image + text row, etc.)
2. **Phase 3:** Optional freeform overlay (position elements %) — only if needed

This gives 90% of what schools need with reasonable effort.

---

## 3. High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Admin: /{slug}/admin/portal-settings → Landing Builder      │
│  ┌──────────────┬──────────────────────────────────────────┐ │
│  │ Block palette│  Canvas (drag reorder) + Live preview     │ │
│  │ Templates    │  Section inspector (text, image, colors)  │ │
│  └──────────────┴──────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │ Save JSON
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  API: POST /admin/landing-page  (action: saveDraft|publish)  │
│  Public: GET /portal/config → landingPagePublished           │
└────────────────────────────┬────────────────────────────────┘
                             │ Load by slug
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Public: /{slug}  →  LandingPageRenderer.jsx                 │
│  maps blocks[] → React components (HeroBlock, GridBlock, …)  │
└─────────────────────────────────────────────────────────────┘
```

### New files (planned)

| Path | Purpose |
|------|---------|
| `src/landing-builder/types.js` | Block + theme TypeScript/JSDoc types |
| `src/landing-builder/blockRegistry.js` | All block types + layout variants |
| `src/landing-builder/templates/` | Predefined template JSON files |
| `src/landing-builder/LandingPageRenderer.jsx` | Public page from `blocks[]` |
| `src/landing-builder/admin/LandingBuilder.jsx` | Main builder UI |
| `src/landing-builder/admin/BlockCanvas.jsx` | Drag-and-drop list |
| `src/landing-builder/admin/BlockInspector.jsx` | Edit selected block |
| `src/landing-builder/admin/TemplateGallery.jsx` | Pick template |
| `src/landing-builder/blocks/*.jsx` | One file per block type |

---

## 4. Data model (JSON stored per school)

Keep **backward compatibility**: if `landingPageV2` is missing, render old `landingPage` (current system).

### 4.1 Page document

```json
{
  "version": 2,
  "publishedAt": "2026-07-13T12:00:00Z",
  "theme": {
    "primaryColor": "#5B4BDB",
    "secondaryColor": "#F59E0B",
    "backgroundColor": "#FFFFFF",
    "textColor": "#1E293B",
    "fontFamily": "system",
    "borderRadius": "lg"
  },
  "blocks": [
    {
      "id": "blk_hero_1",
      "type": "hero",
      "layout": "full-bleed-image",
      "visible": true,
      "style": {
        "backgroundImageUrl": "https://cdn.../hero.jpg",
        "backgroundOverlay": "rgba(0,0,0,0.45)",
        "paddingY": "xl",
        "textAlign": "center"
      },
      "content": {
        "badge": "Admissions Open 2026",
        "title": "Welcome to Shri School",
        "subtitle": "Enroll online in minutes.",
        "primaryButton": { "label": "Start Enrollment", "href": "/enroll" },
        "secondaryButton": { "label": "Parent Login", "href": "/login" }
      }
    },
    {
      "id": "blk_features_1",
      "type": "features",
      "layout": "circular-icons",
      "visible": true,
      "style": {
        "backgroundColor": "#F8FAFC",
        "paddingY": "lg"
      },
      "content": {
        "title": "Why Choose Us",
        "subtitle": "Everything parents need in one place",
        "items": [
          {
            "id": "f1",
            "title": "Secure",
            "description": "Protected student data",
            "imageUrl": null,
            "icon": "shield"
          }
        ]
      }
    }
  ]
}
```

### 4.2 Block types (v1 palette)

| `type` | Layout variants | Content fields |
|--------|-----------------|----------------|
| `hero` | `full-bleed-image`, `split-image-right`, `split-image-left`, `minimal` | badge, title, subtitle, 2 buttons, bg image |
| `rich-text` | `single-column`, `two-column` | title, body (markdown or rich text) |
| `image-banner` | `wide`, `contained` | image, title, subtitle |
| `features` | `timeline`, `grid-3`, `grid-4`, **`circular-icons`** | title, list of items (icon/image/title/text) |
| `stats` | `row`, `cards` | numbers + labels |
| `testimonials` | `carousel`, `grid` | quotes, names, photos |
| `gallery` | `grid`, `masonry` | images[] |
| `map` | `embed`, `image-fallback` | title, embed URL, address |
| `cta` | `image-bg`, `solid-color` | title, subtitle, button |
| `faq` | `accordion` | Q&A pairs |
| `spacer` | `sm`, `md`, `lg` | height only |
| `divider` | `line`, `wave` | color |
| `footer` | `default` | links, contact (or use global branding) |

### 4.3 Template document

```json
{
  "id": "template-admissions-classic",
  "name": "Admissions Classic",
  "thumbnailUrl": "/assets/templates/admissions-classic.png",
  "category": "school",
  "theme": { "...": "..." },
  "blocks": [ "...copy of blocks array..." ]
}
```

Applying a template **replaces** current draft blocks (with confirm dialog).

---

## 5. Admin UI — how it should feel

### 5.1 Three-panel builder (like Canva / Webflow lite)

```
┌────────────┬─────────────────────────────┬──────────────┐
│  LEFT      │  CENTER                     │  RIGHT       │
│            │                             │              │
│ Templates  │  [ Live preview of /shri ]  │  Inspector   │
│ + Blocks   │  or drag list of sections   │  (selected   │
│   library  │                             │   block)     │
│            │  ≡ Hero          [↑][↓][×]  │              │
│  [Hero]    │  ≡ Features      [↑][↓][×]  │  Title: ___  │
│  [Gallery] │  ≡ Map           [↑][↓][×]  │  Image: [↑]  │
│  [CTA]     │  + Add section              │  Color: [■]  │
└────────────┴─────────────────────────────┴──────────────┘
     [ Save draft ]  [ Preview ]  [ Publish ]
```

### 5.2 Interactions

| Action | Behavior |
|--------|----------|
| Drag section | Reorder `blocks[]` (use `@dnd-kit/core` or `react-beautiful-dnd`) |
| Click section | Select → inspector shows fields |
| Delete (×) | Remove block from array |
| Duplicate | Clone block with new `id` |
| Add from palette | Append new block with defaults |
| Template click | Replace blocks + theme (confirm) |
| Theme tab | Global colors, fonts (applies to all blocks unless overridden) |
| Preview | Opens `/{slug}?preview=1` or iframe in builder |
| Publish | Sets `publishedAt`, public site uses published version |

### 5.3 Images

- Upload → existing `portalConfigService` image upload (same as today)
- Store CDN URL in block `content` / `style`
- Optional: image library per school (reuse uploaded assets)

---

## 6. Public renderer

Replace hardcoded order in `Landing.jsx` with:

```javascript
function LandingPageRenderer({ page, branding, enrollPath, loginPath }) {
  return page.blocks.filter(b => b.visible).map(block => {
    const Component = BLOCK_REGISTRY[block.type]?.[block.layout] ?? FallbackBlock;
    return <Component key={block.id} block={block} theme={page.theme} ... />;
  });
}
```

Each block component reads `block.content` + `block.style` + merges `page.theme`.

**Mobile:** All layouts must be responsive (stack on small screens).

---

## 7. Predefined templates (starter set)

Build **6–8 templates** as JSON + thumbnail PNG:

| Template ID | Name | Best for |
|-------------|------|----------|
| `admissions-classic` | Admissions Classic | Default school (current look) |
| `admissions-minimal` | Minimal Clean | Small preschool |
| `activity-sports` | Sports & Activities | After-school programs |
| `montessori-warm` | Warm Montessori | Soft colors, large photos |
| `modern-dark` | Modern Dark Hero | Premium / international |
| `video-hero` | Video Hero | Video background header |
| `single-cta` | One Page Enroll | Only hero + CTA + footer |
| `photo-gallery` | Photo Gallery Focus | Showcase campus photos |

**Admin flow:** Templates tab → grid of thumbnails → **Use this template** → editor opens with blocks pre-filled → school replaces text/images/colors.

---

## 8. Multi-tenant handling

| Concern | Solution |
|---------|----------|
| Each school own page | `landingPageV2` in portal config keyed by `tenantId` / slug |
| Draft vs published | `landingPageDraft` + `landingPagePublished` OR single doc with `status` |
| Preview without publish | `GET /{slug}?previewToken=...` or admin-only iframe |
| Super admin | Can view all schools’ landing URLs from Schools list |
| Migration | On first open of builder, convert old `landingPage` → `blocks[]` automatically |

### Migration from current format

```javascript
function migrateLandingV1ToV2(oldLanding, school) {
  const blocks = [];
  if (oldLanding.sections?.hero !== false) blocks.push({ type: 'hero', content: oldLanding.hero, ... });
  if (oldLanding.sections?.timeline !== false) blocks.push({ type: 'features', layout: 'timeline', ... });
  // ... map, finalCta, footer
  return { version: 2, theme: defaultTheme(school), blocks };
}
```

---

## 9. Technology choices (React stack you already use)

| Need | Recommendation |
|------|----------------|
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` (modern, maintained) |
| Rich text | `@tiptap/react` or simple textarea + markdown in v1 |
| Color picker | `<input type="color">` + presets, or `react-colorful` |
| State in builder | `useReducer` or Zustand for draft page |
| Preview iframe | Same origin `/{slug}?builderPreview=1` |
| Image upload | Reuse `portalConfigService` + `readFileAsDataUrl` |
| Validation | Zod schema for `landingPageV2` before save |

**Avoid in v1:** Full canvas (Fabric.js/Konva) for free drawing — high complexity, poor mobile UX.

---

## 10. Backend / API — single endpoint (see full contract)

**Full spec:** [landing_page_backend.md](./landing_page_backend.md)

| Concern | Solution |
|---------|----------|
| All builder operations | **One API:** `POST /admin/landing-page` with `action` field |
| Public page at `/{slug}` | Extend existing **`GET /portal/config`** → `landingPagePublished` |
| Save draft | `action: "saveDraft"` |
| Publish live | `action: "publish"` |
| Templates | `action: "applyTemplate"` or `listTemplates` |
| Image upload | `action: "uploadAsset"` (multipart on same route) |
| No API sprawl | Do **not** create separate publish/draft/template routes |

Store images in existing file storage (S3/local) — **never** store large base64 in JSON long-term (upload via `uploadAsset`, store URL only).

---

## 11. Phased rollout (realistic timeline)

### Phase 1 — Foundation (2–3 weeks)

- [ ] Define `landingPageV2` schema + migration from v1
- [ ] `LandingPageRenderer` + 4 block types: `hero`, `features`, `cta`, `footer`
- [ ] Reorder blocks (up/down buttons first; drag in Phase 2)
- [ ] Save / load from portal config
- [ ] Public `/{slug}` uses v2 if present

**Deliverable:** Schools can reorder sections and edit content; still limited block types.

### Phase 2 — Builder UI + templates (3–4 weeks)

- [ ] Full builder page in Portal Settings
- [ ] Drag-and-drop canvas (`@dnd-kit`)
- [ ] Add / delete / duplicate blocks
- [ ] Block inspector (text, image, colors per section)
- [ ] Global theme picker
- [ ] 6 predefined templates + apply template
- [ ] Live preview panel
- [ ] Draft + Publish

**Deliverable:** What you described — visual editor without freeform draw.

### Phase 3 — Advanced layouts (3–4 weeks)

- [ ] More block types: gallery, FAQ, testimonials, stats, video hero
- [ ] Layout variants: circular icons, split hero, masonry gallery
- [ ] Per-section background image + overlay
- [ ] Image asset library per school
- [ ] Undo / redo in builder

### Phase 4 — Polish (optional, 2+ weeks)

- [ ] Custom CSS per school (super admin only)
- [ ] A/B or scheduled publish
- [ ] Analytics (section scroll depth)
- [ ] Freeform section (absolute positioning) — only if customers demand it

**Total rough estimate:** 10–14 weeks for Phases 1–3 with one experienced frontend developer.

---

## 12. “Circular layout” and “draw sections” — what’s realistic

### Circular icons layout (do in Phase 3)

Features block with `layout: "circular-icons"`:

- Row of circles (image or icon inside)
- Title + description below each
- Pure CSS grid / flex — no canvas drawing

### “Draw any layout” (Phase 4 or never)

True drag-resize on a 2D canvas is a **different product** (like Figma). For school landing pages, **preset layouts** cover almost all cases:

- Full width hero
- 50/50 image + text
- 3-column cards
- Circular features
- Bento grid (Phase 3)

Recommend: sell **layout variants**, not infinite drawing.

---

## 13. Admin user journey (step by step)

1. School admin opens `/{slug}/admin/portal-settings` → **Landing Builder** (new tab).
2. Clicks **Templates** → chooses “Admissions Classic”.
3. Preview loads in center; edits headline in right panel.
4. Drags **Map** section above **Features**.
5. Adds **Gallery** block from left palette; uploads 6 campus photos.
6. Opens **Theme** → sets primary color to school purple.
7. Clicks **Preview** → sees `/{slug}?preview=1`.
8. Clicks **Publish** → parents see new page at `/{slug}`.

---

## 14. Quality checklist before launch

- [ ] Mobile responsive every block
- [ ] Images lazy-loaded; WebP where possible
- [ ] Page load &lt; 3s on 4G
- [ ] Accessibility: headings order, alt text, button labels
- [ ] SEO: per-school title, meta description fields in builder
- [ ] Invalid block types don’t crash renderer (fallback block)
- [ ] Tenant isolation: school A cannot read school B config
- [ ] Publish doesn’t break if one image URL 404s

---

## 15. What to build first (MVP recommendation)

If you want something **usable quickly** before the full builder:

1. **Template gallery** (3 templates) — apply JSON to existing `Landing.jsx` via `layoutTemplate` field  
2. **Theme colors** — extend branding (primary, secondary, hero overlay)  
3. **Section reorder** — store `sectionOrder: ['hero','timeline','map',...]` in current v1 config  
4. **Background image on any section** — extend current section objects  

Then replace v1 with v2 block engine in Phase 1.

---

## 16. Summary

| Question | Answer |
|----------|--------|
| Is it possible? | **Yes** — standard block-based page builder |
| Multi-tenant? | **Yes** — one JSON doc per school in portal config |
| Drag sections with mouse? | **Yes** — `@dnd-kit` in Phase 2 |
| Cut / add sections? | **Yes** — blocks array add/remove |
| Predefined templates? | **Yes** — JSON templates + thumbnail gallery |
| All text & images dynamic? | **Yes** — stored in each block’s `content` |
| Draw any layout freehand? | **Not recommended v1** — use layout variants instead |
| Big project? | **Yes** — plan **10–14 weeks** for full builder |

---

## 17. Next steps for your team

1. **Approve this plan** and pick MVP (Phase 1 only vs Phase 1+2).
2. **Backend:** Implement [landing_page_backend.md](./landing_page_backend.md) — single `POST /admin/landing-page`.
3. **Design mockups** for builder UI (Figma) — 3 screens: template picker, editor, mobile preview.
4. **Implement schema + migration** (`landingPageV2`).
5. **Build renderer first** (public page) so templates are testable early.
6. **Replace** `LandingPageSettings.jsx` forms with `LandingBuilder.jsx` gradually.

---

*Document version: 1.0 — July 2026*
