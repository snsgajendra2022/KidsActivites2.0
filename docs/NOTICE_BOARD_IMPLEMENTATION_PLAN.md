# Notice Board — Implementation Plan

## Phase 1 — Documentation ✅

- [x] `docs/NOTICE_BOARD_REQUIREMENTS.md`
- [x] `docs/NOTICE_BOARD_API_CONTRACT.md`
- [x] `docs/NOTICE_BOARD_DATABASE_SCHEMA.md`
- [x] `docs/NOTICE_BOARD_UI_FLOW.md`
- [x] `docs/NOTICE_BOARD_TEST_CASES.md`
- [x] `docs/NOTICE_BOARD_IMPLEMENTATION_PLAN.md`

---

## Phase 2 — Frontend foundation

### Constants & data

| File | Purpose |
|------|---------|
| `src/constants/notices.js` | Enums, labels, audience options |
| `src/data/mockNotices.js` | Seed notices, groups, recipients |

### Service layer

| File | Purpose |
|------|---------|
| `src/services/noticeBoardService.js` | Full API surface + mock audience resolver |
| `src/services/notificationService.js` | Add `createNoticeNotification()` hook |

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useNotices.js` | List, detail, mutations, audience preview |

### Components (`src/components/notice-board/`)

| Component | Purpose |
|-----------|---------|
| `NoticeBadges.jsx` | Status, priority, category badges |
| `NoticeCard.jsx` | List card |
| `NoticeFilters.jsx` | Search + filter bar |
| `NoticeAudienceSelector.jsx` | Audience type + targets |
| `NoticeAudiencePreviewModal.jsx` | Recipient preview |
| `NoticeConfirmPublishModal.jsx` | Publish confirmation |
| `NoticeActionsMenu.jsx` | 3-dot menu |
| `NoticeAnalytics.jsx` | Read/ack stats |
| `NoticeAttachmentUploader.jsx` | File upload UI |

### Pages

| File | Route |
|------|-------|
| `src/pages/admin/AdminNoticeBoard.jsx` | `/admin/notice-board` |
| `src/pages/admin/AdminNoticeForm.jsx` | `/admin/notice-board/new`, `.../edit` |
| `src/pages/admin/AdminNoticeDetail.jsx` | `/admin/notice-board/:noticeId` |
| `src/pages/shared/MyNoticeBoard.jsx` | `/parent/notice-board`, `/teacher/notice-board` |
| `src/pages/shared/MyNoticeDetail.jsx` | `.../notice-board/:noticeId` |

### Styles

| File | Purpose |
|------|---------|
| `src/styles/notice-board.css` | Module styles |

### Wiring

| File | Changes |
|------|---------|
| `src/App.jsx` | Routes + role guards |
| `src/constants/navigation.js` | Nav items |
| `src/constants/permissions.js` | VIEW_NOTICES, MANAGE_NOTICES, etc. |
| `backend.md` | API section (optional follow-up) |

---

## Phase 3 — Backend (Spring Boot / external)

1. Create tables per `NOTICE_BOARD_DATABASE_SCHEMA.md`
2. `NoticeController` — REST endpoints per contract
3. `NoticeAudienceResolver` — resolve + dedupe recipients
4. `NoticeRecipientService` — read/ack tracking
5. `NoticeNotificationService` — push/email/SMS
6. `NoticeAttachmentService` — S3 upload
7. Scheduled job for `SCHEDULED` → `PUBLISHED`
8. Scheduled job for `EXPIRED` notices
9. Audit log on all mutations
10. Permission guards per role

---

## Phase 4 — Mobile

1. `noticeApi.ts` — GET /notices/my, read, acknowledge
2. `NoticeListScreen`, `NoticeDetailScreen`
3. Push notification type `notice` deep-link
4. Parent/Teacher tab or drawer entry

---

## Phase 5 — Testing

1. Manual UI checklist from `NOTICE_BOARD_TEST_CASES.md`
2. Vitest unit tests for audience resolver
3. API integration tests when backend live
4. Permission regression on chat/notifications

---

## Files created in this implementation

```
docs/NOTICE_BOARD_*.md (6 files)
src/constants/notices.js
src/data/mockNotices.js
src/services/noticeBoardService.js
src/hooks/useNotices.js
src/components/notice-board/*.jsx
src/pages/admin/AdminNoticeBoard.jsx
src/pages/admin/AdminNoticeForm.jsx
src/pages/admin/AdminNoticeDetail.jsx
src/pages/shared/MyNoticeBoard.jsx
src/pages/shared/MyNoticeDetail.jsx
src/styles/notice-board.css
```

---

## Non-breaking guarantees

- Chat (`ChatPage`, `chatService`) unchanged
- Existing notification inbox unchanged; new `type: 'notice'` added only on publish
- No changes to enrollment/fee flows
- Mock mode works without backend (`VITE_FORCE_MOCK` or no `VITE_API_URL`)

---

## Acceptance checklist

See `NOTICE_BOARD_REQUIREMENTS.md` §10 and user acceptance criteria in product brief.
