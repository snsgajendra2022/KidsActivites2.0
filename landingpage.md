# Kids Activities — Landing Page & Project Summary

**Product:** Kids Activities (KidsActivites web portal)  
**Version:** 1.0.0  
**Stack:** React + Vite, Tailwind CSS, REST API backend  
**Companion:** Kids Activities mobile app (Expo / React Native)

This document lists every landing-page section, all default UI text, and a full summary of what the project does across admin, parent, teacher, and public flows.

**For complete web + mobile functionality (all pages, photo upload, QR/TV, chat, enrollment, APIs), see `PLATFORM_FULL_DETAILS.md`.**

---

## 1. How the first page works

The “first page” depends on the URL:

| URL type | Page shown | File |
|----------|------------|------|
| Platform root (`/`) on main host | **Access Landing** — marketing + workspace sign-in | `AccessLanding.jsx` |
| Tenant root (`/{slug}/`) when logged out | **School Landing** — school admissions homepage | `Landing.jsx` |
| Tenant root when logged in | Redirect to role dashboard (parent, admin, teacher, etc.) | `TenantHomeGate.jsx` |
| Legacy subdomain tenant host | Same as school landing via `TenantHomeGate` | `PlatformHomeGate.jsx` |

**Public header** (all public pages): logo links home, right CTA is **Enrollment** on platform home or **Login** on school tenant pages.

---

## 2. Platform landing page (`AccessLanding.jsx`)

Used when visitors open the main site (not a specific school workspace).

### 2.1 Hero section (`CinematicHero`)

| Element | Default text |
|---------|----------------|
| Background image | Portal `branding.heroImageUrl` or default hero image |
| Badge (with sparkle icon) | `KIDS ACTIVITY ENROLLMENT PLATFORM` (or `platform.tagline` from config) |
| Headline line 1 | Manage Kids Activities, |
| Headline line 2 | Admissions, and Parents |
| Headline line 3 | in One Platform |
| Subtitle line 1 | Launch your activity workspace in minutes. |
| Subtitle line 2 | Manage enrollments, schedules, payments, documents, and parent communication from one trusted platform. |
| Primary button | **Create Your Workspace** → `/workspace/new` |
| Secondary button | **Enrollment** → `/workspace/new` |

Headline and subtext can be overridden in portal config (`platform.heroHeadline`, `platform.heroSubtext`).

### 2.2 Workspace access cards (lavender section)

**Card 1 — New to Kids Activities?**

- Icon: Building
- Title: **New to Kids Activities?**
- Body: Request a dedicated workspace for your activity program. We'll send a confirmation email and set up your portal after verification.
- Button: **Start Workspace Setup** → `/workspace/new`

**Card 2 — Sign in to your workspace**

- Icon: Log in
- Title: **Sign in to your workspace**
- Body: Enter your workspace slug to open your portal login.
- Input placeholder: `your-program`
- Input helper: `e.g. little-stars → /little-stars/login`
- Button: **Continue** (navigates to `/{slug}/login`)

### 2.3 Timeline section (`EditorialTimeline`)

| Element | Text |
|---------|------|
| Section title | **Why Programs Choose {portalName}** |
| Section subtitle | A complete platform for enrollments, payments, documents, and parent communication. |

**Step 1 — Secure & Trusted**

- Description: Role-based access, protected data, and audit-ready workflows for every program.

**Step 2 — Easy Documentation**

- Description: Collect forms, documents, and approvals online with real-time status tracking.

**Step 3 — Transparent Payments**

- Description: Clear payment breakdowns, online fee tracking, and digital receipt generation.

**Step 4 — Stay Connected**

- Description: Share updates, messages, photos, and activity progress with parents.

Each step has a timeline image (`timeline_secure.jpg`, `timeline_docs.jpg`, `timeline_fees.jpg`, `timeline_connected.jpg`).

### 2.4 Final CTA (`FinalImageCTA`)

| Element | Text |
|---------|------|
| Title | `{portalName}` (default: Kids Activities) |
| Subtitle | Launch enrollments, payments, schedules, and parent communication in one secure platform. |
| Button | **Create Your Workspace** → `/workspace/new` |

### 2.5 Footer (`EditorialFooter` — compact)

| Column | Content |
|--------|---------|
| Brand | Footer logo + tagline: **Multi-school enrollment platform** |
| Contact note | Contact your school directly for admissions assistance. |
| **Admissions** | Start Enrollment · Enrollment |
| **Contact** | +1 214-494-0908 · support@kidsactivities.com |
| **Legal** | Privacy Policy · Terms of Use |
| Copyright | © {year} {portalName}. All rights reserved. |

---

## 3. School tenant landing page (`Landing.jsx`)

Shown at `/{tenantSlug}/` when the user is not signed in (e.g. `/sns/`).

All sections can be turned on/off and edited in **Admin → Portal Settings → Landing Page**.

### 3.1 Default section visibility

| Section | Default |
|---------|---------|
| Hero | On |
| Campus banner | Off (until image uploaded) |
| Timeline | On |
| Map | On |
| Final CTA | On |
| Footer | On |

### 3.2 Hero section

| Element | Default text |
|---------|----------------|
| Badge | **Admissions Open** (configurable) |
| Title | School name (e.g. Green Valley International School) or portal name |
| Subtitle | Complete your child's admission to {school name} online. Submit documents, pay fees, and stay connected. |
| Primary button | **Start Enrollment** → `/{slug}/enrollment/kidzee-print-form` |
| Secondary button | **Parent Login** → `/{slug}/login` |

### 3.3 Campus banner (optional)

Shown only when `campusBanner.imageUrl` is set.

| Element | Default text |
|---------|----------------|
| Title | Experience Our Campus |
| Subtitle | Explore our facilities |

### 3.4 Timeline section

| Element | Default text |
|---------|----------------|
| Title | **Why Families Choose {portalName}** |
| Subtitle | A complete platform for enrollments, payments, documents, and parent communication. |
| Steps | Same four steps as platform landing (Secure, Documentation, Payments, Connected) |

### 3.5 Map section (`MapFeatureSection`)

| Element | Default text |
|---------|----------------|
| Title | **Visit Our Campus** |
| Subtitle | Experience {school name} in person or explore online. |
| Address | School address from portal config (with map pin icon) |
| Map | Google Maps embed if `embedUrl` set; otherwise placeholder map image |

### 3.6 Final CTA

| Element | Default text |
|---------|----------------|
| Title | School name |
| Subtitle | School address |
| Button | **Start Enrollment** → Kidzee printable enrollment form |

### 3.7 Footer (school tenant)

| Column | Content |
|--------|---------|
| Tagline | School address |
| Contact | School phone · school email |
| **Admissions** | Start Enrollment · Login |
| **Contact** | +1 214-494-0908 · support@kidsactivities.com |
| **Legal** | Privacy Policy · Terms of Use |

---

## 4. Public header (`PublicHeader.jsx`)

| Element | Platform home | School tenant |
|---------|---------------|---------------|
| Logo | Links to `/` | Links to `/{slug}/` |
| Right CTA | **Enrollment** → `/workspace/new` | **Login** → `/{slug}/login` |
| Login page marquee | Scroll lines from portal config (admissions dates, fee deadlines, help email) | Same |

**Default login scroll lines:**

1. Admissions open for 2026–2027 — enroll online today  
2. Last date for fee submission: 31 July 2026  
3. Track applications, documents & fees in your parent portal  
4. Need help? Contact admissions@greenvalley.edu.in  

---

## 5. Related public pages (linked from landing)

| Route | Purpose |
|-------|---------|
| `/workspace/new` | Request a new school/program workspace |
| `/workspace/confirm` | Workspace request confirmation |
| `/register-school` | School registration |
| `/enrollment` | Platform enrollment entry |
| `/enrollment/kidzee-print-form` | Kidzee printable enrollment (5-page form) |
| `/{slug}/login` | Email/password, OTP, QR login |
| `/{slug}/forgot-password` | Password reset request |
| `/{slug}/reset-password` | Set new password with token |
| `/privacy-policy` | Privacy policy |
| `/terms-of-use` | Terms of use |
| `/terms-and-conditions` | Terms and conditions |
| `/security-policy` | Security policy |
| `/system-status` | System status |
| `/support` | Direct support |

---

## 6. Full project functionality summary

### 6.1 Core purpose

Kids Activities is a **multi-tenant school and activity enrollment platform**. Each school or program gets its own workspace (tenant slug). The platform handles:

- Online enrollment and application review  
- Document collection and verification  
- Fee management and payment tracking  
- Parent–school messaging and notifications  
- Classroom photo sharing and albums  
- TV album playback (via mobile QR pairing)  
- Role-based portals for admins, teachers, parents, and staff  

**Backend API:** configurable via `VITE_API_URL` (e.g. `https://kidsbackend.snssystem.com/api/v1` in production).

---

### 6.2 User roles

| Role | Dashboard | Main capabilities |
|------|-----------|-------------------|
| Super Admin | Admin | All schools, users, portal settings, system-wide control |
| School Admin | Admin | Applications, students, classes, teachers, fees, photos, reports, settings |
| Admission Officer | Admin | Application review, enrollment workflow |
| Accountant | Fees dashboard | Fee records, payments, financial reports |
| Support Staff | Chat / applications | Support chat, application assistance |
| Teacher | Teacher | Classes, students, send photos, class albums, parent messages |
| Parent | Parent | Enrollment status, fees, documents, photos, chat, notifications |
| Student | Parent (shared) | Same parent portal access pattern |

---

### 6.3 Admin portal (`/{slug}/admin/...`)

| Module | What it does |
|--------|----------------|
| **Dashboard** | Application stats, fee charts, recent applications, welcome banner |
| **Applications** | List, filter, review, approve/reject enrollment applications |
| **Application review** | Full Kidzee form details, signatures, photos, PDF download, status actions |
| **Students** | Enrolled student records |
| **Fees** | Fee structures, payment status, receipts |
| **Photos** | School media library, class albums, upload and TV visibility |
| **Albums** | Album management, TV codes, shared moments |
| **Classes** | Class management and assignments |
| **Teachers** | Teacher accounts, class assignment, activate/deactivate |
| **Users** | Admin and staff user management (super admin / school admin) |
| **Schools** | Multi-school management (super admin) |
| **Reports** | Communications stats, photos shared, classes reached |
| **Chat** | School-wide messaging with parents and staff |
| **Notifications** | System notifications management |
| **Audit logs** | Activity and change history |
| **Portal settings** | Branding, login methods, landing page content, enrollment form builder, SMTP, menu visibility |
| **Settings** | School profile, academic year, admissions open/close |

**Enrollment admin features:**

- Kidzee printable enrollment form (multi-step, signatures, photos, immunization, permissions)  
- Application status workflow (submitted, under review, correction required, fee pending, admitted, rejected)  
- PDF generation via backend Playwright render  
- Document verification per application  

---

### 6.4 Parent portal (`/{slug}/parent/...`)

| Module | What it does |
|--------|----------------|
| **Dashboard** | Parent info, children summary, pending actions (corrections, fees), quick links |
| **Enrollment status** | Per-child application progress, timeline, form details |
| **Fees** | Outstanding fees, payment proof upload, receipt view |
| **Documents** | Required document uploads and verification status |
| **Photos** | Classroom photos shared by teachers (gallery by date) |
| **Messages** | Real-time chat with school |
| **Notifications** | Enrollment and school alerts |

**Quick link labels on dashboard:**

- Enrollment Status — `{n} child(ren)`  
- Fees — Payments & receipts  
- Documents — Uploads & verification  
- Photos — From teachers  
- Messages — Chat with school  
- Notifications — Updates & alerts  

---

### 6.5 Teacher portal (`/{slug}/teacher/...`)

| Module | What it does |
|--------|----------------|
| **Dashboard** | Class count, students, photos shared, unread messages |
| **Classes** | Assigned classes overview |
| **Students** | Class roster and search |
| **Send photos** | Upload to class album or direct to selected parents |
| **Class album** | Browse shared media, TV playback toggle, remove items |
| **Messages** | Chat with parents |

**Dashboard welcome banner:**

- Title: **Your Classroom Hub**  
- Subtitle: Share photos, send messages, and keep parents connected with classroom updates.  
- Actions: **Send Photos** · **View Messages**

---

### 6.6 Authentication & account

| Feature | Details |
|---------|---------|
| Email + password login | School-registered email |
| Mobile OTP | Quick OTP login |
| Email OTP | OTP to email |
| QR login | Scan QR from mobile app to sign in on web/TV |
| Forgot / reset password | Email token flow |
| Email verification | Verify email with token |
| Profile / account settings | Update name, mobile, change password |

---

### 6.7 Enrollment system

| Feature | Details |
|---------|---------|
| **Kidzee printable form** | 5-page admission form matching paper layout |
| **Form fields** | Child details, health, family, emergency contacts, immunization, permissions, signatures, photos (child, father, mother) |
| **Draft save** | Save and resume application |
| **Submit** | Validation, admissions open check, parent account link |
| **Correction flow** | Token-based link for parent to fix rejected fields |
| **PDF download** | Server-rendered enrollment PDF for admin and parent |
| **Dynamic enrollment form** | Configurable form builder for non-Kidzee schools |
| **Printable HTML form** | Alternative printable enrollment templates |

---

### 6.8 Communication & media

| Feature | Details |
|---------|---------|
| **Chat** | STOMP/WebSocket messaging between parents, teachers, admins |
| **Notifications** | In-app notification bell and notification center |
| **Photo albums** | Class albums with admin/teacher upload |
| **Parent photo feed** | Masonry gallery grouped by date |
| **TV playback** | QR pairing from mobile app, album select, classroom TV display |
| **Video support** | Video upload, processing, TV-ready variants |

---

### 6.9 Workspace onboarding

| Step | What happens |
|------|----------------|
| Visit `/workspace/new` | School/program fills workspace name, slug, admin name, email |
| Slug check | Real-time availability check |
| Submit | Creates workspace request; confirmation email |
| Admin provisions tenant | Backend activates workspace at `/{slug}/` |
| Portal settings | School customizes branding, landing page, login, enrollment |

---

### 6.10 Mobile app (companion)

The **Kids Activities mobile app** (Expo SDK 57) mirrors key web features:

| Area | Mobile screens |
|------|----------------|
| Workspace select | Choose school slug before login |
| Login | Email/password, school logo, forgot password |
| Parent | Home, photos, fees, documents, chat, profile, enrollment, my application |
| Teacher | Home, classes, students, photos upload, chat |
| Admin | Applications, classes, teachers, albums, reports, users, chat |
| TV | QR scan, album select, playback control |
| Account | Change password, profile, sign out |

Live backend: `https://kidsbackend.snssystem.com/api/v1`

---

## 7. Landing page admin customization

School admins edit landing content under **Portal Settings → Landing Page**:

| Setting group | What can be changed |
|---------------|---------------------|
| **Sections** | Toggle hero, campus banner, timeline, map, final CTA, footer |
| **Hero** | Badge, title, subtitle, primary/secondary CTA labels, enable/disable CTAs |
| **Campus banner** | Image, title, subtitle |
| **Timeline** | Section title, subtitle, per-step title/description/image |
| **Map** | Title, subtitle, embed URL, image, show/hide address |
| **Final CTA** | Title, subtitle, image, button label |
| **Branding** | Logo, hero image, favicon, theme colors (also affects login and enrollment header) |

Defaults are built in `defaultLandingPage.js` and merged with stored portal config.

---

## 8. Default portal branding

| Field | Default value |
|-------|----------------|
| Portal name | Kids Activities |
| Tagline | Activity enrollment and parent communication platform |
| School name (demo) | Green Valley International School |
| Academic year | 2026–2027 |
| School address | 123 Education Lane, New Delhi, 110001 |
| School phone | +91 11 4567 8900 |
| School email | admissions@greenvalley.edu.in |
| Brand color | #1B2E4B (navy) |
| Accent color | #0058BE |

---

## 9. UI components used on landing pages

| Component | Role |
|-----------|------|
| `PublicLayout` | Page shell with header (footer hidden on landing) |
| `CinematicHero` | Full-width hero with background image, badge, title, subtitle, CTAs |
| `EditorialTimeline` | Scroll timeline with alternating image/text steps |
| `MapFeatureSection` | Campus map or embed + address |
| `FinalImageCTA` | Bottom banner CTA with background image |
| `StaticCampusBanner` | Optional campus photo strip with overlay text |
| `EditorialFooter` | Four-column footer with admissions, contact, legal |
| `PortalLogo` | School/platform logo in header and footer |

**Page CSS class:** `sb-editorial-page`  
**Design style:** Editorial / cinematic — navy headings, purple CTAs, cream/lavender section backgrounds, responsive mobile layout.

---

## 10. Key source files

| File | Purpose |
|------|---------|
| `src/pages/public/AccessLanding.jsx` | Platform marketing home |
| `src/pages/public/Landing.jsx` | School tenant landing |
| `src/data/defaultLandingPage.js` | Default landing text and timeline steps |
| `src/data/defaultPortalConfig.js` | Portal name, school, branding, login lines |
| `src/components/public/CinematicHero.jsx` | Hero section |
| `src/components/public/EditorialTimeline.jsx` | Feature timeline |
| `src/components/public/MapFeatureSection.jsx` | Map section |
| `src/components/public/FinalImageCTA.jsx` | Bottom CTA |
| `src/components/public/EditorialFooter.jsx` | Footer |
| `src/components/layout/PublicHeader.jsx` | Top navigation |
| `src/pages/admin/PortalSettings.jsx` | Landing page editor (admin) |
| `src/App.jsx` | All routes |

---

## 11. Quick reference — all landing button labels

| Button label | Where | Goes to |
|--------------|-------|---------|
| Create Your Workspace | Platform hero, final CTA | `/workspace/new` |
| Start Workspace Setup | Platform access card | `/workspace/new` |
| Enrollment | Platform hero secondary, header, footer | `/workspace/new` or enroll path |
| Continue | Workspace slug form | `/{slug}/login` |
| Start Enrollment | School hero, final CTA, footer | `/{slug}/enrollment/kidzee-print-form` |
| Parent Login | School hero secondary | `/{slug}/login` |
| Login | School header, footer | `/{slug}/login` |

---

*Last updated: July 2026 — generated from current `KidsActivities2.0` source.*
