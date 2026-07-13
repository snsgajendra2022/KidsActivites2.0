# Notice Board — Requirements

**Module:** Notice Board (Notices / Announcements / Broadcast Notes)  
**Product:** Kids Activities / School Management Platform  
**Version:** 1.0  
**Status:** Production specification

---

## 1. Purpose

School admins and authorized staff must create and publish notices/announcements to precisely defined audiences within a tenant (school workspace). Parents, teachers, and staff receive only notices targeted to them. The system supports drafts, scheduling, read receipts, acknowledgements, attachments, and notification delivery.

---

## 2. User roles & capabilities

| Role | Create | Publish | Schedule | Archive | View all school notices | View analytics | Export | Read inbox | Acknowledge |
|------|--------|---------|----------|---------|-------------------------|----------------|--------|------------|-------------|
| Super Admin | ✓ | ✓ | ✓ | ✓ | ✓ (tenant-scoped) | ✓ | ✓ | If recipient | If required |
| School Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | If recipient | If required |
| Admission Officer | ✓* | ✓* | ✓* | ✓* | Admission category | ✓* | ✓* | If recipient | If required |
| Accountant | ✓* | ✓* | ✓* | ✓* | Fee category | ✓* | ✓* | If recipient | If required |
| Support Staff | ✓* | ✓* | ✓* | ✓* | Limited | ✓* | — | If recipient | If required |
| Teacher | ✓** | ✓** | ✓** | — | Own notices | ✓** | — | If recipient | If required |
| Parent | — | — | — | — | — | — | — | ✓ | If required |
| Student | — | — | — | — | — | — | — | ✓ | If required |

\* When permission flag enabled for role/category.  
\** Limited to assigned classes; cannot broadcast to entire school unless granted.

---

## 3. Audience rules

### 3.1 Audience types

1. **ALL_USERS** — all active accounts in current tenant  
2. **ALL_PARENTS** — role = parent (and student-linked family accounts if applicable)  
3. **ALL_TEACHERS** — role = teacher  
4. **ALL_STAFF** — school_admin, admission_officer, accountant, support_staff, etc.  
5. **SELECTED_ROLES** — one or more roles from allowed list  
6. **SELECTED_CLASSES** — class IDs + optional includeParents / includeTeachers  
7. **SELECTED_SECTIONS** — class + section IDs  
8. **SELECTED_TEACHERS** — explicit teacher user IDs  
9. **SELECTED_PARENTS** — explicit parent user IDs  
10. **SELECTED_STUDENTS** — student/application IDs → resolve to linked parents  
11. **CUSTOM_GROUP** — saved group IDs  
12. **MANUAL_USERS** — explicit user ID multi-select  

### 3.2 Resolution rules

- Resolve at **publish** time (not draft save).  
- Deduplicate recipients by `user_id`.  
- Exclude inactive/disabled users.  
- Respect `tenant_id` on every query.  
- Class targeting: parents of enrolled students + assigned teachers per flags.  
- Section targeting: subset of class enrollment.  
- Zero recipients → block publish with clear error.

### 3.3 Preview before publish

Admin must see summary:  
`You are sending this notice to 248 users: 180 parents, 45 teachers, 23 staff.`

---

## 4. Notice lifecycle

```
DRAFT → (publish now) → PUBLISHED
DRAFT → (schedule) → SCHEDULED → (job at publish_at) → PUBLISHED
PUBLISHED → (archive) → ARCHIVED
PUBLISHED → (expires_at reached) → EXPIRED
```

- **Draft:** editable, deletable.  
- **Scheduled:** editable until publish time.  
- **Published:** not editable (duplicate to new draft). Archive instead of delete.  
- **Archived / Expired:** read-only for admin; hidden from default parent/teacher inbox unless filter enabled.

---

## 5. Notice form fields

| Field | Required | Notes |
|-------|----------|-------|
| Title | Yes | Max 200 chars |
| Body | Yes | Rich text or markdown-safe plain text |
| Category | Yes | See enum |
| Priority | Yes | NORMAL, IMPORTANT, URGENT |
| Audience | Yes | See audience types |
| Attachments | No | PDF, images, docs |
| Cover image | No | Optional card thumbnail |
| Publish mode | Yes | Now or schedule |
| publishAt | If scheduled | ISO datetime, future |
| expiresAt | No | Must be after publishAt |
| isPinned | No | Pin to top of inbox |
| requiresAcknowledgement | No | Parent/teacher must tap Acknowledge |
| sendPush | No | In-app + push when integrated |
| sendEmail | No | When SMTP configured |
| sendSms | No | Only when SMS/WhatsApp integration exists |

### Categories

`GENERAL`, `ADMISSION`, `FEES`, `EXAM`, `HOLIDAY`, `EVENT`, `EMERGENCY`, `HOMEWORK`, `ACTIVITY`, `TRANSPORT`, `HEALTH`, `OTHER`

### Priority

`NORMAL`, `IMPORTANT`, `URGENT`

### Status

`DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`, `EXPIRED`

---

## 6. UI pages

### Admin

1. **Notice Board Dashboard** — stats, tabs (Published / Draft / Scheduled / Important), Create Notice CTA  
2. **Notice List** — search, filters, cards/table, actions menu  
3. **Create / Edit Notice** — form, audience selector, attachments, preview, save draft, publish  
4. **Notice Detail** — content, audience summary, analytics, read/ack lists, export  
5. **Recipient Preview Modal** — searchable list before publish  

### Parent / Teacher

1. **Notice Board** — cards, unread badges, priority badges, filters  
2. **Notice Detail** — body, attachments, acknowledge button  

### Mobile (future)

- Notice list, detail, push deep-link, acknowledgement  

---

## 7. Workflows

### Admin create & publish

1. Open Notice Board → Create Notice  
2. Fill title, body, category, priority  
3. Select audience type and targets  
4. Preview recipients → confirm count  
5. Optional: attachments, schedule, pin, acknowledgement  
6. Save draft OR Publish  
7. On publish: resolve recipients, save `notice_recipients`, trigger notifications  
8. Audit log entry created  

### Parent read

1. Open Notice Board (or notification deep-link)  
2. See unread badge on nav  
3. Open notice → `read_at` set  
4. If acknowledgement required → tap Acknowledge → `acknowledged_at` set  

---

## 8. Edge cases

| # | Case | Expected behavior |
|---|------|-------------------|
| 1 | No recipients | Block publish, show error |
| 2 | Role has zero users | Preview shows 0, block publish |
| 3 | Class has no students | Warning in preview |
| 4 | Inactive teacher/parent | Excluded from resolution |
| 5 | Duplicate from multiple rules | Single recipient row |
| 6 | Schedule in past | Validation error |
| 7 | Expiry before publish | Validation error |
| 8 | Edit published notice | Disallowed; offer Duplicate |
| 9 | Delete published | Disallowed; offer Archive |
| 10 | Non-recipient opens notice | 403 / not found |
| 11 | Already acknowledged | Idempotent success |
| 12 | Notice expired | Show expired state, no ack |
| 13 | Tenant mismatch | 403 |
| 14 | Notification failure | Notice still published; log delivery failure |
| 15 | Large recipient count | Paginated preview; async publish job |

---

## 9. Non-functional requirements

- Tenant isolation on all queries  
- Audit log for create, update, publish, archive, delete draft  
- Responsive UI (mobile-first inbox)  
- Accessible forms and modals  
- Do not break existing chat or notification modules  
- API contract documented separately  

---

## 10. Out of scope (v1)

- WhatsApp Business API (placeholder toggle only)  
- Rich HTML email templates  
- Parent-to-parent notices  
- Student-authored notices  
