# Kids Activities — Full Platform Details (Web + Mobile)

**Products:** Kids Activities web portal + Kids Activities mobile app  
**Backend:** `https://kidsbackend.snssystem.com/api/v1` (production)  
**Web stack:** React, Vite, Tailwind  
**Mobile stack:** Expo SDK 57, React Native  

This document describes **every major screen, feature, photo/TV/QR flow, enrollment, chat, fees, and API** on both web and mobile.

For landing-page UI text only, see also `landingpage.md`.

---

# PART A — WEB PORTAL

## A1. Public & landing pages

| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | Access Landing | Platform marketing, workspace setup, sign-in by slug |
| `/{slug}/` | School Landing | School admissions homepage (configurable sections) |
| `/workspace/new` | Workspace request | New school/program workspace signup |
| `/workspace/confirm` | Confirmation | Workspace request submitted |
| `/register-school` | Register school | School registration form |
| `/enrollment` | Enrollment entry | Platform enrollment |
| `/enrollment/kidzee-print-form` | Kidzee form | 5-page printable Kidzee enrollment |
| `/{slug}/login` | Login | Email, OTP, QR login |
| `/{slug}/forgot-password` | Forgot password | Reset email |
| `/{slug}/reset-password` | Reset password | New password with token |
| `/{slug}/verify-email` | Verify email | Email verification |
| `/privacy-policy`, `/terms-of-use`, `/support`, etc. | Footer legal/support pages | Policies and help |

**Landing sections (school tenant):** Hero, Campus Banner (optional), Timeline (4 steps), Map, Final CTA, Footer.  
**Landing sections (platform):** Hero, Workspace cards, Timeline, Final CTA, Footer.

Default timeline steps: **Secure & Trusted**, **Easy Documentation**, **Transparent Payments**, **Stay Connected**.

---

## A2. Admin portal (web)

| Route | Page | What admins do |
|-------|------|----------------|
| `/{slug}/admin/dashboard` | Admin Dashboard | Stats, charts, recent applications |
| `/{slug}/admin/applications` | Applications List | Filter by status, search, open review |
| `/{slug}/admin/applications/:id` | Application Review | Full Kidzee details, approve/reject, PDF download, signatures, photos |
| `/{slug}/admin/students` | Students | Enrolled student records |
| `/{slug}/admin/fees` | Admin Fees | Fee management, payment tracking |
| `/{slug}/admin/photos` | Admin Photos | Media library, upload, replace, delete, TV toggle |
| `/{slug}/admin/albums` | Admin Albums | Album list, create school/class albums |
| `/{slug}/admin/class-management` | Class Management | Classes, assignments |
| `/{slug}/admin/teachers` | Admin Teachers | Teacher accounts, class assign, deactivate |
| `/{slug}/admin/users` | Manage Users | Admin/staff accounts (role-based) |
| `/{slug}/admin/schools` | Schools | Multi-school (super admin) |
| `/{slug}/admin/reports` | Reports | Applications, fees, photos shared, notifications |
| `/{slug}/admin/chat` | Chat | School messaging |
| `/{slug}/admin/notifications` | Notifications | Notification center |
| `/{slug}/admin/audit-logs` | Audit Logs | Activity history |
| `/{slug}/admin/portal-settings` | Portal Settings | Branding, landing page, login methods, enrollment form builder, SMTP |
| `/{slug}/admin/settings` | Settings | School profile, admissions open/close |
| `/{slug}/profile` | Profile | Name, mobile, **change password** |

### Web — application review actions
- **Approve Application** — move to next admissions stage  
- **Reject Application** — parent notified with reason  
- **Download PDF** — server-rendered Kidzee enrollment PDF (Playwright)  
- View all form sections: admission, child, health, family, emergency, immunization, permissions, signature images, **photos (child, father, mother)**

### Web — photo & album (admin)
- Upload images/videos to class or school-wide albums  
- Drag-and-drop upload zone  
- Per-item: TV visibility toggle, processing status, replace, delete  
- Album TV pairing code display  
- Gallery grouped by date  
- Lightbox viewer for photos/videos  

---

## A3. Parent portal (web)

| Route | Page | Purpose |
|-------|------|---------|
| `/{slug}/parent/dashboard` | Parent Dashboard | Children summary, quick links, pending actions |
| `/{slug}/parent/enrollment` | Enrollment Status | Per-child application progress |
| `/{slug}/parent/fees` | Parent Fees | Fee breakdown, payment proof |
| `/{slug}/parent/documents` | Parent Documents | Uploads and verification status |
| `/{slug}/parent/photos` | Parent Photos | Teacher-shared photos (hero grid + masonry feed by date) |
| `/{slug}/parent/messages` | Chat | Messages with school |
| `/{slug}/parent/notifications` | Notifications | School alerts |
| `/{slug}/profile` | Profile | Account settings, change password |

**Parent dashboard quick links:** Enrollment Status, Fees, Documents, Photos, Messages, Notifications.

---

## A4. Teacher portal (web)

| Route | Page | Purpose |
|-------|------|---------|
| `/{slug}/teacher/dashboard` | Teacher Dashboard | Classes, photos shared, unread messages |
| `/{slug}/teacher/classes` | Teacher Classes | Assigned classes |
| `/{slug}/teacher/students` | Teacher Students | Class roster |
| `/{slug}/teacher/photos` | Send Photos | Upload to class album or parent-direct |
| `/{slug}/teacher/class-album` | Class Album | Browse uploads, TV toggle, remove |
| `/{slug}/teacher/messages` | Chat | Parent messaging |

### Web — send photos (teacher)
**Upload targets:**
1. **Class album** — visible to class parents, optional TV  
2. **Parent direct** — only selected parents  
3. **Class album + parent** — both  

**Fields:** class selection, student multi-select (for direct), caption, file picker (images/videos).  
**Privacy reminder:** Parent-direct photos visible only to authorized guardians.

---

## A5. Web — enrollment (Kidzee)

**5-page printable form** matching paper layout:

| Page | Content |
|------|---------|
| 1 | Admission refs, class, batch/timing, **photos (child, father/guardian, mother/guardian)**, child name, gender, DOB, height/weight, uniform, address |
| 2 | Health, allergies, doctor |
| 3 | Mother/father guardian, siblings, family, income |
| 4 | Emergency contacts |
| 5 | Permissions, signatures, office use |

**Features:** draft save, validation, submit, correction token link, PDF download, admin review.

**Photo fields (all platforms):**
- Section title: **Photos**  
- Subtitle: **Optional — attach recent photographs**  
- Labels: **Child** (required), **Father / Guardian**, **Mother / Guardian**

---

## A6. Web — authentication

| Method | Details |
|--------|---------|
| Email + password | School-registered email |
| Mobile OTP | SMS OTP login |
| Email OTP | Email OTP login |
| QR login | Scan from mobile app to sign in on web |
| Forgot / reset password | Email token flow |
| Change password | `POST /users/me/change-password` |

---

## A7. Web — chat

- Real-time messaging (STOMP/WebSocket)  
- Conversations list, search, new conversation  
- Thread view with read state  
- Role-based contacts (parents, teachers, admins)

---

# PART B — MOBILE APP

## B1. App entry & navigation

```
First launch → Welcome tour (optional)
  → Workspace Select (enter school slug)
  → Login
  → Role-based tabs (Parent | Teacher | Admin)
  → Stack modals (QR, enrollment, admin details, change password)
```

**Separate TV app mode** on Android TV / `EXPO_PUBLIC_FORCE_TV_MODE=true`:
- TV workspace select → QR login on TV → wait for album → slideshow playback

---

## B2. Onboarding & workspace

### Welcome Screen
| Element | Text |
|---------|------|
| Title | Welcome to Kids Activities |
| Subtitle | Trusted communication for schools and families |
| Slides | Welcome, Share Classroom Moments, Keep Families Connected, Bring Albums to the Big Screen |
| Buttons | **Get Started**, **I Already Have a Workspace**, **Close Tour** |

### Workspace Select Screen
| Element | Text |
|---------|------|
| Title | Connect to your school |
| Field | Workspace Code (school slug) |
| Button | **Continue** |
| Recent | List of recently used workspaces |
| Link | **Replay Welcome Tour** |
| API | `GET /portal/config` (validates tenant) |

### Change School
- Available on Login, Profile, Drawer (non-parent)  
- Signs out, clears workspace, returns to Workspace Select

---

## B3. Authentication (mobile)

| Screen | Labels / actions |
|--------|------------------|
| **Login** | Sign In to Your Account, Email, Password, **Sign In**, **Forgot password?**, **Apply for Admission**, **Verify Email**, **Change School** |
| **Forgot Password** | Reset Password, **Send Reset Link** |
| **Reset Password** | Set New Password, **Update Password** |
| **Verify Email** | Verify Email with token |
| **Change Password** (Profile → Account) | Current / New / Confirm password, **Update Password** |

**APIs:** `POST /auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `POST /users/me/change-password`

**Note:** Mobile login uses email + password. QR on login screen is informational for TV sign-in flow (staff scans TV QR from their phone).

---

## B4. Parent mobile — all screens

### Bottom tabs (visible)
**Home · Photos · Chat · More**

### Hidden tabs (via More menu)
Fees, Documents, My Application, New Enrollment, Profile

| Screen | Title | What parent can do |
|--------|-------|-------------------|
| **Parent Home** | Today's Family Snapshot | Child selector, stats (recent photos, fees), quick actions: Photos, Fees, Docs, Chat, More |
| **Parent Photos** | School Moments | View photos/videos shared by teachers per child; lightbox viewer; pull to refresh |
| **Parent Fees** | Fees | Fee summary in ₹, breakdown, **Submit Payment Proof** (Bank Transfer, UPI, Cheque, Cash + transaction ID) |
| **Parent Documents** | Documents | View uploaded enrollment documents, download files |
| **My Application** | My application | Application journey (Form → Review → Fees → Done), status timeline, Kidzee form details, **Download PDF**, correction alert → Continue Form |
| **Kidzee Enrollment** | Kidzee enrollment | Full 5-step Kidzee form (same as web) |
| **Chat** | Messages | Inbox, search, new conversation, thread messaging |
| **More** | Menu | Family links, Profile, Welcome tour |
| **Profile** | Profile | Account info, workspace, **Change Password**, Sign Out |

**Parent cannot:** Scan TV QR (hidden from home, drawer, and quick actions).

### Parent APIs
- `GET /parent/dashboard`  
- `GET /parent/children`, `GET /parent/children/{id}`  
- `GET /fees/my-fee`, `POST /fees/{id}/submit-payment`  
- `GET /media/photos?studentId=`  
- `GET /documents/download/{fileKey}`  
- `GET /enrollment/my-application`  
- Chat APIs (see B10)

---

## B5. Teacher mobile — all screens

### Bottom tabs (visible)
**Home · Classes · Chat · More**

### Hidden tabs
Students, Photos (upload), Profile

| Screen | Title | What teacher can do |
|--------|-------|-------------------|
| **Teacher Home** | Today's Classroom Overview | Stats: classes, students, photos shared; quick actions: Upload, Students, Chat, More, **Change TV Album**, **Scan QR** |
| **Teacher Classes** | My Classes | List assigned classes, student count, links to students/photos |
| **Teacher Students** | Students | Searchable class roster |
| **Teacher Photos** | Share photos | **Main upload screen** (see B8) |
| **Teacher Album Gallery** | Class album | View uploads, TV code card, edit caption/TV flag, remove, upload more |
| **Chat** | Messages | Chat with parents and staff |
| **More / Profile** | Same patterns | Scan TV QR, Change TV Album, account |

### Teacher APIs
- `GET /teacher/dashboard/stats`  
- `GET /teacher/classes`, `GET /teacher/students`  
- `GET /teacher/albums/my-classes`, `GET /teacher/albums/{classId}`  
- `POST /teacher/albums/upload`  
- `PATCH /teacher/albums/{classId}/media/{mediaLinkId}`  
- `DELETE /teacher/albums/{classId}/media/{mediaLinkId}`

---

## B6. Admin mobile — all screens

### Bottom tabs (varies by role)

| Role | Visible tabs |
|------|----------------|
| school_admin / super_admin | Home, Applications, Chat, More |
| admission_officer | Home, Applications, Chat, More |
| accountant | Reports, Chat, More (+ Home hidden) |

| Screen | Title | What admin can do |
|--------|-------|-----------------|
| **Admin Home** | School Command Center | Pipeline stats, quick links, **Change TV Album**, **Scan QR for TV Sign-In** |
| **Admin Applications** | Applications | Filter: All, Draft, Submitted, Under Review, Correction Required, Fee Pending, Admitted, Rejected |
| **Admin Application Detail** | Student name | Summary card, **Approve**, **Reject**, Share, **Download PDF**, full Kidzee details, photos section |
| **Admin Classes** | Classes | Read-only class list |
| **Admin Teachers** | Teachers | List, add, edit, deactivate teachers |
| **Admin Teacher Form** | Add/Edit Teacher | Name, email, mobile, class assignment, temp password on create |
| **Admin Albums** | Albums | School albums + class albums, create album, open detail |
| **Admin Album Detail** | Album name | Upload photos/videos, TV code, regenerate code, toggle playback, approve/edit media |
| **Admin Reports** | Reports | Applications, fees, communications (photos shared, notifications, classes reached) |
| **Admin Users** | Manage Users | Create admin/staff accounts (super_admin / school_admin) |
| **Admin User Form** | New user | Role, name, email, temp password |
| **Chat** | Messages | School messaging |
| **Change Password** | Account security | Update sign-in password |

### Admin APIs
- `GET /admin/dashboard/stats`  
- `GET|POST /admin/applications`, approve/reject/correction  
- `GET /admin/classes`  
- `GET|POST /admin/albums`, upload, media PATCH, regenerate TV code  
- `GET /admin/reports/summary`  
- `GET|POST /admin/users`, teachers CRUD  

---

## B7. Photo upload & share — full mobile flow

### B7.1 Teacher upload screen (`TeacherPhotosScreen`)

**Page header:** Share photos — Upload images or videos

**Step 1 — Choose upload target** (`UploadTargetCard`):

| Target | Label | Who sees it |
|--------|-------|-------------|
| `CLASS_ALBUM` | **Class Album** | All parents in selected class; can appear on classroom TV |
| `PARENT_DIRECT` | **Parent Direct** | Only selected parent(s) for one child |
| `CLASS_ALBUM_AND_PARENT` | **Album + Parent** | Both class album and direct parent share |

**Step 2 — Select class** (required for all targets)  
Chip list of active assigned classes.

**Step 3 — Select students** (required for PARENT_DIRECT and ALBUM_AND_PARENT)  
Multi-select student chips filtered by class.

**Step 4 — Add media**  
Buttons: **Gallery** (multi-select images/videos), **Photo** (camera), **Video** (camera video)  
Supported: JPG, PNG, WebP, MP4, MOV, WebM (with size validation)  
Preview list with remove per file.

**Step 5 — Caption** (optional)  
Text field for album caption.

**Step 6 — Upload**  
Button: **Upload** with progress  
Success messages:
- Class Album: *Uploaded to class album successfully.*  
- Parent Direct: *Media sent to parent successfully.*  
- Album + Parent: *Uploaded to class album and shared with parents.*

**Also on screen:** **Scan TV QR** link, **View {class} album** → opens `TeacherAlbumGallery`

**API:** `POST /teacher/albums/upload` (multipart: files, classId, studentIds, uploadTarget, caption)

---

### B7.2 Admin album upload (`AdminAlbumDetailScreen`)

- **Add photos or videos** — gallery/camera picker  
- Upload to selected school or class album  
- Per media item: caption, show on TV, approval status  
- **Album Photos** grid with lightbox  
- **TvCodeCard** — pairing code, share, TV on/off status  
- **Regenerate code** for TV pairing  

**API:** `POST /admin/albums/upload`, `PATCH` media links, `POST .../regenerate-code`

---

### B7.3 Parent photo viewing (read-only)

**Parent Photos screen:**
- Title: **School Moments**  
- Subtitle: Photos and videos shared with your child  
- Child selector (if multiple children)  
- Grid of `MediaCard` items  
- Tap → full-screen lightbox (`PhotoMediaLightbox`)  
- Empty: *When teachers share photos or videos, they will appear here.*  
- API: `GET /media/photos?studentId=`

**Parent Home** also shows **Recent classroom moments** preview (first 4 photos) with **View all** link.

---

### B7.4 Album TV code sharing (`TvCodeCard`)

Shown on teacher album gallery and admin album detail:

| Element | Text |
|---------|------|
| Section | **Classroom TV** / **Album Playback** |
| Code label | **TV Pairing Code** |
| Button | **Share TV Code** |
| Status | **TV On** / **TV Off** badge |
| Share message | Includes code + instruction to enter on classroom TV |

Utility: `utils/albumShare.ts` — builds share text for SMS/WhatsApp/system share sheet.

---

## B8. QR scan & TV control — full mobile flow

### B8.1 Who can scan QR
- **Teacher** — Home quick action, More menu, Drawer, Photos screen  
- **Admin** — Home, Albums, More, Drawer  
- **Parent** — **Cannot** scan (QR hidden for parent role)

### B8.2 QR Scanner screen

| Element | Text |
|---------|------|
| Title | **Scan TV QR** |
| Camera | Live QR scan with corner frame |
| Manual fallback | **Enter pairing code** — text field + submit |
| API (scan) | `POST /mobile/qr/resolve` with QR payload |
| API (manual) | `POST /auth/qr/preview` then resolve |

**Deep link:** `kidsactivities://pair?...` handled by `QrDeepLinkHandler` when app opens from link.

### B8.3 QR Pairing Confirm screen

Shows resolved session:
- Device name  
- School / workspace  
- Action type: `TV_DEVICE_LOGIN`, `WEB_LOGIN`, or `TV_ALBUM_PLAYBACK`  
- Expiry countdown  

Buttons: **Approve**, **Reject**, **Cancel**  
API: `POST /mobile/qr/approve` or `POST /mobile/qr/reject`

### B8.4 After TV device login approve

**TV Album Select screen:**
- Title: **Control TV** / **Choose album**  
- Lists albums available for TV: `GET /mobile/albums/available-for-tv`  
- Search albums  
- Tap album → `POST /mobile/tv-devices/{id}/play-album`  
- **Disconnect TV** — ends session  
- **Done** → success screen  

**TV Pairing Success:**
- **All set!**  
- **Change album** (pick different album)  
- **Done**

### B8.5 Change TV Album (without new scan)

If a TV device was previously paired and remembered (`lastTvDevice` storage):
- **Change TV Album** from Home / More / Drawer  
- Opens `TVDevicePicker` or goes directly to `TVAlbumSelect`  
- Skips QR scan when session still valid  

Hook: `useTvControlNavigation.ts`

### B8.6 TV app (Android TV / TV mode)

| Screen | Purpose |
|--------|---------|
| **TV Workspace Select** | Pick school slug on TV |
| **TV QR Login** | Display QR code; TV polls until staff approves on phone |
| **TV Waiting for Album** | Logged in, waiting for staff to pick album on mobile |
| **TV Album Playback** | Full-screen slideshow; images + HLS video; polls playback API |

**TV APIs:**
- `POST /auth/qr/init` — TV shows QR  
- `GET /auth/qr/{sessionId}/status` — poll login approval  
- `GET /tv/albums/{albumCode}/playback` — current slide, next prefetch  
- `GET /tv/pairing/devices/{id}/status`  
- `POST /tv/pairing/.../disconnect`

**TV optimizations:**
- Image cache (`tvImageFileCache.ts`) — s10 → s01 → preview → playback URL order  
- Video cache (`tvVideoFileCache.ts`) — HLS stream prefetch  
- Font scaling locked on Android TV  

---

## B9. Enrollment (mobile) — full detail

### Kidzee 5-step form (`KidzeeEnrollmentScreen`)

| Step | Title | Key fields |
|------|-------|------------|
| 1 | **Child** | Tel no, form/admission no (school-assigned), class, batch/timing, **photos**, child name, gender, DOB, height/weight, uniform, address, stays with |
| 2 | **Health** | Allergies, physical/emotional, medication, doctor, immunization grid |
| 3 | **Family** | Mother/father guardian (full details), siblings, household income |
| 4 | **Emergency** | Up to 2 emergency contacts |
| 5 | **Consent** | Emergency treatment, field trip, verification permissions + signature pad |

**Buttons per step:** **Back**, **Save draft**, **Continue**  
**Final step:** **Submit application**  
**Validation:** mirrors web Kidzee rules (child photo required, class single-select, height/weight numeric, etc.)

**APIs:**
- `GET /enrollment/form`, `GET /enrollment/admissions`  
- `POST /enrollment/draft`, `PUT /enrollment/draft/{id}`  
- `POST /enrollment/submit`  
- `GET /enrollment/applications/{id}/pdf` — download PDF  

### My Application (`MyApplicationScreen`)

| Section | Content |
|---------|---------|
| Summary card | Student name, class, status badge, application no. |
| **Download PDF** | Kidzee PDF via share sheet |
| Correction card | **Correction Needed** → **Continue Form** |
| Application Journey | Form → Review → Fees → Done steps |
| Submitted form | All Kidzee sections including **Photos**, permissions, signatures |
| Help | **Message Desk**, **Call Registrar** |

### Admin application review (mobile)

- **Approve Application** / **Reject Application** (with reason modal)  
- Share application details  
- **Download PDF**  
- Kidzee detail cards (same sections as parent view)

---

## B10. Chat (mobile) — full detail

| Screen | Features |
|--------|----------|
| **Conversations** | Inbox list, unread badges, search **Search conversations…**, **New conversation** button |
| **New conversation** | Contact list from `GET /chat/contacts` (filtered by role) |
| **Thread** | Message bubbles, send text, real-time via STOMP socket, polling fallback, read receipts |

**Socket:** `services/chatSocket.ts` — connects on chat focus, disconnects on logout  
**Unread:** Badge on Chat tab; `GET /chat/unread-count`; mark read on thread open  

**APIs:**
- `GET /chat/contacts`  
- `GET|POST /chat/conversations`  
- `GET|POST /chat/conversations/{id}/messages`  
- `POST /chat/conversations/{id}/read`  

**Subtitles by role:**
- Parent: *Chat with teachers and school staff*  
- Teacher: *Chat with parents and staff*  
- Admin: *School messaging*

---

## B11. Fees & documents (mobile)

### Fees (`ParentFeesScreen`)
- Per-child via child selector  
- **Fee Summary** card with total in ₹  
- Line-item breakdown  
- **Submit Payment Proof** modal: payment method, transaction ID, optional note  
- Empty: **No Fee Assigned**  

### Documents (`ParentDocumentsScreen`)
- List uploaded enrollment documents per child  
- Status badges (verified, pending, etc.)  
- Tap to download/open via signed URL  
- Upload happens during enrollment flow (`documentsApi`)

---

## B12. Drawer & More menu (mobile)

### Side drawer (`AppDrawer`)
- **Navigate** — role-specific quick links  
- **Tools** — My Application, New Enrollment (parent); Scan TV QR (staff)  
- **Settings** — Profile & Settings, Change School, Sign Out  
- Admin: **Manage Users** (school_admin / super_admin)

### More menu (`MoreMenuScreen`)

**Parent — Family:** Fees, Documents, My Application, New Enrollment  
**Parent — Account:** Profile, Welcome Tour  

**Teacher — Classroom:** Students, Photos  
**Teacher — Account:** Profile, Change TV Album, Scan TV QR  

**Admin — School:** Applications, Classes, Teachers, Albums, Reports, Manage Users (varies by role)  
**Admin — Account:** Profile, Change TV Album, Scan TV QR  

---

## B13. Mobile navigation map

```
RootNavigator
├── Welcome
├── WorkspaceSelect
├── TenantUnavailable
├── AuthNavigator
│   ├── Login, ForgotPassword, ResetPassword, VerifyEmail
│   └── Enrollment, KidzeeEnrollment (guest)
└── AppStackNavigator
    ├── Main (role tabs)
    │   ├── ParentTabs: Home | Photos | Chat | More (+ hidden Fees/Docs/Enrollment/Profile)
    │   ├── TeacherTabs: Home | Classes | Chat | More (+ hidden Students/Photos/Profile)
    │   └── AdminTabs: (role-filtered)
    │       └── ChatNavigator: Conversations → Thread
    └── Stack overlays:
        QRScanner → QRPairingConfirm → TVAlbumSelect → TVPairingSuccess
        TVDevicePicker, KidzeeEnrollment, MyApplication
        AdminApplicationDetail, AdminAlbumDetail, AdminTeacherForm, AdminUsers, AdminUserForm
        TeacherAlbumDetail, ChangePassword, Welcome
```

**Tab bar:** Floating pill style (`FloatingTabBar`), badge on Chat for unread count.  
**Tab bar hidden:** Inside chat Thread screen.

---

## B14. Complete API reference (both apps)

### Auth & users
| Method | Endpoint | Used by |
|--------|----------|---------|
| POST | `/auth/login` | Web, mobile |
| POST | `/auth/logout` | Web, mobile |
| POST | `/auth/refresh` | Mobile token refresh |
| POST | `/auth/forgot-password` | Web, mobile |
| POST | `/auth/reset-password` | Web, mobile |
| POST | `/auth/verify-email` | Web, mobile |
| POST | `/auth/qr/init` | TV QR display |
| GET | `/auth/qr/{id}/status` | TV login poll |
| POST | `/auth/qr/preview` | Manual QR code entry |
| GET | `/users/me` | Session bootstrap |
| PATCH | `/users/me` | Profile update |
| POST | `/users/me/change-password` | Web, mobile |

### Workspace & portal
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/portal/config` | Tenant validation, branding |

### Parent
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/parent/dashboard` | Dashboard data |
| GET | `/parent/children` | Children list |
| GET | `/parent/children/{id}` | Child + documents |
| GET | `/fees/my-fee` | Fee for application |
| POST | `/fees/{id}/submit-payment` | Payment proof |
| GET | `/media/photos?studentId=` | Shared photos |

### Teacher
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/teacher/dashboard/stats` | Home stats |
| GET | `/teacher/classes` | Class list |
| GET | `/teacher/students` | Roster |
| GET | `/teacher/albums/my-classes` | Albums by class |
| GET | `/teacher/albums/{classId}` | Album media |
| POST | `/teacher/albums/upload` | Upload photos/videos |
| PATCH | `/teacher/albums/.../media/...` | Edit media |
| DELETE | `/teacher/albums/.../media/...` | Remove from album |

### Admin
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/dashboard/stats` | Dashboard |
| GET/POST | `/admin/applications` | Applications |
| POST | `/admin/applications/{id}/approve` | Approve |
| POST | `/admin/applications/{id}/reject` | Reject |
| POST | `/admin/applications/{id}/request-correction` | Correction |
| GET | `/admin/classes` | Classes |
| GET/POST | `/admin/albums` | Albums |
| POST | `/admin/albums/upload` | Upload |
| POST | `/admin/albums/{id}/regenerate-code` | New TV code |
| GET | `/admin/reports/summary` | Reports |
| CRUD | `/admin/teachers` | Teachers |
| CRUD | `/admin/users` | Staff users |

### Enrollment
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/enrollment/form` | Dynamic form config |
| GET | `/enrollment/admissions` | Admissions open status |
| POST/PUT | `/enrollment/draft` | Save draft |
| POST | `/enrollment/submit` | Submit application |
| GET | `/enrollment/my-application` | Parent status |
| GET | `/enrollment/applications/{id}/pdf` | PDF download |

### Documents
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/documents/upload` | Get signed upload URL |
| POST | `/documents/confirm` | Confirm upload |
| GET | `/documents/download/{fileKey}` | Download file |

### Chat
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/chat/contacts` | Contact list |
| GET/POST | `/chat/conversations` | Conversations |
| GET/POST | `/chat/conversations/{id}/messages` | Messages |
| POST | `/chat/conversations/{id}/read` | Mark read |
| GET | `/chat/unread-count` | Unread badge |

### Mobile QR & TV
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/mobile/qr/resolve` | Parse scanned QR |
| POST | `/mobile/qr/approve` | Approve pairing/login |
| POST | `/mobile/qr/reject` | Reject |
| GET | `/mobile/albums/available-for-tv` | Albums for TV |
| POST | `/mobile/tv-devices/{id}/play-album` | Start playback |
| GET | `/mobile/tv-devices/{id}` | Device status |
| DELETE | `/mobile/tv-devices/{id}` | Disconnect |
| GET | `/tv/albums/{code}/playback` | TV slideshow state |

---

## B15. Role permissions summary

| Feature | Parent | Teacher | Admin | Admission | Accountant |
|---------|--------|---------|-------|-----------|------------|
| View photos | ✅ | ✅ (own uploads) | ✅ | ❌ | ❌ |
| Upload photos | ❌ | ✅ | ✅ | ❌ | ❌ |
| Scan TV QR | ❌ | ✅ | ✅ | ❌ | ❌ |
| Change TV album | ❌ | ✅ | ✅ | ❌ | ❌ |
| Chat | ✅ | ✅ | ✅ | ✅ | ✅ |
| Enrollment form | ✅ | ❌ | ❌ | ❌ | ❌ |
| My application | ✅ | ❌ | ❌ | ❌ | ❌ |
| Review applications | ❌ | ❌ | ✅ | ✅ | partial |
| Manage fees | view + proof | ❌ | ✅ | ❌ | ✅ |
| Manage teachers | ❌ | ❌ | ✅ | ❌ | ❌ |
| Manage users | ❌ | ❌ | super/school admin | ❌ | ❌ |
| Reports | ❌ | ❌ | ✅ | ❌ | ✅ |
| Change password | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## B16. Mobile app package & build

| Item | Value |
|------|-------|
| App name | Kids Activities |
| Package (Android) | `com.snssystem.kidsactivities` |
| iOS project | KidsActivities |
| Expo SDK | 57 |
| Live API | `https://kidsbackend.snssystem.com/api/v1` |
| TV mode | `EXPO_PUBLIC_FORCE_TV_MODE=true` or Android TV detection |
| Release signing | `android/keystore.properties` → `key/SandeepGupta1.jks` |

**Build release APK:**
```bash
cd android
./gradlew assembleRelease
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## B17. Web vs mobile feature parity

| Feature | Web | Mobile |
|---------|-----|--------|
| Landing / marketing | ✅ Full | ❌ (uses Welcome + Workspace) |
| Kidzee enrollment | ✅ | ✅ |
| Application review | ✅ | ✅ (admin) |
| PDF download | ✅ | ✅ (share sheet) |
| Parent photos view | ✅ | ✅ |
| Teacher photo upload | ✅ | ✅ |
| Admin album management | ✅ | ✅ |
| TV QR pairing | ❌ (TV shows QR) | ✅ (phone scans) |
| TV playback | ✅ (browser/TV app) | ✅ (TV app mode) |
| Chat | ✅ | ✅ |
| Fees | ✅ | ✅ |
| Documents | ✅ | ✅ |
| Notifications center | ✅ | ❌ (metrics only in admin reports) |
| Portal settings / landing editor | ✅ | ❌ |
| Enrollment form builder | ✅ | ❌ |
| OTP login | ✅ | ❌ (email/password on mobile) |
| QR web login | ✅ | ✅ (approve from phone) |
| Change password | ✅ | ✅ |
| Audit logs | ✅ | ❌ |
| Workspace self-service signup | ✅ | ❌ |

---

*Last updated: July 2026 — covers KidsActivities2.0 web portal and mobile app at `/Users/gajendrarawat/projects/mobile`.*
