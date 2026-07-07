# KidsActivites 1B2E44

Production-ready school enrollment and communication platform.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

Open [http://localhost:5173](http://localhost:5173) — platform home and school registration stay at the root.

### Path-based tenant URLs (LAN / multi-machine dev)

Tenant context is selected from the **first URL path segment**, not subdomain or `.env`:

| URL | Tenant |
|-----|--------|
| `http://localhost:5173/sns/login` | `sns` |
| `http://192.168.1.58:5173/demo/admin/dashboard` | `demo` |

- Platform routes (no tenant prefix): `/`, `/register-school`, `/workspace/new`, `/workspace/confirm`
- All school routes: `/{tenantSlug}/login`, `/{tenantSlug}/admin/*`, `/{tenantSlug}/parent/*`, `/{tenantSlug}/teacher/*`, `/{tenantSlug}/enroll`
- Root `/login` shows the workspace picker — enter a slug to go to `/{slug}/login`
- `VITE_TENANT_SLUG` is optional last-resort fallback only; path takes priority
- Subdomain hosts (`demo.localhost`) still work for backward compatibility

### Live database (default)

With `VITE_API_URL` set in `.env`, all data comes from the Spring Boot backend — no localStorage mock fallbacks.

1. Start MySQL and the backend (`backend/README.md`), e.g. `http://localhost:8080`
2. Ensure `.env` has:
   ```
   VITE_API_URL=http://localhost:8080/api/v1
   VITE_FORCE_MOCK=false
   VITE_API_FALLBACK_MOCK=false
   ```
3. Run `npm run dev` and open `http://localhost:5173/demo/login` (or your tenant slug).

**Verify:** DevTools → Network shows requests to `localhost:8080/api/v1`. Application → Local Storage should have `sb_access_token` but not `sb_applications` or `sb_portal_config_*`.

**Offline mock only:** unset `VITE_API_URL` or set `VITE_FORCE_MOCK=true`.

## Documentation

| Document | Description |
|----------|-------------|
| [FRONTEND_STACK.md](./FRONTEND_STACK.md) | Frontend libraries, upload system, permissions, responsive rules |
| [backend.md](./backend.md) | Backend API spec, database schema, security (not implemented yet) |

## Tech Stack

**Frontend (active):** React · Vite · Tailwind CSS · Lucide · Sonner · TanStack Query · Zustand · Zod · React Hook Form · Uppy · Socket.io Client · date-fns · Radix UI

**Backend (planned):** NestJS · PostgreSQL · Prisma · Redis · BullMQ · Sharp · S3 · Socket.io

## Key Features

- 8-step enrollment form with Zod validation
- Network-aware file uploads (pause/resume on disconnect)
- Admin review, fee verification, account creation workflow
- Parent / Teacher / Admin role-based dashboards
- Chat, photos, notifications (mock data)

## Build

```bash
npm run build
npm run preview
```
