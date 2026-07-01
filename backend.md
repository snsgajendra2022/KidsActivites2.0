# SchoolBridge — Backend Specification

> No backend code exists yet. This document defines the production backend. Frontend uses mock services in `src/services/`.

---

## Mandatory Backend Library Stack

| Library | Purpose |
|---------|---------|
| **Node.js + NestJS** (or Laravel) | API framework |
| **PostgreSQL** (or MySQL) | Primary database |
| **Prisma** (or TypeORM / Eloquent) | ORM + migrations |
| **Redis** | Cache, sessions, rate limiting |
| **BullMQ** (or Laravel Queue) | Background jobs |
| **Socket.io Server** | Real-time chat |
| **Sharp** | Image compression + thumbnails |
| **ClamAV** | Virus scan (recommended) |
| **Multer / Busboy** | Multipart parsing |
| **JWT** or secure sessions | Authentication |
| **S3-compatible storage** | Private file storage |
| **PDFKit / Puppeteer** | Receipt PDF generation |
| **Nodemailer** | Email notifications |
| **SMS/WhatsApp gateway** | Later phase |

---

## Backend Must Handle

- Authentication + RBAC permissions
- Enrollment workflow + status history
- Fee workflow + receipt generation
- Document upload (signed URLs)
- Image compression (Sharp)
- Private media access (signed URLs)
- Chat (Socket.io)
- Notifications (in-app, email, SMS later)
- Audit logs
- Queue jobs (email, notifications, image processing)
- Internet-resilient upload confirmation

---

## Upload Architecture

### Upload Flow (Production)

```
1. Client requests signed upload URL  →  POST /documents/upload
2. Client uploads directly to S3      →  PUT signed URL
3. Client confirms upload complete    →  POST /documents/confirm
4. Backend validates MIME + size      →  Queue virus scan (optional)
5. Backend stores metadata in DB      →  Return document record
6. Admin reviews                      →  PATCH status (verified/rejected)
```

### Upload Categories

| Category | Max Size | MIME Validation |
|----------|----------|-----------------|
| Student photo | 2 MB | image/jpeg, image/png, image/webp |
| Documents | 5 MB | application/pdf, image/jpeg, image/png |
| Payment proof | 5 MB | application/pdf, image/jpeg, image/png |
| Teacher photos | 10 MB | image/jpeg, image/png, image/webp |
| Chat attachments | 10 MB | pdf, images, doc, xls |
| Digital signature | 1 MB | image/png |
| Receipts (generated) | — | application/pdf |

### Upload Security Rules

- Never trust frontend validation only
- Validate MIME type server-side (magic bytes)
- Validate file size
- Rename files safely (UUID + extension)
- Store privately (no public URLs)
- Permission check before every download
- Signed URLs with short expiry (15 min)
- Log all file access in `file_access_logs`

### Image Processing (Sharp)

- Teacher photos: compress + generate thumbnail
- Student photos: resize to max 800px
- Store original + optimized versions

---

## Permission Matrix (Backend Enforcement)

Every API must check:

1. Is user logged in?
2. Is account active?
3. Is role valid?
4. Does user have required permission?
5. Does user belong to this school?
6. Does user have access to this student/application/file/chat?

### Role Permissions Summary

| Role | Scope |
|------|-------|
| **Super Admin** | Everything, all schools |
| **School Admin** | Full school management |
| **Admission Officer** | Review apps, verify docs, approve for fee — no payment verify unless granted |
| **Accountant** | Fees, payments, receipts — no admission approval unless granted |
| **Teacher** | Assigned classes/students only, photos, chat with assigned parents |
| **Parent** | Own child data only |
| **Student** | Own profile, notices, photos (if enabled) |
| **Support Staff** | Support tickets only, no sensitive admission/fee data |

Frontend permission hiding is **not sufficient**. Backend guards are mandatory.

---

## Database Schema (Core Tables)

### Users & Auth
`users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `login_logs`, `password_resets`, `refresh_tokens`

### School
`schools`, `branches`, `academic_years`, `classes`, `sections`, `subjects`, `class_teachers`

### Enrollment
`enrollment_applications`, `student_profiles`, `parent_profiles`, `guardian_profiles`, `student_addresses`, `previous_academic_details`, `enrollment_documents`, `enrollment_signatures`, `enrollment_status_history`, `enrollment_remarks`

### Fees
`fee_heads`, `class_fee_structures`, `student_fee_assignments`, `fee_payments`, `payment_proofs`, `fee_receipts`, `fee_discounts`, `payment_status_history`

### Media
`photo_albums`, `photo_uploads`, `photo_recipients`, `photo_student_tags`, `photo_consents`, `media_access_logs`

### Chat
`chat_conversations`, `chat_participants`, `chat_messages`, `chat_attachments`, `message_reads`, `message_reports`

### Notifications & Audit
`notifications`, `notification_reads`, `email_logs`, `sms_logs`, `activity_logs`, `admin_action_logs`, `file_access_logs`, `security_logs`

---

## API Endpoints (Summary)

Base: `/api/v1`

### Auth
`POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/forgot-password` · `POST /auth/activate`

### Enrollment
`POST /enrollment/draft` · `PUT /enrollment/draft/:id` · `POST /enrollment/submit` · `GET /enrollment/my-application`

### Admin
`GET /admin/applications` · `GET /admin/applications/:id` · `POST /admin/applications/:id/request-correction` · `POST /admin/applications/:id/verify-documents` · `POST /admin/applications/:id/approve` · `POST /admin/applications/:id/reject` · `POST /admin/applications/:id/assign-fee` · `POST /admin/applications/:id/create-account` · `POST /admin/applications/:id/confirm-admission`

### Documents
`POST /documents/upload` (signed URL) · `POST /documents/confirm` · `GET /documents/:id` (signed download)

### Fees
`GET /fees/my-fee` · `POST /fees/:id/submit-payment` · `POST /admin/fees/:id/verify` · `POST /admin/fees/:id/reject` · `GET /admin/fees/:id/receipt`

### Media
`POST /media/photos` · `GET /media/photos` · `DELETE /media/photos/:id`

### Chat
`GET /chat/conversations` · `GET /chat/conversations/:id/messages` · `POST /chat/conversations/:id/messages` · `WS /chat`

### Notifications
`GET /notifications` · `POST /notifications/:id/read` · `POST /notifications/read-all`

---

## Enrollment Status Workflow

```
draft → submitted → under_review → correction_required
  → documents_verified → fee_pending → fee_submitted
  → fee_verified → approved → account_created → admission_confirmed
```

---

## Queue Jobs (BullMQ)

| Job | Trigger |
|-----|---------|
| `send-email` | Enrollment submitted, correction, fee verified, account created |
| `send-sms` | Admission confirmed (optional) |
| `compress-image` | Teacher photo uploaded |
| `generate-receipt` | Payment verified |
| `virus-scan` | Document uploaded |
| `audit-log` | All admin actions |

---

## Security Requirements

- bcrypt password hashing (cost 12)
- JWT access (15m) + refresh (7d)
- Rate limiting: 100 req/min, 5 login attempts/15min
- Account lockout after failed logins
- Input sanitization + class-validator DTOs
- CORS configured per environment
- Audit logs for all sensitive actions
- Parents see own child only; teachers see assigned classes only

---

## Environment Variables

```env
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=
JWT_EXPIRES_IN=15m
REDIS_URL=redis://localhost:6379
S3_BUCKET=schoolbridge-media
S3_REGION=ap-south-1
S3_ACCESS_KEY=
S3_SECRET_KEY=
SMTP_HOST=
FROM_EMAIL=noreply@schoolbridge.app
```

---

## Development Phases

1. **Foundation** — NestJS, DB, auth, roles, permissions, seeders
2. **Enrollment** — CRUD, documents, signatures, status history
3. **Fees** — Structure, assignment, payment, receipts
4. **Accounts** — Parent invite, student profile, class assignment
5. **Media** — Photo upload, compression, privacy controls
6. **Chat** — Socket.io, read receipts, attachments
7. **Production** — Tests, security review, monitoring, deployment

---

## Frontend Integration

```javascript
// src/services/api/client.js
const API_BASE = import.meta.env.VITE_API_URL;

export async function api(path, options = {}) {
  const token = localStorage.getItem('sb_access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

Replace `src/services/uploadService.js` mock upload with signed-URL flow when backend is ready.

---

*See [FRONTEND_STACK.md](./FRONTEND_STACK.md) for frontend library requirements.*
