# SchoolBridge

Production-ready school enrollment and communication platform.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

**Demo login:** any email/mobile · password `123456` · select role (Parent / Admin / Teacher)

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
