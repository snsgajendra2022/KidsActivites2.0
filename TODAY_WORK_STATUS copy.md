TODAY'S WORK STATUS
Thursday, 20 August 2026

Project: Kids Activities Web (KidsActivities2.0)

Status: COMPLETED (frontend) — enrollment branding/share + public form + dashboard perf
         Backend still needed for share-form email + calendar APIs in production

Overview
--------

Enrollment printable form is school-branded (not hard-coded Kidzee), shareable
to parents by email with a no-login public URL, and admin dashboard loads
without blocking the whole page. Calendar widget path was lightened on the
dashboard. This repo has no database; live APIs remain Spring Boot.

Completed this session
----------------------

Enrollment form — admin + public
- Admin route: /{tenant}/admin/enrollment/kidzee-print-form (+ /print)
- Public route (no login): /{tenant}/enrollment/kidzee-print-form
- Nav: Enrollment Form under School; links from Applications / Admin dashboard
- Login “Start Admission” enroll button removed (admin path preferred)
- Guest draft/submit use auth: false when no access token
- TenantPathGate / TenantContext: provisional school so guests are not stuck
  on “Loading workspace…” / false “Workspace not found”

Dynamic branding (replaces Kidzee defaults)
- buildEnrollmentFormBranding() from portal config + printableFormBranding
- Portal Settings → Enrollment Form tab (brand name, legal name, socials,
  alumni label, seal/tagline, etc.)
- Logo from Logo & Images; empty branding fields fall back to school/portal name
- Saved with portal config (PUT /admin/portal-settings → printableFormBranding)
- Header/footer/legal/alumni/seal use school name, not Kidzee

Share with parent
- Admin form toolbar: Share with parent → email + copy link
- Link is always the public URL (no login required)
- API: POST /admin/enrollment/share-form (fallback /admin/enrollment/invite;
  mailto if API not live yet)

Admin dashboard performance
- Progressive UI: banner/stats shell immediately (no full-page spinner wait)
- Lazy-load Recharts (WelcomeBanner split out of ChartCards)
- UpcomingEventsWidget light mode: calendar events only (not exams/homework/notices)
- calendarService.list remembers missing endpoints (avoids double 404 every load)
- getAdminDashboard fallback assembles stats/charts/recent if combined API 404
- Faster PageTransition; less aggressive refetch

Calendar leftovers from prior session (still open)
- Spring Boot: docs/SCHOOL_CALENDAR_API_CONTRACT.md not implemented yet
- Until then calendar data may use localStorage fallback on 404/405/501

Still needs
-----------

Backend
- Persist/return printableFormBranding on portal settings
- Production POST /admin/enrollment/share-form (SMTP / school email)
- School calendar APIs per SCHOOL_CALENDAR_API_CONTRACT.md

Frontend / product
- Recurring edit modes this / future / series; drag-resize on month grid
- Live bus: MASTER_LIVE_TRACKING_API.md §6 items still open on Spring Boot

Prior sessions (already shipped, not re-done today)
- 19 Aug: School Calendar & Alerts UI + API contract doc
- 18 Aug: Landing coverage, Creative Cards, global search
