# KidsActivites — Frontend Stack & Requirements

> Production-ready, premium school enrollment and communication system with complete role-based permissions, professional responsive UI, reusable design components, toast notifications, modal popups, icon system, upload management, offline/slow-internet handling, resumable upload support, secure private file storage, mobile/tablet/laptop/desktop-first layouts, validation, audit logs, and complete admin, teacher, parent, and student workflows.

---

## 1. Mandatory Frontend Library Stack

| Library | Purpose | Status |
|---------|---------|--------|
| **React** | Component-based UI | ✅ Active |
| **Vite** | Build tool | ✅ Active |
| **TypeScript** | Type safety | 🔲 Planned migration |
| **Tailwind CSS** | Responsive styling | ✅ Configured |
| **Radix UI** | Accessible primitives | ✅ Dependencies added |
| **shadcn/ui** | Premium components | 🔲 Install via CLI when migrating UI |
| **Lucide Icons** | Icon system | ✅ Active |
| **React Hook Form** | Form handling | ✅ Dependency added |
| **Zod** | Schema validation | ✅ Enrollment schemas |
| **TanStack Query** | API state, cache, offline | ✅ Provider configured |
| **Zustand** | Network + upload state | ✅ Active |
| **Sonner** | Toast notifications | ✅ Active |
| **Uppy** | Advanced uploads | ✅ Dependencies added |
| **signature_pad** | Digital signature | ✅ Active |
| **Socket.io Client** | Real-time chat | ✅ Dependency added |
| **date-fns** | Date formatting | ✅ Dependency added |

---

## 2. Project Structure

```
src/
  components/
    ui/           # Buttons, inputs, modals
    upload/       # SmartFileUpload (network-aware)
    layout/       # Dashboard layout
  constants/      # Roles, permissions, statuses
  context/        # Auth, toast (Sonner bridge)
  data/           # Mock data
  hooks/          # useNetworkStatus, usePermission
  providers/      # TanStack Query + Sonner
  schemas/        # Zod validation schemas
  services/       # Mock API + upload service
  store/          # Zustand: network, upload queue
  styles/         # global.css + Tailwind
  pages/          # Feature pages by role
```

---

## 3. Upload System

### Upload Categories

| Category | Max Size | Types |
|----------|----------|-------|
| Student photo | 2 MB | JPG, JPEG, PNG, WEBP |
| Documents | 5 MB | PDF, JPG, JPEG, PNG |
| Payment proof | 5 MB | PDF, JPG, JPEG, PNG |
| Teacher photos | 10 MB | JPG, JPEG, PNG, WEBP |
| Chat attachments | 10 MB | PDF, images, DOC, XLS |

### Upload Status Values

`not_selected` → `selected` → `uploading` → `uploaded`

Network interruption: `paused` / `waiting_for_internet` → `retrying` → `uploaded` or `failed`

### Network Behavior

| State | Behavior |
|-------|----------|
| Online | Upload starts, progress shown |
| Slow | Warning toast, upload continues |
| Offline | Pause upload, keep files in queue, disable submit if incomplete |
| Reconnected | "Connection restored" toast, auto-resume pending uploads |

### Component

`src/components/upload/SmartFileUpload.jsx` — network-aware upload with progress, retry, preview, remove.

### Toast Messages (Upload)

- You are offline. Upload will resume when the connection is restored.
- Connection restored. Resuming pending uploads.
- Upload paused due to network issue.
- Upload failed. Please retry.
- File uploaded successfully.
- Some files are still uploading. Please wait before submitting.

---

## 4. Toast System (Sonner)

**Placement:** Top-right (desktop/laptop), top-center (mobile/tablet)

**Types:** success, error, warning, info, loading, network, permission

Implemented via `src/context/ToastContext.jsx` (Sonner bridge) + `<Toaster />` in `AppProviders`.

---

## 5. Modal System

**Library:** Radix Dialog (shadcn/ui Dialog recommended for full migration)

**Required modals:** Submit enrollment, save draft, leave unsaved, delete/replace document, correction, reject, approve, assign fee, verify/reject payment, create account, confirm admission, send photos, logout, session expired.

Current: `src/components/ui/Modal.jsx` — migrate to Radix Dialog.

---

## 6. Icon System

**Library:** Lucide Icons only (18px sidebar, 20px buttons, 24px cards, 48px empty states)

| Module | Icon |
|--------|------|
| Dashboard | Home |
| Enrollment | FileText |
| Students | GraduationCap |
| Parents | Users |
| Teachers | UserCheck |
| Fees | CreditCard |
| Documents | FolderOpen |
| Upload | UploadCloud |
| Photos | Image |
| Chat | MessageCircle |
| Notifications | Bell |
| Network offline | WifiOff |

---

## 7. Permission Matrix

Defined in `src/constants/permissions.js`

| Role | Key Permissions |
|------|----------------|
| Super Admin | Everything |
| School Admin | Applications, fees, accounts, photos, chat, reports, settings, audit |
| Admission Officer | Review, correct, verify docs, approve for fee stage |
| Accountant | Fees, payments, receipts |
| Teacher | Assigned classes, photos, chat with assigned parents |
| Parent | Own application, docs, fees, photos, chat |
| Student | Profile, notices, photos (if enabled) |
| Support Staff | Support tickets/messages only |

**Rule:** Frontend `usePermission()` hides UI. Backend must enforce on every API.

---

## 8. Responsive Breakpoints

| Device | Range | Rules |
|--------|-------|-------|
| Mobile | 320–767px | 1-col forms, drawer sidebar, card tables, 44px touch targets |
| Tablet | 768–1023px | 2-col forms, collapsible sidebar, 2-col dashboard |
| Laptop | 1024–1439px | Visible sidebar, 3–4 col cards, 2-col forms |
| Desktop | 1440–1919px | Wide layout, filters, multi-panel admin review |
| Large | 1920px+ | Max content width, centered containers |

---

## 9. Typography

**Font:** Inter (Roboto, Arial fallback)

| Element | Size |
|---------|------|
| Page title | 28–32px (mobile: 22–26px) |
| Section title | 20–24px |
| Card title | 16–18px |
| Body / input | 14–16px |
| Label | 13–14px |
| Helper | 12–13px |

**Headings:** Title Case · **Buttons:** Action text · **Helpers:** Sentence case

---

## 10. Form System

**Stack:** React Hook Form + Zod (`src/schemas/enrollmentSchema.js`)

**Enrollment steps:** 8-step stepper with per-step Zod validation, draft save, signature pad, SmartFileUpload, review before submit.

---

## 11. TanStack Query

Configured in `src/providers/AppProviders.jsx`:
- `networkMode: 'offlineFirst'`
- Retry disabled when offline
- Refetch on window focus

Replace mock services with `useQuery` / `useMutation` when backend is ready.

---

## 12. Mandatory Functional Checklist

- [x] Enrollment form (8 steps)
- [x] Save draft
- [x] Document upload with network handling
- [x] Digital signature
- [x] Admin review workflow
- [x] Fee submission + verification UI
- [x] Teacher photo sharing
- [x] Chat UI
- [x] Notifications bell
- [x] Role-based sidebar
- [x] Toast messages (Sonner)
- [x] Status badges
- [x] Permission constants
- [x] Responsive CSS
- [x] Loading / empty / error states
- [ ] TypeScript migration
- [ ] shadcn/ui full component library
- [ ] Socket.io real-time chat
- [ ] Uppy Dashboard integration (Golden Retriever)
- [ ] Backend API integration

---

## 13. Next Steps

1. Run `npm install` to install new dependencies
2. Migrate UI components to shadcn/ui: `npx shadcn@latest init`
3. Convert enrollment form to React Hook Form `useForm` + `zodResolver`
4. Replace mock services with TanStack Query hooks
5. Connect SmartFileUpload to backend signed-URL upload API
6. Add Socket.io client for real-time chat
7. Migrate to TypeScript incrementally

---

*See [backend.md](./backend.md) for API specification.*
