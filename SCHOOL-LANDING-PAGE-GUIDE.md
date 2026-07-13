# School Landing Page — Multi-Tenant Guide

**Product:** Kids Activities  
**Purpose:** How each school gets its own public homepage at `/{school-slug}` and how admins edit it.

---

## 1. Short answer: Yes, this is already possible

Your app is **multi-tenant**. Each school (workspace) has:

| What | Example |
|------|---------|
| School slug (workspace ID in URL) | `shri` |
| Public landing page | `http://localhost:3000/shri` |
| School login | `http://localhost:3000/shri/login` |
| Enrollment | `http://localhost:3000/shri/enroll` |
| Admin portal settings | `http://localhost:3000/shri/admin/portal-settings` |

Another school with slug `green-valley` would use:

- `http://localhost:3000/green-valley`
- `http://localhost:3000/green-valley/login`
- etc.

**One codebase → many schools → each school has its own URL and its own landing content.**

---

## 2. URL structure (how multi-tenant works)

```
https://your-domain.com/{tenantSlug}/{page}
```

| URL | Who sees it | What happens |
|-----|-------------|--------------|
| `/` | Platform visitor | Marketing / workspace signup (`AccessLanding.jsx`) |
| `/shri` | Public (not logged in) | **School landing page** for Shri school |
| `/shri` | Logged-in user | Redirect to dashboard (admin / teacher / parent) |
| `/green-valley` | Public | **Different school** — different content |
| `/shri/admin/portal-settings` | School admin | Edit landing page, branding, enrollment |

The **first path segment** (`shri`, `green-valley`, etc.) is the **tenant slug**. The app loads that school’s data from the API using that slug.

---

## 3. How to find any client’s landing page (easy)

### Rule

```
Landing page URL = https://{your-domain}/{school-slug}
```

### Examples

| School name | Slug (workspace) | Landing URL (local) |
|-------------|------------------|---------------------|
| Shri | `shri` | `http://localhost:3000/shri` |
| Little Stars | `little-stars` | `http://localhost:3000/little-stars` |
| Green Valley | `green-valley` | `http://localhost:3000/green-valley` |

### Where to find the slug

| Who | Where |
|-----|--------|
| **Super admin** | Admin → Schools list → each row has slug |
| **School admin** | Portal Settings → shows `/{slug}/` in the UI |
| **Database / API** | `GET /schools/:slug` — slug is unique per school |
| **After registration** | Set during workspace setup (`/workspace/new`) |

### Quick test checklist

1. Open `http://localhost:3000/{slug}` in **incognito** (so you are not logged in).
2. You should see the school landing page (hero, timeline, map, etc.).
3. If you see “Loading workspace…” then invalid slug → `InvalidWorkspace` page.

---

## 4. What the school landing page shows

**File:** `src/pages/public/Landing.jsx`  
**Route:** `/{tenantSlug}/` (index route under tenant)

### Sections (each can be turned on/off by admin)

| Section | Default | Admin can edit |
|---------|---------|----------------|
| **Hero** | Badge, headline, subtitle, Enroll + Login buttons | Yes |
| **Campus banner** | Off by default | Title, subtitle, wide image |
| **Timeline** | “Why Families Choose …” + 4 steps | Title, steps, images |
| **Map** | Campus location / Google Maps embed | Title, embed URL, address |
| **Final CTA** | Bottom enroll call-to-action | Title, subtitle, button, background image |
| **Footer** | School footer | Via branding / portal name |

Default content is built in `src/data/defaultLandingPage.js` and merged with what the school saved in portal config.

---

## 5. How school admin edits the landing page

### Steps for school admin

1. Log in as **School Admin** or **Super Admin**.
2. Go to **Portal Settings**  
   URL: `/{slug}/admin/portal-settings`
3. Open the **Landing Page** tab.
4. Edit sections: Hero, Campus, Timeline, Map, Final CTA, Footer.
5. Toggle sections on/off (show/hide).
6. Upload images (campus, timeline steps, CTA background).
7. Click **Save**.

### Admin UI files

| File | Role |
|------|------|
| `src/pages/admin/PortalSettings.jsx` | Main settings page |
| `src/components/admin/LandingPageSettings.jsx` | Landing section editor |
| `src/services/portalConfigService.js` | Load/save config + image upload |

### What gets saved

Landing content is stored in **portal config** for that school (per tenant), not in code. Each school has its own JSON, for example:

```json
{
  "landingPage": {
    "sections": { "hero": true, "timeline": true, "map": true },
    "hero": {
      "badge": "Admissions Open",
      "title": "Welcome to Shri School",
      "subtitle": "Enroll online today.",
      "primaryCtaLabel": "Start Enrollment"
    },
    "timeline": { "title": "...", "steps": [...] },
    "map": { "embedUrl": "..." }
  }
}
```

---

## 6. Architecture (how dynamic content works)

```
Visitor opens /shri
        │
        ▼
TenantPathGate — validates slug, loads school record
        │
        ▼
TenantHomeGate — logged in? → dashboard : show Landing
        │
        ▼
Landing.jsx — reads PortalConfigContext
        │
        ▼
portalConfigService — GET portal config for tenant "shri"
        │
        ▼
mergeLandingPage(stored, portalName, schoolName)
        │
        ▼
Render hero, timeline, map, CTA with school's text & images
```

### Key files

| Layer | File |
|-------|------|
| Routing | `src/App.jsx` — `Route path="/:tenantSlug"` |
| Tenant resolution | `src/context/TenantContext.jsx` |
| Public landing | `src/pages/public/Landing.jsx` |
| Gate (login vs landing) | `src/components/routing/TenantHomeGate.jsx` |
| Defaults | `src/data/defaultLandingPage.js` |
| Admin editor | `src/components/admin/LandingPageSettings.jsx` |
| API / storage | `src/services/portalConfigService.js` |

---

## 7. Platform vs school landing (two different pages)

Do not mix these up:

| Page | URL | Purpose |
|------|-----|---------|
| **Platform landing** | `/` | Sell the product; “Create workspace”, find your school slug |
| **School landing** | `/{slug}` | That school’s admissions homepage for parents |

School admins **only edit** the school landing (`/{slug}`), not the platform home (`/`).

---

## 8. Plan: separate landing design per school (if you want more than sections)

**Today:** One landing **template** (`Landing.jsx`) + **per-school content** (text, images, on/off sections).

**If you need fully different layouts per school** (e.g. one school wants 10 sections, another wants a video hero only):

### Option A — Recommended (use what you have)

- Keep one `Landing.jsx` template.
- Each school customizes via Portal Settings → Landing Page.
- Fast, easy for admins, already built.

### Option B — Multiple templates

| Step | Action |
|------|--------|
| 1 | Add `landingTemplate: 'classic' \| 'minimal' \| 'video-hero'` to portal config |
| 2 | Create `LandingClassic.jsx`, `LandingMinimal.jsx`, … |
| 3 | In `TenantHomeGate`, pick template from config |
| 4 | Admin chooses template in Portal Settings |

### Option C — Page builder (future)

- Drag-and-drop blocks stored as JSON per school.
- Bigger project; only needed if schools need completely different layouts often.

**For most schools, Option A is enough.**

---

## 9. Checklist: new school gets a landing page

| Step | Owner | Action |
|------|-------|--------|
| 1 | Platform | School registers via `/workspace/new` or super admin creates school |
| 2 | System | Assign unique slug (e.g. `shri`) |
| 3 | System | Default landing page created from `defaultLandingPage.js` |
| 4 | School admin | Log in → Portal Settings → Branding (logo, colors) |
| 5 | School admin | Portal Settings → Landing Page → edit hero, timeline, map |
| 6 | School admin | Save |
| 7 | Public | Share `https://yourdomain.com/shri` with parents |

No developer needed for content changes after the school exists.

---

## 10. Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| `/shri` shows “Invalid workspace” | Slug wrong or school not in DB | Check slug in admin schools list |
| `/shri` redirects to dashboard | You are logged in | Use incognito or log out |
| Landing shows default text only | Portal config not saved | Admin → Portal Settings → Save |
| Changes not visible | Browser cache | Hard refresh; check API returns new config |
| “Loading workspace…” stuck | API / school fetch failed | Check backend + `GET /schools/shri` |

---

## 11. Related docs in this repo

| Document | Content |
|----------|---------|
| `landingpage.md` | All landing sections, default text, UI labels |
| `PLATFORM_FULL_DETAILS.md` | Full platform routes and features |
| `backend.md` | API for portal config and schools |

---

## 12. Summary

| Question | Answer |
|----------|--------|
| Is multi-tenant landing possible? | **Yes — already built** |
| URL for Shri school? | `http://localhost:3000/shri` |
| Who edits content? | School admin in **Portal Settings → Landing Page** |
| How to find any school’s page? | `/{their-slug}` |
| Need new code for each school? | **No** — only portal config per tenant |
| Need new code for new layout? | Only if you want multiple templates (Option B) |

---

*Last updated: July 2026*
