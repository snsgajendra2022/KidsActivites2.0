# Notice Board — API Contract

**Base path:** `/api/v1/notices`  
**Auth:** Bearer JWT + `X-Tenant-Slug` header  
**Envelope:** `{ "success": true, "data": ..., "meta": { ... } }`

---

## Admin — Notice CRUD

### `GET /notices`

List notices with filters.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| status | string | DRAFT, SCHEDULED, PUBLISHED, ARCHIVED, EXPIRED |
| category | string | Category enum |
| priority | string | NORMAL, IMPORTANT, URGENT |
| audienceType | string | Audience type enum |
| search | string | Title/body search |
| fromDate | ISO date | Published from |
| toDate | ISO date | Published to |
| page | number | Default 1 |
| size | number | Default 20 |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "notice-001",
        "title": "Holiday Notice",
        "body": "School will remain closed on Monday.",
        "category": "HOLIDAY",
        "priority": "IMPORTANT",
        "status": "PUBLISHED",
        "audienceType": "ALL_PARENTS",
        "audienceSummary": "All parents",
        "isPinned": true,
        "requiresAcknowledgement": false,
        "publishAt": null,
        "publishedAt": "2026-07-11T09:00:00.000Z",
        "expiresAt": "2026-08-31T23:59:59.000Z",
        "recipientCount": 180,
        "readCount": 142,
        "acknowledgementCount": 0,
        "createdBy": "usr-school-admin",
        "createdByName": "Priya Sharma",
        "createdAt": "2026-07-11T08:30:00.000Z",
        "updatedAt": "2026-07-11T09:00:00.000Z"
      }
    ],
    "page": 1,
    "size": 20,
    "total": 1
  }
}
```

---

### `POST /notices`

Create draft or publish notice.

**Body:**

```json
{
  "title": "Holiday Notice",
  "body": "School will remain closed on Monday.",
  "category": "HOLIDAY",
  "priority": "IMPORTANT",
  "status": "DRAFT",
  "audience": {
    "type": "SELECTED_ROLES",
    "roles": ["PARENT", "TEACHER"],
    "classIds": [],
    "sectionIds": [],
    "teacherIds": [],
    "parentIds": [],
    "studentIds": [],
    "groupIds": [],
    "userIds": [],
    "includeParents": true,
    "includeTeachers": true
  },
  "publishAt": null,
  "expiresAt": "2026-08-31T23:59:59.000Z",
  "isPinned": true,
  "requiresAcknowledgement": false,
  "sendPush": true,
  "sendEmail": false,
  "sendSms": false,
  "coverImageUrl": null,
  "attachments": []
}
```

**Response `201`:** Full notice object.

**Errors:**

| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Missing title/body/audience |
| 403 | FORBIDDEN | Role cannot create for audience |
| 422 | NO_RECIPIENTS | Publish with zero recipients |

---

### `GET /notices/{noticeId}`

Notice detail including audience rules and attachments.

---

### `PUT /notices/{noticeId}`

Update draft or scheduled notice only.

**Errors:** `409 CONFLICT` if status is PUBLISHED/ARCHIVED.

---

### `DELETE /notices/{noticeId}`

Delete draft only.

**Errors:** `409 CONFLICT` if not DRAFT.

---

### `POST /notices/{noticeId}/publish`

Publish draft immediately.

**Response:** Updated notice + `{ "recipientCount": 248 }`

---

### `POST /notices/{noticeId}/schedule`

Schedule draft. Body: `{ "publishAt": "2026-07-15T08:00:00.000Z" }`

---

### `POST /notices/{noticeId}/archive`

Archive published notice.

---

### `POST /notices/{noticeId}/duplicate`

Clone to new DRAFT.

---

### `GET /notices/{noticeId}/recipients`

Paginated recipient list.

**Query:** `page`, `size`, `search`, `read` (true/false), `acknowledged` (true/false)

---

### `GET /notices/{noticeId}/analytics`

```json
{
  "recipientCount": 248,
  "readCount": 180,
  "unreadCount": 68,
  "acknowledgementCount": 120,
  "pendingAcknowledgementCount": 128,
  "breakdown": {
    "parents": { "total": 180, "read": 140, "acknowledged": 90 },
    "teachers": { "total": 45, "read": 30, "acknowledged": 25 },
    "staff": { "total": 23, "read": 10, "acknowledged": 5 }
  }
}
```

---

### `GET /notices/{noticeId}/export`

CSV export of recipients with read/ack status.

---

## Audience APIs

### `GET /notices/audience/options`

Returns roles, classes, sections, groups, user search hints.

```json
{
  "roles": ["PARENT", "TEACHER", "SCHOOL_ADMIN"],
  "classes": [{ "id": "cls-1", "name": "Nursery", "sections": ["A", "B"] }],
  "groups": [{ "id": "grp-1", "name": "Transport Parents", "memberCount": 42 }],
  "counts": { "allUsers": 320, "allParents": 210, "allTeachers": 48, "allStaff": 62 }
}
```

---

### `POST /notices/audience/preview`

**Body:**

```json
{
  "audience": {
    "type": "SELECTED_CLASSES",
    "classIds": ["cls-1", "cls-2"],
    "includeParents": true,
    "includeTeachers": false
  }
}
```

**Response:**

```json
{
  "total": 180,
  "breakdown": { "parents": 180, "teachers": 0, "staff": 0, "students": 0 },
  "recipients": [
    {
      "userId": "usr-parent",
      "name": "Rajesh Kumar",
      "role": "PARENT",
      "email": "parent@kidsactivites.demo",
      "mobile": "9000000006",
      "studentName": "Aarav Kumar",
      "className": "Nursery",
      "sectionName": "A"
    }
  ]
}
```

---

## Recipient (current user) APIs

### `GET /notices/my`

Current user's inbox.

**Query:** `unreadOnly`, `category`, `priority`, `search`, `page`, `size`

---

### `GET /notices/my/{noticeId}`

Detail if user is recipient.

**Errors:** `404` if not recipient.

---

### `POST /notices/my/{noticeId}/read`

Mark as read. Idempotent.

---

### `POST /notices/my/{noticeId}/acknowledge`

Acknowledge if required. Idempotent.

**Errors:** `400` if acknowledgement not required.

---

## Attachment APIs

### `POST /notices/{noticeId}/attachments`

Multipart upload. Draft/scheduled only.

### `DELETE /notices/{noticeId}/attachments/{attachmentId}`

Remove attachment. Draft/scheduled only.

---

## Permission matrix (API)

| Endpoint | super_admin | school_admin | admission_officer | accountant | teacher | parent |
|----------|-------------|--------------|-------------------|------------|---------|--------|
| GET /notices | ✓ | ✓ | ✓* | ✓* | ✓** | — |
| POST /notices | ✓ | ✓ | ✓* | ✓* | ✓** | — |
| GET /notices/my | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST .../acknowledge | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

\* Category/permission scoped.  
\** Class-scoped audience only.

---

## Standard errors

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to publish notices to all users."
  }
}
```

Codes: `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `NO_RECIPIENTS`, `TENANT_MISMATCH`
