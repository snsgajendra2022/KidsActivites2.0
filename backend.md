# SchoolBridge — Backend API Specification

> **Status:** No production backend yet. The React frontend works today using **mock services** in `src/services/` backed by `localStorage`. This document is the **full API contract** — endpoint names, HTTP methods, request payloads, response shapes, variables, and errors — so a real backend can be implemented and the frontend swapped from mocks to live APIs.

---

## Quick index

| Domain | Base path | Mock service |
|--------|-----------|--------------|
| [Auth](#1-authentication) | `/auth/*` | `src/services/authService.js` |
| [Portal config](#2-portal--branding) | `/portal/*`, `/admin/portal-settings/*` | `src/services/portalConfigService.js` |
| [Enrollment](#3-enrollment) | `/enrollment/*`, `/admin/applications/*` | `src/services/enrollmentService.js` |
| [Documents / upload](#4-documents--file-upload) | `/documents/*` | `src/services/uploadService.js` |
| [Fees](#5-fees) | `/fees/*`, `/admin/fees/*` | `src/services/feeService.js` |
| [Media / photos](#6-media--photos) | `/media/photos/*` | `src/services/mediaService.js` |
| [Chat](#7-chat) | `/chat/*` + WebSocket | `src/services/chatService.js` |
| [Notifications](#8-notifications) | `/notifications/*` | `src/services/notificationService.js` |
| [User profile](#9-user-profile) | `/users/me` | `src/context/AuthContext.jsx` (local only today) |
| [Support](#10-support--legal-pages) | `/support/*` | static content + form (not wired) |
| [Navigation](#11-navigation) | `/navigation` | derived from portal config |
| [School settings](#12-school-settings) | `/admin/settings/*` | `src/services/settingsService.js` |
| [Reports](#13-reports) | `/admin/reports/*` | `src/services/reportsService.js` |
| [Audit logs](#14-audit-logs) | `/admin/audit-logs` | `src/services/auditService.js` |
| [Multi-tenant & schools](#15-multi-tenant--schools) | `/schools/*`, `/platform/config`, `/admin/schools/*`, `/admin/users/*` | `src/services/schoolService.js`, `src/services/platformConfigService.js`, `src/services/userService.js` |
| [Teacher classes](#16-teacher-classes) | `/teacher/classes` | `src/services/teacherService.js` |

---

## Conventions

### Base URL

```
Production:  https://api.schoolbridge.app/api/v1
Development: http://localhost:3000/api/v1
Frontend env: VITE_API_URL=http://localhost:3000/api/v1
```

### Authentication header

All **authenticated** endpoints require:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

Public endpoints (no token): portal config, enrollment draft/submit (guest), login, OTP send/verify, legal pages.

### Standard success envelope

```json
{
  "success": true,
  "data": { },
  "meta": {
    "timestamp": "2026-07-01T12:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

For list endpoints, wrap array in `data` and optional pagination in `meta`:

```json
{
  "success": true,
  "data": [],
  "meta": { "total": 42, "page": 1, "pageSize": 20 }
}
```

### Standard error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please enter a valid 10-digit mobile number.",
    "details": [
      { "field": "mobile", "message": "Must be 10 digits" }
    ]
  }
}
```

| HTTP | When |
|------|------|
| `400` | Validation / bad input |
| `401` | Missing or expired token |
| `403` | Role/permission denied |
| `404` | Resource not found |
| `409` | Conflict (duplicate application, etc.) |
| `429` | Rate limited (login, OTP) |
| `500` | Server error |

### Roles (`role` field on User)

| Value | Label |
|-------|-------|
| `super_admin` | Super Admin |
| `school_admin` | School Admin |
| `admission_officer` | Admission Officer |
| `accountant` | Accountant |
| `teacher` | Teacher |
| `parent` | Parent |
| `student` | Student |
| `support_staff` | Support Staff |

Defined in `src/constants/roles.js`.

---

## Environment variables

```env
# Server
PORT=3000
NODE_ENV=development
API_BASE_PATH=/api/v1
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/schoolbridge

# Auth
JWT_SECRET=change-me-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Redis (sessions, rate limit, queues)
REDIS_URL=redis://localhost:6379

# Object storage (S3-compatible)
S3_BUCKET=schoolbridge-media
S3_REGION=ap-south-1
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_SIGNED_URL_EXPIRY_SECONDS=900

# Email / SMS
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@schoolbridge.app
SMS_PROVIDER_API_KEY=

# OTP (production)
OTP_LENGTH=6
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5

# Frontend (Vite)
VITE_API_URL=http://localhost:3000/api/v1
```

### Demo credentials (mock only)

| Role | Email | Password | Mobile |
|------|-------|----------|--------|
| Super Admin | `superadmin@schoolbridge.demo` | `123456` | `9000000001` |
| School Admin | `admin@schoolbridge.demo` | `123456` | `9000000002` |
| Parent | `parent@schoolbridge.demo` | `123456` | `9876543210` |

Demo OTP (mock): **`123456`** (expires in 5 minutes).

---

## Shared types

### User (session object — password never returned)

```typescript
interface User {
  id: string;              // e.g. "usr-parent"
  name: string;
  email: string;
  mobile: string;          // 10 digits, no country code
  role: Role;
  schoolId: string | null;  // null for super_admin (platform-level)
  avatar: string | null;
  identity?: string;       // login identifier used (email or mobile)
  loginMethod?: 'email' | 'otp' | 'email_otp' | 'password';
}
```

### Auth tokens

```typescript
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;       // seconds
  tokenType: 'Bearer';
  user: User;
}
```

### Enrollment status enum

```typescript
type EnrollmentStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'correction_required'
  | 'documents_pending'
  | 'documents_verified'
  | 'fee_pending'
  | 'fee_submitted'
  | 'fee_verified'
  | 'approved'
  | 'rejected'
  | 'account_created'
  | 'admission_confirmed';
```

Source: `src/constants/enrollmentStatuses.js`.

### Fee status enum

```typescript
type FeeStatus =
  | 'not_assigned'
  | 'fee_pending'
  | 'payment_submitted'
  | 'verified'
  | 'rejected';
```

### Application (summary)

```typescript
interface EnrollmentApplication {
  id: string;
  applicationNo: string | null;   // null while draft
  status: EnrollmentStatus;
  submittedAt?: string;           // ISO 8601
  createdAt?: string;
  updatedAt?: string;
  parentId: string | null;
  assignedReviewer?: string;
  student: Record<string, unknown>;
  parent: Record<string, unknown>;
  address: Record<string, unknown>;
  academic: Record<string, unknown>;
  medical?: Record<string, unknown>;
  documents: Record<string, DocumentRef>;
  declaration?: Record<string, unknown>;
  signature?: { signed: boolean; date: string };
  statusHistory: StatusHistoryEntry[];
}

interface StatusHistoryEntry {
  status: EnrollmentStatus;
  date: string;
  note: string;
}

interface DocumentRef {
  name: string;
  fileKey?: string;
  status?: 'pending' | 'verified' | 'rejected';
}
```

### Fee record

```typescript
interface FeeRecord {
  id: string;
  applicationId: string;
  applicationNo: string;
  studentName: string;
  classApplying: string;
  status: FeeStatus;
  breakdown: FeeBreakdown | null;
  total: number;
  payment: PaymentInfo | null;
}

interface FeeBreakdown {
  admissionFee: number;
  registrationFee: number;
  tuitionFee: number;
  transportFee: number;
  activityFee: number;
  discount: number;
}

interface PaymentInfo {
  method: string;           // e.g. "bank_transfer", "Bank Transfer"
  transactionId: string;
  amount?: number;
  proofFileKey?: string;
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  receiptNo?: string;       // set after verify, e.g. "RCP-2026-0042"
  rejectedReason?: string;
  rejectedAt?: string;
}
```

### Portal config (full)

```typescript
interface PortalConfig {
  portalName: string;
  tagline: string;
  footerText: string;
  school: {
    id: string;
    name: string;
    academicYear: string;
    address: string;
    phone: string;
    email: string;
  };
  branding: {
    logoUrl: string | null;
    logoIconUrl: string | null;
    faviconUrl: string | null;
    heroImageUrl: string | null;
    loginHeroUrl: string | null;
  };
  theme: {
    brandColor: string;     // e.g. "#1B2E4B"
    accentColor: string;    // e.g. "#0058BE"
  };
  enrollmentTheme: {
    brandNavy: string;
    brandRed: string;
    brandGrayLight: string;
    formBg: string;
  };
  loginMethods: {
    emailLogin: boolean;
    mobileOtp: boolean;
    emailOtp: boolean;
  };
  loginScrollLines: string[];
  enrollmentForm: EnrollmentFormConfig;
  menuVisibility: Record<Role, Record<string, boolean>>;
  /** Global overrides for built-in menu items (label + Lucide icon name) */
  menuCustomization: Record<string, MenuItemCustomization>;
  /** Super-admin-defined extra sidebar links */
  customMenuItems: CustomMenuItem[];
  /** Per-role sidebar order — array of menuIds top to bottom */
  menuOrder: Record<Role, string[]>;
}

interface MenuItemCustomization {
  label?: string;
  icon?: string;   // Lucide icon name, e.g. "Home", "FileText"
}

interface CustomMenuItem {
  id: string;      // e.g. "custom_1720000000"
  label: string;
  icon: string;
  to: string;      // internal route, must start with /
  roles: Role[];
}
```

### Dynamic enrollment form config

```typescript
interface EnrollmentFormConfig {
  steps: EnrollmentStep[];
}

interface EnrollmentStep {
  id: string;
  title: string;
  stepType: 'form' | 'documents' | 'declaration' | 'review';
  sectionKey?: string;      // student | parent | address | academic | medical | documents | declaration
  notes?: string;
  fields?: EnrollmentField[];
  declarations?: DeclarationItem[];
}

interface EnrollmentField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' | 'signature';
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  width?: 'full' | 'half';
  wideLabel?: boolean;
  stacked?: boolean;
  options?: { value: string; label: string }[];
  fileCategory?: 'document' | 'photo';
  validation?: {
    preset?: 'name' | 'email' | 'mobile_in' | 'pincode_in' | 'aadhaar' | 'alphabets' | 'alphanumeric' | 'numeric';
    minLength?: number;
    maxLength?: number;
    minAge?: number;
    maxAge?: number;
    min?: string;
    max?: string;
    pattern?: string;
    patternMessage?: string;
    maxSizeMB?: number;
  };
}

interface DeclarationItem {
  id: string;
  key: string;
  text: string;
  required?: boolean;
}
```

Default schema: `src/data/defaultEnrollmentFormConfig.js`.  
Validation engine: `src/utils/fieldValidation.js` · presets: `src/constants/enrollmentValidation.js`

---

## 1. Authentication

**Mock:** `src/services/authService.js`  
**Frontend:** `src/context/AuthContext.jsx`, `src/pages/auth/Login.jsx`

### `POST /auth/login`

Email + password login.

**Auth:** Public

**Request body:**
```json
{
  "email": "parent@schoolbridge.demo",
  "password": "123456"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {
      "id": "usr-parent",
      "name": "Rajesh Kumar",
      "email": "parent@schoolbridge.demo",
      "mobile": "9876543210",
      "role": "parent",
      "schoolId": "school-1",
      "avatar": null,
      "identity": "parent@schoolbridge.demo",
      "loginMethod": "email"
    }
  }
}
```

**Errors:** `401` — `Invalid email or password.` · `400` — missing email/password

**Mock function:** `authenticateByEmail(email, password)`

---

### `POST /auth/login/otp/send`

Send OTP to registered mobile.

**Auth:** Public

**Request body:**
```json
{
  "channel": "mobile",
  "mobile": "9876543210"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "mobile": "9876543210",
    "expiresIn": 300,
    "message": "OTP sent successfully"
  }
}
```

> Mock returns `demoOtp: "123456"` in dev only — **never in production**.

**Errors:** `400` invalid mobile · `404` no account · `429` rate limited

**Mock function:** `sendLoginOtp(mobile)`

---

### `POST /auth/login/otp/send` (email channel)

**Request body:**
```json
{
  "channel": "email",
  "email": "parent@schoolbridge.demo"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "email": "parent@schoolbridge.demo",
    "expiresIn": 300,
    "message": "OTP sent to your email"
  }
}
```

**Mock function:** `sendEmailLoginOtp(email)`

---

### `POST /auth/login/otp/verify`

Verify OTP and issue tokens.

**Auth:** Public

**Request body (mobile):**
```json
{
  "channel": "mobile",
  "mobile": "9876543210",
  "otp": "123456"
}
```

**Request body (email):**
```json
{
  "channel": "email",
  "email": "parent@schoolbridge.demo",
  "otp": "123456"
}
```

**Response `200`:** Same shape as `POST /auth/login` (`AuthTokens`)

**Errors:** `400` invalid OTP · `410` OTP expired · `404` account not found

**Mock functions:** `verifyLoginOtp(mobile, otp)` · `verifyLoginOtpByChannel(channel, target, otp)`

---

### `POST /auth/refresh`

**Request body:**
```json
{ "refreshToken": "eyJhbG..." }
```

**Response `200`:** New `accessToken` + `expiresIn`

---

### `POST /auth/logout`

**Auth:** Bearer token

**Request body:** `{}` or `{ "refreshToken": "..." }`

**Response `200`:** `{ "success": true, "data": { "message": "Logged out" } }`

**Mock:** `AuthContext.logout()` clears `localStorage` key `schoolbridge_user`

---

### `GET /auth/demo-accounts`

Returns public demo account list (no passwords) for login page.

**Auth:** Public (dev/staging only; disable in production)

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "usr-super-admin",
      "name": "Rakesh Verma",
      "email": "superadmin@schoolbridge.demo",
      "mobile": "9000000001",
      "role": "super_admin",
      "schoolId": "school-1",
      "avatar": null
    }
  ]
}
```

**Mock function:** `getDemoAccounts()`

---

### `POST /auth/forgot-password` *(planned)*

```json
{ "email": "parent@schoolbridge.demo" }
```

---

### `POST /auth/activate` *(planned)*

Parent account activation after admission officer creates account.

---

## 2. Portal & branding

**Mock:** `src/services/portalConfigService.js`  
**Storage key (mock):** `sb_portal_configs` (object keyed by `schoolId`; legacy `sb_portal_config` migrated to `school-1`)  
**Public school selection (mock):** `localStorage` key `sb_public_school_id` (default `school-1`)  
**Admin school selection (mock):** `localStorage` key `sb_admin_selected_school` (super admin only)  
**Frontend:** `src/context/PortalConfigContext.jsx`, `src/pages/admin/PortalSettings.jsx`

### `GET /portal/config`

Public portal branding for landing, login, enroll pages.

**Auth:** Public

**Query:** `schoolId` (optional) — tenant school, e.g. `school-1`. Resolved from subdomain/slug in production.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "portalName": "SchoolBridge",
    "tagline": "School Enrollment Platform",
    "footerText": "© 2026 SchoolBridge Systems. All rights reserved.",
    "school": {
      "id": "school-1",
      "name": "Green Valley International School",
      "academicYear": "2026–2027",
      "address": "123 Education Lane, New Delhi, 110001",
      "phone": "+91 11 4567 8900",
      "email": "admissions@greenvalley.edu.in"
    },
    "branding": {
      "logoUrl": null,
      "logoIconUrl": null,
      "faviconUrl": null,
      "heroImageUrl": "https://...",
      "loginHeroUrl": "https://..."
    },
    "theme": {
      "brandColor": "#1B2E4B",
      "accentColor": "#0058BE"
    },
    "enrollmentTheme": {
      "brandNavy": "#1B2E4B",
      "brandRed": "#C81E1E",
      "brandGrayLight": "#E5E7EB",
      "formBg": "#F3F4F6"
    },
    "loginMethods": {
      "emailLogin": true,
      "mobileOtp": true,
      "emailOtp": true
    },
    "loginScrollLines": [
      "Admissions open for 2026–2027 — enroll online today",
      "Last date for fee submission: 31 July 2026"
    ],
    "enrollmentForm": { "steps": [ ] }
  }
}
```

> Public response may omit `menuVisibility` (admin-only). `enrollmentForm` is required for `/enroll` dynamic form.

**Mock function:** `getPortalConfig()`

---

### `GET /admin/portal-settings`

Full config including `menuVisibility`.

**Auth:** Super Admin, School Admin · permission `manage_portal_settings`  
**Scope:** School Admin may only read/update config for `user.schoolId`. Super Admin passes `schoolId` in query/body (platform-wide).

**Query:** `schoolId` (required for super admin when managing a specific tenant)

**Response `200`:** Full `PortalConfig` object

---

### `PUT /admin/portal-settings`

Update portal settings (partial merge).

**Auth:** Super Admin, School Admin

**Request body (any subset):**
```json
{
  "schoolId": "school-1",
  "portalName": "Green Valley Portal",
  "tagline": "Admissions 2026–2027",
  "footerText": "© 2026 Green Valley School.",
  "school": {
    "name": "Green Valley International School",
    "phone": "+91 11 4567 8900"
  },
  "theme": {
    "brandColor": "#1B2E4B",
    "accentColor": "#C81E1E"
  },
  "loginMethods": {
    "emailLogin": true,
    "mobileOtp": true,
    "emailOtp": false
  },
  "loginScrollLines": [
    "New scroll line 1",
    "New scroll line 2"
  ],
  "enrollmentForm": {
    "steps": [ ]
  }
}
```

**Response `200`:** Updated full `PortalConfig`

**Mock function:** `savePortalConfig(updates)`

---

### `POST /admin/portal-settings/assets`

Upload branding asset (logo, favicon, hero).

**Auth:** Super Admin  
**Content-Type:** `multipart/form-data`

| Field | Type | Values |
|-------|------|--------|
| `type` | string | `logo`, `logo_icon`, `favicon`, `hero`, `login_hero` |
| `file` | file | image |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "type": "logo",
    "url": "https://cdn.../logo.png",
    "fileKey": "branding/school-1/logo-uuid.png"
  }
}
```

**Mock:** `readFileAsDataUrl(file)` stores data URL in config today — production uses S3 signed URL.

---

### `DELETE /admin/portal-settings/assets/:type`

Remove branding asset. `:type` = `logo` | `favicon` | `hero` | `login_hero` | `logo_icon`

**Response `200`:** Updated `branding` object

---

### `PATCH /admin/portal-settings/menus`

Bulk update sidebar menu visibility per role. Supports optional label/icon overrides in the same request.

**Auth:** Super Admin

**Request body:**
```json
{
  "updates": [
    { "role": "parent", "menuId": "parent_photos", "visible": false },
    { "role": "school_admin", "menuId": "admin_audit_logs", "visible": true },
    { "menuId": "admin_applications", "label": "Applications", "icon": "ClipboardList" }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `role` | For visibility | Role key, e.g. `school_admin` |
| `menuId` | Yes | Built-in or custom menu id |
| `visible` | No | Show/hide for that role |
| `label` | No | Override display label (applies globally for that `menuId`) |
| `icon` | No | Lucide icon name (see `src/constants/menuIcons.js`) |

**Response `200`:** Updated `menuVisibility` and `menuCustomization` maps

**Mock function:** `setMenuVisibility(role, menuId, visible)` · `updateMenuItemCustomization(menuId, patch)`

---

### `PATCH /admin/portal-settings/menus/:menuId`

Update label and/or icon for a built-in menu item.

**Auth:** Super Admin

**Request body:**
```json
{
  "label": "Applications",
  "icon": "ClipboardList"
}
```

**Response `200`:** Updated `menuCustomization` entry for `menuId`

**Mock function:** `updateMenuItemCustomization(menuId, patch)`

---

### `GET /admin/portal-settings/menus/custom`

List all custom sidebar menu items.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "custom_1720000000",
      "label": "Help Center",
      "icon": "HelpCircle",
      "to": "/support",
      "roles": ["school_admin", "parent"]
    }
  ]
}
```

---

### `POST /admin/portal-settings/menus/custom`

Add a custom sidebar menu item.

**Request body:**
```json
{
  "id": "custom_1720000000",
  "label": "Help Center",
  "icon": "HelpCircle",
  "to": "/support",
  "roles": ["school_admin"]
}
```

**Validation:** `to` must start with `/`. `id` must be unique. `roles` must be non-empty.

**Response `201`:** Created `CustomMenuItem` + updated config

**Mock function:** `addCustomMenuItem(item)`

---

### `PUT /admin/portal-settings/menus/custom`

Replace entire custom menu items array (bulk save from portal settings form).

**Request body:**
```json
{
  "items": [
    {
      "id": "custom_1720000000",
      "label": "Help Center",
      "icon": "HelpCircle",
      "to": "/support",
      "roles": ["school_admin", "parent"]
    }
  ]
}
```

**Mock function:** `saveCustomMenuItems(items)`

---

### `DELETE /admin/portal-settings/menus/custom/:menuId`

Remove a custom menu item and clear its visibility entries.

**Response `200`:** Updated `customMenuItems` array

**Mock function:** `removeCustomMenuItem(menuId)`

---

### `PATCH /admin/portal-settings/menus/order`

Reorder sidebar menu items for a role (top → bottom).

**Auth:** Super Admin

**Request body:**
```json
{
  "role": "school_admin",
  "order": [
    "admin_dashboard",
    "admin_applications",
    "admin_students",
    "admin_fees",
    "admin_reports",
    "admin_settings"
  ]
}
```

| Field | Description |
|-------|-------------|
| `role` | Role key, e.g. `parent`, `school_admin` |
| `order` | Full ordered list of `menuId` values for that role (built-in + custom) |

**Response `200`:** Updated `menuOrder` map

**Mock function:** `reorderMenuItems(role, order)` · also saved via `PUT /admin/portal-settings` with `menuOrder` in body

---

## 3. Enrollment

**Mock:** `src/services/enrollmentService.js`  
**Storage key (mock):** `sb_applications`  
**Pages:** `/enroll`, `/admin/applications`, `/admin/applications/:id`, parent dashboard

### `GET /enrollment/form-schema`

Returns `enrollmentForm` from portal config (alias of public field in `GET /portal/config`).

**Auth:** Public

---

### `GET /enrollment/my-application`

Parent's own application.

**Auth:** Parent

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "app-001",
    "applicationNo": "GVIS-2026-0001",
    "status": "under_review",
    "student": { "fullName": "Aarav Kumar", "classApplying": "ukg" },
    "parent": { },
    "address": { },
    "academic": { },
    "documents": { },
    "statusHistory": [ ]
  }
}
```

`data: null` if no application.

**Mock function:** `getApplicationByParent(parentId)`

---

### `POST /enrollment/draft`

Create new draft application.

**Auth:** Public (guest) or Parent

**Request body:** Dynamic form sections keyed by `sectionKey`:
```json
{
  "student": {
    "fullName": "Aarav Kumar",
    "dateOfBirth": "2019-03-12",
    "gender": "male",
    "classApplying": "ukg"
  },
  "parent": {
    "fatherName": "Rajesh Kumar",
    "fatherMobile": "9876543211"
  },
  "address": { },
  "academic": { },
  "medical": { },
  "documents": { },
  "declaration": { }
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "app-draft-1720000000000",
    "applicationNo": null,
    "status": "draft",
    "createdAt": "2026-07-01T10:00:00.000Z",
    "student": { },
    "parent": { }
  }
}
```

**Mock function:** `saveDraft(formData, null)`

---

### `PUT /enrollment/draft/:id`

Update existing draft.

**Auth:** Public (guest with draft id) or Parent (owner)

**Request body:** Same as POST draft (partial merge allowed)

**Response `200`:** Updated application with `status: "draft"`

**Mock function:** `saveDraft(formData, existingId)`

---

### `POST /enrollment/submit`

Final submit — assigns application number, sets status `submitted`.

**Auth:** Public or Parent

**Request body:**
```json
{
  "draftId": "app-draft-1720000000000",
  "student": { },
  "parent": { },
  "address": { },
  "academic": { },
  "medical": { },
  "documents": { },
  "declaration": { "accuracyConfirmed": true },
  "signature": { "signed": true, "date": "2026-07-01" }
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "app-1720000000000",
    "applicationNo": "GVIS-2026-4521",
    "status": "submitted",
    "submittedAt": "2026-07-01T10:05:00.000Z",
    "parentId": "usr-parent",
    "assignedReviewer": "Priya Sharma",
    "statusHistory": [
      {
        "status": "submitted",
        "date": "2026-07-01T10:05:00.000Z",
        "note": "Application submitted by parent"
      }
    ]
  }
}
```

**Mock function:** `submitApplication(formData, existingId, parentId)`

---

### `GET /admin/applications`

List all applications (admin).

**Auth:** `school_admin`, `admission_officer`, `super_admin`

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by `EnrollmentStatus` |
| `parentId` | string | Filter by parent user id |
| `page` | number | Pagination |
| `pageSize` | number | Default 20 |

**Response `200`:** Array of `EnrollmentApplication`

**Mock function:** `getApplications(filters)`

---

### `GET /admin/applications/:id`

Single application detail.

**Auth:** Admin roles

**Response `200`:** `EnrollmentApplication`  
**Response `404`:** Not found

**Mock function:** `getApplication(id)`

---

### `GET /admin/dashboard/stats`

Admin dashboard counters.

**Auth:** Admin roles

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "total": 12,
    "pendingReview": 3,
    "correctionRequired": 1,
    "documentsPending": 2,
    "feePending": 2,
    "feeSubmitted": 1,
    "confirmed": 1,
    "rejected": 0,
    "accountsCreated": 1
  }
}
```

**Mock function:** `getDashboardStats()`

---

### `POST /admin/applications/:id/request-correction`

**Auth:** Admission Officer, School Admin

**Request body:**
```json
{
  "reason": "Birth certificate image is blurry. Please re-upload a clear scan."
}
```

**Response `200`:** Application with `status: "correction_required"`

**Mock function:** `requestCorrection(id, reason)`

---

### `POST /admin/applications/:id/verify-documents`

**Request body:** `{}`

**Response `200`:** `status: "documents_verified"`

**Mock function:** `verifyDocuments(id)`

---

### `POST /admin/applications/:id/approve`

**Response `200`:** `status: "fee_pending"` (fee assignment may follow)

**Mock function:** `approveApplication(id)`

---

### `POST /admin/applications/:id/reject`

**Request body:**
```json
{ "reason": "Age criteria not met for selected class." }
```

**Response `200`:** `status: "rejected"`

**Mock function:** `rejectApplication(id, reason)`

---

### `POST /admin/applications/:id/assign-fee`

Assign fee structure to application.

**Auth:** School Admin, Accountant

**Request body:**
```json
{
  "breakdown": {
    "admissionFee": 15000,
    "registrationFee": 5000,
    "tuitionFee": 42000,
    "transportFee": 10000,
    "activityFee": 3000,
    "discount": 0
  }
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "fee": {
      "id": "fee-1720000000000",
      "applicationId": "app-002",
      "applicationNo": "GVIS-2026-0002",
      "studentName": "Isha Patel",
      "classApplying": "1",
      "status": "fee_pending",
      "breakdown": { },
      "total": 75000,
      "payment": null
    },
    "application": { "status": "fee_pending" }
  }
}
```

**Mock function:** `assignFee(applicationId, applicationNo, studentName, classApplying, breakdown)`

---

### `POST /admin/applications/:id/create-account`

**Response `200`:** `status: "account_created"`

**Mock function:** `createAccount(id)`

---

### `POST /admin/applications/:id/confirm-admission`

**Response `200`:** `status: "admission_confirmed"`

**Mock function:** `confirmAdmission(id)`

---

### Enrollment status workflow

```
draft → submitted → under_review → correction_required
  → documents_verified → fee_pending → fee_submitted
  → fee_verified → approved → account_created → admission_confirmed
```

Rejected can occur from `under_review` or later stages.

---

## 4. Documents & file upload

**Mock:** `src/services/uploadService.js`  
**Production flow:** signed S3 URL

### `POST /documents/upload`

Request signed upload URL.

**Auth:** Authenticated or guest (enrollment session token)

**Request body:**
```json
{
  "fileName": "birth_cert.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 245000,
  "category": "document",
  "fieldKey": "birthCertificate",
  "applicationId": "app-draft-123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.../signed",
    "fileKey": "enrollment/school-1/app-draft-123/birthCertificate/uuid.pdf",
    "expiresAt": "2026-07-01T10:15:00.000Z"
  }
}
```

---

### `PUT <signed-upload-url>`

Client uploads file bytes directly to S3. Not a SchoolBridge route.

---

### `POST /documents/confirm`

Confirm upload completed; backend validates MIME + size.

**Request body:**
```json
{
  "fileKey": "enrollment/school-1/.../uuid.pdf",
  "fieldKey": "birthCertificate",
  "applicationId": "app-draft-123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "name": "birth_cert.pdf",
    "size": 245000,
    "type": "application/pdf",
    "fieldKey": "birthCertificate",
    "fileKey": "enrollment/.../uuid.pdf",
    "uploadedAt": "2026-07-01T10:10:00.000Z",
    "status": "uploaded"
  }
}
```

**Mock function:** `uploadFile({ file, fieldKey, onProgress, isOnline, signal })` returns:
```json
{
  "success": true,
  "status": "uploaded",
  "data": {
    "name": "birth_cert.pdf",
    "size": 245000,
    "type": "application/pdf",
    "fieldKey": "birthCertificate",
    "uploadedAt": "2026-07-01T10:10:00.000Z",
    "fileKey": "mock/birthCertificate/1720000000000-birth_cert.pdf"
  }
}
```

---

### `GET /documents/:fileKey/download`

Returns short-lived signed download URL.

**Auth:** Owner, admin, or role with document access

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://s3.../signed-download",
    "expiresAt": "2026-07-01T10:25:00.000Z"
  }
}
```

---

## 5. Fees

**Mock:** `src/services/feeService.js`  
**Storage key (mock):** `sb_fees`  
**Pages:** `/parent/fees`, `/admin/fees`, application review

### `GET /fees/my-fee`

Parent fee for their application.

**Auth:** Parent

**Query:** `applicationId` (optional if parent has one app)

**Response `200`:** `FeeRecord` or `null`

**Mock function:** `getFeeByApplication(applicationId)`

---

### `GET /admin/fees`

List all fee records.

**Auth:** `accountant`, `school_admin`, `super_admin`

**Query params:** `status`, `applicationId`

**Response `200`:** `FeeRecord[]`

**Mock function:** `getFees(filters)`

---

### `POST /fees/:feeId/submit-payment`

Parent submits payment proof.

**Auth:** Parent

**Request body:**
```json
{
  "method": "bank_transfer",
  "transactionId": "TXN20260701001",
  "amount": 75000,
  "proofFileKey": "payments/fee-001/proof.jpg"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "fee-001",
    "status": "payment_submitted",
    "payment": {
      "method": "bank_transfer",
      "transactionId": "TXN20260701001",
      "amount": 75000,
      "submittedAt": "2026-07-01T11:00:00.000Z"
    }
  }
}
```

Also updates application status → `fee_submitted`.

**Mock function:** `submitPayment(feeId, payment)`

---

### `POST /admin/fees/:feeId/verify`

Accountant verifies payment.

**Auth:** `accountant`, `school_admin`

**Request body:**
```json
{
  "verifiedBy": "Priya Sharma",
  "note": "Amount matched bank statement"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "fee-001",
    "status": "verified",
    "payment": {
      "method": "bank_transfer",
      "transactionId": "TXN20260701001",
      "verifiedAt": "2026-07-01T12:00:00.000Z",
      "verifiedBy": "Priya Sharma",
      "receiptNo": "RCP-2026-4521"
    }
  }
}
```

Application status → `fee_verified`.

**Mock function:** `verifyPayment(feeId, verifiedBy)`

---

### `POST /admin/fees/:feeId/reject`

**Request body:**
```json
{
  "reason": "Transaction ID does not match bank records."
}
```

**Response `200`:** `status: "fee_pending"` with `payment.rejectedReason`

**Mock function:** `rejectPayment(feeId, reason)`

---

### `GET /admin/fees/:feeId/receipt`

Download fee receipt (PDF).

**Auth:** Parent (own fee), Accountant, Admin

**Response `200`:** `Content-Type: application/pdf` or signed URL

**Frontend today:** `downloadFeeReceipt()` in `src/utils/feeReceipt.js` generates HTML client-side when `payment.receiptNo` exists.

---

## 6. Media & photos

**Mock:** `src/services/mediaService.js`  
**Storage key (mock):** `sb_photos`

### `GET /media/photos`

**Auth:** Teacher, Parent, Admin

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `studentId` | string | Parent: filter photos for their child |
| `className` | string | Teacher filter |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "photo-1720000000000",
      "teacherId": "usr-teacher",
      "teacherName": "Anita Verma",
      "className": "UKG-A",
      "caption": "Art class today!",
      "sentAt": "2026-07-01T09:00:00.000Z",
      "recipients": "class",
      "studentIds": [],
      "imageUrl": "https://cdn.../photo.jpg"
    }
  ]
}
```

**Mock function:** `getPhotos(filters)`

---

### `POST /media/photos`

Teacher sends photos to class or selected students.

**Auth:** Teacher

**Content-Type:** `multipart/form-data` or JSON with `imageFileKey` after upload

**Request body (JSON after upload):**
```json
{
  "className": "UKG-A",
  "caption": "Art class today!",
  "recipients": "class",
  "studentIds": [],
  "imageFileKey": "photos/uuid.jpg"
}
```

`recipients`: `"class"` | `"selected"` — if `selected`, `studentIds` required.

**Response `201`:** Created photo object

**Mock function:** `sendPhotos({ className, caption, recipients, studentIds, imageUrl })`

---

### `DELETE /media/photos/:id`

**Auth:** Teacher (own), School Admin

**Response `200`:** `{ "success": true }`

---

## 7. Chat

**Mock:** `src/services/chatService.js`  
**Storage keys:** `sb_conversations`, `sb_messages`  
**Real-time:** WebSocket `WS /chat`

### `GET /chat/conversations`

**Auth:** Any authenticated user

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "conv-001",
      "participants": ["usr-parent", "usr-teacher"],
      "participantNames": {
        "usr-parent": "Rajesh Kumar",
        "usr-teacher": "Anita Verma"
      },
      "lastMessage": "Thank you for the update.",
      "lastMessageAt": "2026-06-20T11:30:00Z",
      "unread": { "usr-parent": 0, "usr-teacher": 1 },
      "role": "teacher"
    }
  ]
}
```

**Mock function:** `getConversationsForUser(userId)`

---

### `GET /chat/conversations/:id/messages`

**Query:** `limit`, `before` (cursor pagination)

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "m1",
      "senderId": "usr-teacher",
      "text": "Hello Mr. Kumar!",
      "sentAt": "2026-06-20T10:00:00Z"
    }
  ]
}
```

**Mock function:** `getMessages(conversationId)`

---

### `POST /chat/conversations/:id/messages`

**Request body:**
```json
{
  "text": "Thank you for the update about Aarav."
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "m-1720000000000",
    "senderId": "usr-parent",
    "text": "Thank you for the update about Aarav.",
    "sentAt": "2026-07-01T10:00:00.000Z"
  }
}
```

**Mock function:** `sendMessage(conversationId, senderId, text)`

---

### `POST /chat/conversations/:id/read`

Mark conversation read for current user.

**Request body:** `{}`

**Mock function:** `markConversationRead(conversationId, userId)`

---

### WebSocket events *(planned)*

| Event | Direction | Payload |
|-------|-----------|---------|
| `message:new` | server → client | `{ conversationId, message }` |
| `message:send` | client → server | `{ conversationId, text }` |
| `typing` | both | `{ conversationId, userId }` |

---

## 8. Notifications

**Mock:** `src/services/notificationService.js`  
**Storage key:** `sb_notifications`

### `GET /notifications`

**Auth:** Authenticated

**Query:** `unreadOnly=true` (optional)

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "n2",
      "userId": "usr-parent",
      "title": "Under Review",
      "message": "Your application is now under review.",
      "type": "enrollment",
      "read": false,
      "createdAt": "2026-06-16T09:00:00Z"
    }
  ],
  "meta": { "unreadCount": 2 }
}
```

`type`: `enrollment` | `fee` | `photo` | `chat` | `system`

**Mock function:** `getNotifications(userId)`

---

### `POST /notifications/:id/read`

**Response `200`:** `{ "success": true, "data": { "id": "n2", "read": true } }`

**Mock function:** `markAsRead(id)`

---

### `POST /notifications/read-all`

**Response `200`:** `{ "success": true, "data": { "marked": 5 } }`

**Mock function:** `markAllRead(userId)`

---

## 9. User profile

**Today:** `AuthContext.updateProfile()` updates `localStorage` only — **no API call**.

### `GET /users/me`

**Auth:** Bearer

**Response `200`:** `User` object

---

### `PATCH /users/me`

Update name, mobile, avatar.

**Request body:**
```json
{
  "name": "Rajesh Kumar",
  "mobile": "9876543211"
}
```

**Response `200`:** Updated `User`

**Frontend:** `src/pages/shared/Profile.jsx` → `updateProfile({ name, mobile })`

---

### `POST /users/me/change-password`

**Request body:**
```json
{
  "currentPassword": "123456",
  "newPassword": "newSecurePass1"
}
```

**Response `200`:** `{ "success": true, "message": "Password updated" }`

**Errors:** `400` wrong current password · `422` weak password

---

## 10. Support & legal pages

**Today:** Static content in `src/constants/footerPagesContent.js`. Support form shows toast only.

### `GET /support/status`

System status page data.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "overall": "operational",
    "lastChecked": "2026-07-01T10:00:00Z",
    "services": [
      { "name": "Enrollment Portal", "status": "operational" },
      { "name": "Parent Login", "status": "operational" },
      { "name": "Fee Payments", "status": "operational" }
    ]
  }
}
```

---

### `POST /support/tickets`

Direct support form (`/support`).

**Request body:**
```json
{
  "name": "Rajesh Kumar",
  "contact": "rajesh@email.com",
  "message": "I cannot see my fee receipt."
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "ticketId": "TKT-2026-001",
    "message": "We received your request. Our team will respond within 24 hours."
  }
}
```

---

### Legal content routes *(static or CMS)*

| Route | Content source today |
|-------|---------------------|
| `/security-policy` | `footerPagesContent.securityPolicy` |
| `/terms-of-use` | `footerPagesContent.termsOfUse` |
| `/system-status` | `footerPagesContent.systemStatus` |
| `/support` | `footerPagesContent.support` |

Optional API: `GET /portal/legal/:slug`

---

## 11. Navigation

### `GET /navigation`

Returns visible sidebar menu for current user's role.

**Auth:** Bearer

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "role": "parent",
    "items": [
      { "id": "parent_dashboard", "label": "Dashboard", "path": "/parent/dashboard", "icon": "LayoutDashboard" },
      { "id": "parent_fees", "label": "Fees", "path": "/parent/fees", "icon": "CreditCard" }
    ]
  }
}
```

Filtered server-side using `menuVisibility` from portal config + role permissions.

**Source:** `src/constants/navigation.js` + `portalConfig.menuVisibility` + `menuCustomization` + `customMenuItems` + `menuOrder`

---

## Mock → API mapping (complete)

| Mock function | HTTP | Endpoint |
|---------------|------|----------|
| `authenticateByEmail` | POST | `/auth/login` |
| `sendLoginOtp` | POST | `/auth/login/otp/send` |
| `sendEmailLoginOtp` | POST | `/auth/login/otp/send` |
| `verifyLoginOtp` / `verifyLoginOtpByChannel` | POST | `/auth/login/otp/verify` |
| `getDemoAccounts` | GET | `/auth/demo-accounts` |
| `getPortalConfig` | GET | `/portal/config` |
| `savePortalConfig` | PUT | `/admin/portal-settings` |
| `setMenuVisibility` | PATCH | `/admin/portal-settings/menus` |
| `updateMenuItemCustomization` | PATCH | `/admin/portal-settings/menus/:menuId` |
| `addCustomMenuItem` | POST | `/admin/portal-settings/menus/custom` |
| `saveCustomMenuItems` | PUT | `/admin/portal-settings/menus/custom` |
| `removeCustomMenuItem` | DELETE | `/admin/portal-settings/menus/custom/:menuId` |
| `reorderMenuItems` | PATCH | `/admin/portal-settings/menus/order` |
| `getApplications` | GET | `/admin/applications` |
| `getApplication` | GET | `/admin/applications/:id` |
| `getApplicationByParent` | GET | `/enrollment/my-application` |
| `saveDraft` | POST/PUT | `/enrollment/draft` / `/enrollment/draft/:id` |
| `submitApplication` | POST | `/enrollment/submit` |
| `getDashboardStats` | GET | `/admin/dashboard/stats` |
| `requestCorrection` | POST | `/admin/applications/:id/request-correction` |
| `verifyDocuments` | POST | `/admin/applications/:id/verify-documents` |
| `approveApplication` | POST | `/admin/applications/:id/approve` |
| `rejectApplication` | POST | `/admin/applications/:id/reject` |
| `assignFee` | POST | `/admin/applications/:id/assign-fee` |
| `createAccount` | POST | `/admin/applications/:id/create-account` |
| `confirmAdmission` | POST | `/admin/applications/:id/confirm-admission` |
| `uploadFile` | POST | `/documents/upload` + `/documents/confirm` |
| `getFees` | GET | `/admin/fees` |
| `getFeeByApplication` | GET | `/fees/my-fee` |
| `submitPayment` | POST | `/fees/:feeId/submit-payment` |
| `verifyPayment` | POST | `/admin/fees/:feeId/verify` |
| `rejectPayment` | POST | `/admin/fees/:feeId/reject` |
| `getPhotos` | GET | `/media/photos` |
| `sendPhotos` | POST | `/media/photos` |
| `getConversationsForUser` | GET | `/chat/conversations` |
| `getMessages` | GET | `/chat/conversations/:id/messages` |
| `sendMessage` | POST | `/chat/conversations/:id/messages` |
| `markConversationRead` | POST | `/chat/conversations/:id/read` |
| `getNotifications` | GET | `/notifications` |
| `markAsRead` | POST | `/notifications/:id/read` |
| `markAllRead` | POST | `/notifications/read-all` |
| `updateProfile` | PATCH | `/users/me` |

---

## localStorage keys (mock dev only)

| Key | Data |
|-----|------|
| `schoolbridge_user` | Logged-in user session |
| `sb_portal_config` | Portal branding + enrollment form |
| `sb_applications` | Enrollment applications |
| `sb_fees` | Fee records |
| `sb_photos` | Teacher photo gallery |
| `sb_conversations` | Chat threads |
| `sb_messages` | Chat messages by conversation id |
| `sb_notifications` | In-app notifications |
| `sb_login_otp` | OTP session (sessionStorage in mock) |

---

## Frontend integration (when backend is ready)

```javascript
// src/services/api/client.js (create)
const API_BASE = import.meta.env.VITE_API_URL;

export async function api(path, options = {}) {
  const token = localStorage.getItem('sb_access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}
```

Replace each mock service function with `api('/endpoint', { method, body })` using the contracts above.

---

## 12. School settings

**Frontend:** `src/pages/admin/AdminSettings.jsx` · **Mock:** `src/services/settingsService.js`

### `GET /admin/settings`

School-wide configuration (academic year, admissions, notifications).

**Auth:** School Admin, Admission Officer · permission `manage_school_settings`

**Response `data`:**

```typescript
interface SchoolSettings {
  academicYear: string;
  admissionsOpen: boolean;
  enrollmentDeadline: string;      // ISO date
  admissionStartDate: string;
  timezone: string;
  currency: string;
  lateFeePercent: number;
  gracePeriodDays: number;
  documents: {
    requireParentId: boolean;
    maxUploadSizeMb: number;
    allowedFormats: string[];
  };
  notifications: {
    emailOnApplicationSubmitted: boolean;
    emailOnFeeVerified: boolean;
    smsOnAdmissionConfirmed: boolean;
    dailyDigest: boolean;
    parentPhotoAlerts: boolean;
  };
  updatedAt: string;
  updatedBy: string;
}
```

### `PUT /admin/settings`

Partial update of school settings. Creates audit log entry `settings.updated`.

**Body:** partial `SchoolSettings` (omit `updatedAt`, `updatedBy` — set server-side).

### `GET /admin/settings/fee-structures`

List default fee breakdowns per class.

**Response `data`:** `FeeStructure[]`

```typescript
interface FeeStructure {
  id: string;
  classApplying: string;
  label: string;
  breakdown: FeeBreakdown;
  total: number;
  active: boolean;
  updatedAt: string;
  updatedBy: string;
}
```

### `PUT /admin/settings/fee-structures/:id`

Update fee breakdown for a class. Creates audit log `fee_structure.updated`.

**Body:** `{ breakdown: FeeBreakdown }`

### `PATCH /admin/settings/fee-structures/:id`

Toggle active state.

**Body:** `{ active: boolean }`

---

## 13. Reports

**Frontend:** `src/pages/admin/AdminReports.jsx` · **Mock:** `src/services/reportsService.js`

### `GET /admin/reports/summary`

Aggregated stats for dashboard cards.

**Query:** `periodDays` — `7` | `30` | `90` | `all`

**Response `data`:**

```json
{
  "applications": { "total": 12, "underReview": 3, "approved": 7, "rejected": 1 },
  "fees": { "totalRecords": 5, "collected": 71000, "pending": 75000, "verified": 1 },
  "communications": { "photosShared": 3, "notificationsSent": 8, "classesReached": 2 },
  "periodDays": "30"
}
```

### `GET /admin/reports/:type`

Detailed report rows. **`:type`** = `applications` | `fees` | `communications`

**Query:** `periodDays`

**Response `data`:** `{ summary: object, rows: array }`

### `POST /admin/reports/:type/export`

Generate CSV export (or return signed download URL in production).

**Body:** `{ periodDays: string }`

**Response `data`:** `{ type, periodDays, rows, exportedAt }`

---

## 14. Audit logs

**Frontend:** `src/pages/admin/AdminAuditLogs.jsx` · **Mock:** `src/services/auditService.js`

### `GET /admin/audit-logs`

Paginated activity log for compliance and accountability.

**Auth:** School Admin, Super Admin · permission `view_audit_logs`

**Query filters:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Match user name, summary, resource ID |
| `action` | string | e.g. `application.approved`, `fee.verified` |
| `from` | ISO datetime | Start of range |
| `to` | ISO datetime | End of range |
| `page` | number | Default 1 |
| `pageSize` | number | Default 50 |

**Response `data`:** `AuditLogEntry[]`

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: Role;
  action: string;
  resource: string;
  resourceId: string;
  summary: string;
  ipAddress: string;
}
```

**Actions (enum):** `application.approved`, `application.rejected`, `documents.verified`, `fee.assigned`, `fee.verified`, `fee_structure.updated`, `settings.updated`, `photo.sent`, `message.sent`, `account.created`, `admission.confirmed`

Server should append audit entries on every mutating admin action (see queue job `audit-log`).

---

## 15. Multi-tenant & schools

**Mock:** `src/data/mockSchools.js` (seed only), `src/services/schoolService.js`, `src/services/platformConfigService.js`, `src/services/userService.js`  
**Frontend:** `src/pages/public/Landing.jsx` (platform + school), `src/pages/admin/AdminSchools.jsx`, `src/pages/admin/AdminUsers.jsx`, `src/pages/admin/AdminTeachers.jsx`

Each school is a **tenant**. Portal branding, enrollment form, theme, and side menus are stored **per `schoolId`**. Super Admin is platform-level (`user.schoolId = null`) and can switch schools. School Admin manages only their assigned school.

### Public URL routing (frontend)

| Path | Behavior |
|------|----------|
| `/` | **Platform home** — original marketing landing page (hero, programs, about). No school picker. Schools are reached via `/{slug}`. |
| `/{schoolSlug}` | School landing page — tenant resolved from URL slug via `GET /schools/:slug`. |
| `/{schoolSlug}/enroll` | School enrollment form for that tenant. |
| `/enroll` | Redirects to `/` (pick a school first). |

Reserved slugs (`admin`, `login`, `parent`, `teacher`, etc.) are not treated as school tenants.

### `GET /platform/config`

**Auth:** None (public)

Platform-level branding for the main homepage (`/`).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "platformName": "SchoolBridge",
    "tagline": "Multi-school enrollment platform"
  }
}
```

**Mock function:** `getPlatformConfig()`

---

### `PUT /admin/platform-settings`

**Auth:** Super Admin

Update main portal branding shown on `/` (platform homepage).

**Body:**
```json
{
  "platformName": "SchoolBridge",
  "tagline": "Multi-school enrollment platform"
}
```

**Mock function:** `savePlatformConfig(updates)`  
**Frontend:** `src/pages/admin/AdminSchools.jsx` — Main Portal section

---

### `GET /schools`

**Auth:** None (public)

List all active schools for the platform homepage and school picker.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "school-1",
      "slug": "green-valley",
      "name": "Green Valley International School",
      "academicYear": "2026–2027",
      "address": "123 Education Lane, New Delhi, 110001",
      "phone": "+91 11 4567 8900",
      "email": "admissions@greenvalley.edu.in",
      "status": "active"
    }
  ]
}
```

**Mock function:** `listSchools()`  
**Storage key:** `sb_schools` (seeded from `MOCK_SCHOOLS` on first load)

---

### `GET /schools/:slug`

**Auth:** None (public)

Resolve a single school by URL slug. Returns `404` if slug is unknown or reserved.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "school-1",
    "slug": "green-valley",
    "name": "Green Valley International School",
    "academicYear": "2026–2027",
    "status": "active"
  }
}
```

**Mock function:** `getSchoolBySlugApi(slug)`

### Database schema (recommended)

```sql
CREATE TABLE schools (
  id            TEXT PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  academic_year TEXT,
  address       TEXT,
  phone         TEXT,
  email         TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE portal_configs (
  school_id     TEXT PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  config_json   JSONB NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  school_id     TEXT REFERENCES schools(id),  -- NULL for super_admin
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  mobile        TEXT,
  role          TEXT NOT NULL,
  password_hash TEXT,
  avatar_url    TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### `GET /admin/schools`

**Auth:** Super Admin

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "school-1",
      "slug": "green-valley",
      "name": "Green Valley International School",
      "academicYear": "2026–2027",
      "status": "active"
    }
  ]
}
```

**Mock function:** `listSchoolsAdmin()`

---

### `GET /admin/schools/:schoolId`

**Auth:** Super Admin

**Mock function:** `getSchool(schoolId)`

---

### `GET /admin/users`

List users across the platform (super admin) or scoped to a school.

**Auth:** Super Admin

**Query:** `schoolId?`, `role?`, `search?`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "usr-teacher",
      "name": "Meera Iyer",
      "email": "teacher@schoolbridge.demo",
      "mobile": "9000000005",
      "role": "teacher",
      "schoolId": "school-1",
      "schoolName": "Green Valley International School"
    }
  ]
}
```

**Mock function:** `listUsers({ schoolId, role, search })`

---

### `GET /admin/teachers`

**Auth:** School Admin, Super Admin

**Query:** `schoolId` (required for super admin; inferred from JWT for school admin)

**Mock function:** `listTeachers(schoolId)`

---

## 16. Teacher classes

**Mock:** `src/services/teacherService.js`, `src/data/mockPhotos.js` (`TEACHER_CLASSES`)  
**Frontend:** `src/pages/teacher/TeacherClasses.jsx` — route `/teacher/classes`

### `GET /teacher/classes`

Assigned classes for the logged-in teacher.

**Auth:** Teacher

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "class-ukg-a",
      "name": "UKG-A",
      "section": "A",
      "grade": "UKG",
      "studentCount": 28,
      "schoolId": "school-1"
    }
  ]
}
```

**Mock function:** `getTeacherClasses(teacherId)`

---

## Backend stack (recommended)

| Library | Purpose |
|---------|---------|
| Node.js + NestJS | API framework |
| PostgreSQL | Primary database |
| Prisma | ORM + migrations |
| Redis | Cache, sessions, rate limiting |
| BullMQ | Background jobs (email, receipts, image processing) |
| Socket.io | Real-time chat |
| Sharp | Image compression |
| Multer / Busboy | Multipart parsing |
| JWT | Access + refresh tokens |
| S3-compatible storage | Private files |
| PDFKit / Puppeteer | Receipt PDF generation |

---

## Permission matrix (server-side enforcement)

| Role | Key access |
|------|------------|
| Super Admin | All schools, all users, portal settings (any school), platform config |
| School Admin | Own school portal branding, teachers list, full school management |
| Admission Officer | Applications, documents, approve for fee |
| Accountant | Fees, payments, receipts |
| Teacher | Assigned classes, photos, chat |
| Parent | Own child application, fees, photos, chat |
| Student | Own profile, notices |
| Support Staff | Support tickets only |

Frontend menu hiding is **not sufficient** — every endpoint must verify role + school scope.

---

## Queue jobs (background)

| Job | Trigger |
|-----|---------|
| `send-email` | Enrollment submitted, correction, fee verified |
| `send-sms` | OTP, admission confirmed |
| `compress-image` | Teacher/student photo uploaded |
| `generate-receipt` | Payment verified |
| `virus-scan` | Document uploaded |
| `audit-log` | All admin actions |

---

*Frontend stack: [FRONTEND_STACK.md](./FRONTEND_STACK.md) · Mock services: `src/services/` · Default portal: `src/data/defaultPortalConfig.js`*
