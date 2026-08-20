# School Calendar — Backend Implementation Contract

**Audience:** Spring Boot backend (`kidsbackend.snssystem.com`)  
**Web client:** `KidsActivities2.0` (`src/services/calendarService.js`, `src/services/calendarFeedService.js`)  
**Base path:** `/api/v1/calendar`  
**Auth:** Bearer JWT + `X-Tenant-Slug`  
**Envelope:** `{ "success": true, "data": ..., "meta": { ... } }`  
**JSON:** camelCase in responses (frontend also accepts snake_case aliases)

This document is the **complete backend work list**. The web app already has calendar UI. Until these APIs exist, the SPA falls back to browser localStorage when `/calendar/*` returns `404`, `405`, or `501`. That fallback is **not** production multi-device data.

Do **not** duplicate exam / homework / timetable rows as calendar events. Use `source` + `sourceId` in the unified feed.

Do **not** treat frontend filtering as authorization. Every list/get/update must be tenant-scoped and audience-scoped on the server.

---

## 1. Current frontend calls (must work first)

The SPA already issues these HTTP calls. Implement them first so the UI stops using localStorage.

| Method | Path the client calls | Used for |
|--------|----------------------|----------|
| `GET` | `/calendar/events` | Month/list/holidays/emergencies/analytics fallback |
| `GET` | `/calendar/events/{id}` | Edit form |
| `POST` | `/calendar/events` | Create (draft or published payload) |
| `PATCH` | `/calendar/events/{id}` | Edit, publish (`status=published`), cancel (`status=cancelled`) |
| `DELETE` | `/calendar/events/{id}` | Soft-delete / archive |
| `POST` | `/calendar/events/{id}/acknowledge` | Parent/teacher/driver ack |

Optional alias the client also tries if the first list URL 404s: `GET /admin/calendar-events`. Prefer implementing `/calendar/events` only.

**Also implement the endpoints in section 6** even if the SPA does not call them yet (copy holidays, feed, analytics, publish, ICS). The frontend can be pointed at them without a second backend rewrite.

---

## 2. Roles and permissions

Reuse existing tenant users/roles. Do not invent a parallel permission system.

| Role | View | Create/edit | Publish / emergency | Acknowledge |
|------|------|-------------|---------------------|-------------|
| `super_admin` | Tenant they operate | Yes | Yes | n/a |
| `school_admin` | Own school | Yes | Yes | n/a |
| `admission_officer` | Own school | Yes | Yes | n/a |
| `accountant` | Own school (read) | No | No | n/a |
| `teacher` | Events for assigned classes + school-wide + staff events | Optional class events only if product already allows teacher-created notices | No | Yes if required |
| `parent` | School-wide + events for **their children only** | No | No | Yes if required |
| `student` | School-wide + events for **their class/student** | No | No | Yes if required |
| `driver` | Holidays, closures, transport events for **assigned routes/vehicles only** | No | No | Yes if required |
| `support_staff` | No calendar admin | No | No | n/a |

**IDOR rules**

- Parent A must never receive Parent B’s child-only events.
- Driver on BUS-07 must not see a route change for BUS-12.
- School A must never see School B rows (`tenant_id` / `school_id` on every query).
- Draft, archived, and not-yet-due `scheduled` events: managers only.
- Cancelled: managers see them; others only if you choose to show a “cancelled” chip (frontend currently hides cancelled from non-managers).

---

## 3. Enums (store lowercase strings)

### 3.1 `status`

`draft` · `scheduled` · `published` · `cancelled` · `completed` · `archived`

Rules:

- `draft` — not visible to parents/students/teachers/drivers.
- `scheduled` — become visible when `publishAt <= now` (job) or when admin publishes.
- `published` — visible to resolved audience.
- `cancelled` — keep row; notify if it was published; do not hard-delete.
- `archived` — set with soft delete (`deletedAt`).
- `completed` — optional; can be set by a nightly job when `endDate < today` and status was published.

### 3.2 `priority`

`normal` · `high` · `emergency`

`emergency` may **override** user email/push opt-out (school policy). Non-emergency must respect preferences.

### 3.3 `eventType` (extensible — add values without migration if stored as VARCHAR)

| eventType | eventCategory |
|-----------|---------------|
| `school_holiday`, `public_holiday`, `festival`, `student_holiday` | `holiday` |
| `vacation`, `summer_break`, `winter_break` | `vacation` |
| `teacher_holiday`, `teacher_training`, `staff_meeting` | `staff` |
| `school_event`, `sports_event`, `cultural_event`, `admission_event`, `fee_deadline`, `custom` | `event` |
| `exam`, `exam_period` | `exam` |
| `ptm` | `ptm` |
| `assignment_deadline`, `class_event`, `academic_event` | `class` |
| `half_day`, `early_dismissal`, `late_opening`, `school_reopening` | `operations` |
| `emergency_closure`, `weather_closure` | `emergency` |
| `transport_closure`, `transport_timing_change`, `route_change` | `transport` |

Unknown `eventType` → treat as `custom` / category `event`.

### 3.4 `audience.type`

`everyone` · `roles` · `classes` · `students` · `teachers` · `drivers` · `routes`

### 3.5 Operations

| Field | Values |
|-------|--------|
| `schoolStatus` | `open`, `closed`, `half_day`, `late_opening` |
| `classesStatus` | `normal`, `cancelled` |
| `studentAttendance` | `required`, `not_required`, `holiday` |
| `teacherAttendance` | `required`, `not_required`, `holiday` |
| `transportStatus` | `normal`, `cancelled`, `updated` |
| `transportScope` | `all`, `selected` |

### 3.6 Recurrence

`none` · `daily` · `weekdays` · `weekly` · `monthly` · `yearly` · `custom`

`recurrenceWeekdays`: integers `0=Sun … 6=Sat` (JS `Date.getDay()`).

### 3.7 Unified feed `source`

`EVENT` · `HOLIDAY` · `EXAM` · `ASSIGNMENT` · `CLASS` · `TRANSPORT` · `NOTICE`

Native calendar rows use `EVENT` or `HOLIDAY`. Do not copy exams into `calendar_events`.

### 3.8 Reminder codes

`immediate` · `30m` · `1h` · `1d` · `3d` · `7d`

### 3.9 Notification job `kind`

`published` · `updated` · `cancelled` · `reminder` · `reopening` · `transport_resume`

---

## 4. Canonical event JSON (request + response)

```json
{
  "id": "cal-diwali-2026",
  "schoolId": "school-1",
  "branchId": null,
  "academicYear": "2026-27",
  "title": "Diwali Holiday",
  "description": "School closed for Diwali. Classes and transport cancelled.",
  "eventType": "festival",
  "eventCategory": "holiday",
  "startDate": "2026-11-08",
  "endDate": "2026-11-08",
  "startTime": null,
  "endTime": null,
  "timezone": "Asia/Kolkata",
  "isAllDay": true,
  "location": "",
  "meetingUrl": "",
  "imageUrl": null,
  "attachmentUrl": null,
  "displayColor": "#e11d48",
  "icon": "Sparkles",
  "priority": "high",
  "recurrence": "none",
  "recurrenceWeekdays": [],
  "recurrenceUntil": null,
  "recurrenceRrule": null,
  "parentEventId": null,
  "excludedDates": [],
  "status": "published",
  "publishAt": null,
  "publishedAt": "2026-08-01T09:00:00.000Z",
  "audience": {
    "type": "everyone",
    "roles": [],
    "classIds": [],
    "sectionIds": [],
    "studentIds": [],
    "teacherIds": [],
    "parentIds": [],
    "driverIds": [],
    "routeIds": [],
    "vehicleIds": []
  },
  "operations": {
    "schoolStatus": "closed",
    "classesStatus": "cancelled",
    "studentAttendance": "holiday",
    "teacherAttendance": "not_required",
    "transportStatus": "cancelled",
    "transportScope": "all",
    "closeTime": "",
    "openTime": "",
    "busDepartureTime": "",
    "pickupInstructions": "",
    "reopensOn": "2026-11-09"
  },
  "notifications": {
    "inApp": true,
    "push": true,
    "email": true,
    "sms": false,
    "reminders": ["immediate", "1d"],
    "requireAck": false
  },
  "acknowledgement": {
    "required": false,
    "count": 0,
    "pending": 0
  },
  "source": "HOLIDAY",
  "sourceId": null,
  "createdBy": "usr-school-admin",
  "createdByName": "Priya Sharma",
  "updatedBy": "usr-school-admin",
  "createdAt": "2026-08-01T09:00:00.000Z",
  "updatedAt": "2026-08-01T09:00:00.000Z",
  "deletedAt": null
}
```

**Date rules (critical)**

- `startDate` / `endDate` / `reopensOn` / `recurrenceUntil` / `excludedDates[]` are **civil dates** `YYYY-MM-DD` in the **school timezone** (usually `Asia/Kolkata`). Never shift all-day dates by UTC conversion.
- Timed events: store `startTime`/`endTime` as `HH:mm` in school timezone, or store UTC instants **and** still return local `YYYY-MM-DD` + `HH:mm` for the client.
- `endDate >= startDate`. Same-day timed: `endTime > startTime`.
- All-day: `isAllDay=true`, times null/empty.

**Mass-assignment:** ignore client-sent `id` on create (server generates). Ignore `createdBy`, `publishedAt`, `deletedAt` unless internal. Tenant comes from JWT / `X-Tenant-Slug`, not the body.

---

## 5. Database (MySQL 8 compatible)

Soft-delete important rows. Preserve audit. Do not wipe existing notice/exam tables.

### 5.1 `calendar_events`

| Column | Type | Notes |
|--------|------|--------|
| `id` | CHAR(36) PK | UUID |
| `tenant_id` | VARCHAR(64) NOT NULL | School / workspace |
| `school_id` | VARCHAR(64) NOT NULL | Same as existing school id |
| `branch_id` | VARCHAR(64) NULL | |
| `academic_year` | VARCHAR(32) NULL | e.g. `2026-27` |
| `title` | VARCHAR(200) NOT NULL | |
| `description` | TEXT NULL | Sanitize HTML if you ever allow it; frontend sends plain text |
| `event_type` | VARCHAR(64) NOT NULL | |
| `event_category` | VARCHAR(32) NOT NULL | |
| `start_date` | DATE NOT NULL | Civil date |
| `end_date` | DATE NOT NULL | |
| `start_time` | TIME NULL | |
| `end_time` | TIME NULL | |
| `timezone` | VARCHAR(64) NOT NULL DEFAULT `Asia/Kolkata` | |
| `is_all_day` | TINYINT(1) NOT NULL DEFAULT 1 | |
| `location` | VARCHAR(255) NULL | |
| `meeting_url` | VARCHAR(500) NULL | |
| `image_url` | VARCHAR(500) NULL | |
| `attachment_url` | VARCHAR(500) NULL | Use existing file service |
| `display_color` | VARCHAR(16) NULL | Hint only; not accessibility |
| `icon` | VARCHAR(64) NULL | |
| `priority` | VARCHAR(16) NOT NULL DEFAULT `normal` | |
| `recurrence` | VARCHAR(16) NOT NULL DEFAULT `none` | |
| `recurrence_weekdays` | JSON NULL | `[1,3,5]` |
| `recurrence_until` | DATE NULL | |
| `recurrence_rrule` | VARCHAR(255) NULL | Optional RFC 5545 |
| `parent_event_id` | CHAR(36) NULL | Series split / this-and-future |
| `excluded_dates` | JSON NULL | `["2026-08-11"]` |
| `status` | VARCHAR(16) NOT NULL DEFAULT `draft` | |
| `publish_at` | DATETIME(3) NULL | UTC |
| `published_at` | DATETIME(3) NULL | UTC |
| `school_status` | VARCHAR(16) NOT NULL DEFAULT `open` | |
| `classes_status` | VARCHAR(16) NOT NULL DEFAULT `normal` | |
| `student_attendance` | VARCHAR(16) NOT NULL DEFAULT `required` | |
| `teacher_attendance` | VARCHAR(16) NOT NULL DEFAULT `required` | |
| `transport_status` | VARCHAR(16) NOT NULL DEFAULT `normal` | |
| `transport_scope` | VARCHAR(16) NOT NULL DEFAULT `all` | |
| `close_time` | TIME NULL | Half day |
| `open_time` | TIME NULL | Late opening |
| `bus_departure_time` | TIME NULL | |
| `pickup_instructions` | TEXT NULL | |
| `reopens_on` | DATE NULL | |
| `notify_in_app` | TINYINT(1) NOT NULL DEFAULT 1 | |
| `notify_push` | TINYINT(1) NOT NULL DEFAULT 1 | |
| `notify_email` | TINYINT(1) NOT NULL DEFAULT 0 | |
| `notify_sms` | TINYINT(1) NOT NULL DEFAULT 0 | Reserved; do not hard-code vendor in event logic |
| `reminders` | JSON NULL | `["immediate","1d"]` |
| `require_ack` | TINYINT(1) NOT NULL DEFAULT 0 | |
| `source` | VARCHAR(32) NOT NULL DEFAULT `EVENT` | |
| `source_id` | VARCHAR(64) NULL | |
| `created_by` | VARCHAR(64) NOT NULL | |
| `updated_by` | VARCHAR(64) NULL | |
| `created_at` | DATETIME(3) NOT NULL | |
| `updated_at` | DATETIME(3) NOT NULL | |
| `deleted_at` | DATETIME(3) NULL | |

**Indexes**

- `(tenant_id, start_date, end_date)`
- `(tenant_id, status, event_type)`
- `(tenant_id, academic_year)`
- `(tenant_id, event_category, start_date)`
- `(tenant_id, priority, start_date)`
- `(publish_at)` WHERE `status = 'scheduled' AND deleted_at IS NULL`
- `(source, source_id)` unique where `source_id IS NOT NULL` (prevent duplicate exam projections if you persist projections)

Do **not** materialize every recurrence occurrence as a row.

### 5.2 `calendar_event_audience`

One event → many targeting rows.

| Column | Type | Notes |
|--------|------|--------|
| `id` | CHAR(36) PK | |
| `event_id` | CHAR(36) NOT NULL FK | ON DELETE CASCADE |
| `tenant_id` | VARCHAR(64) NOT NULL | |
| `audience_type` | VARCHAR(16) NOT NULL | Copy of event audience type |
| `role` | VARCHAR(32) NULL | `parent`, `teacher`, `student`, `driver` |
| `class_id` | VARCHAR(64) NULL | Existing class id — never names |
| `section_id` | VARCHAR(64) NULL | |
| `student_id` | VARCHAR(64) NULL | Existing student id |
| `teacher_id` | VARCHAR(64) NULL | |
| `parent_id` | VARCHAR(64) NULL | User id of parent |
| `driver_id` | VARCHAR(64) NULL | |
| `route_id` | VARCHAR(64) NULL | Existing transport route |
| `vehicle_id` | VARCHAR(64) NULL | Existing bus/vehicle |
| `created_at` | DATETIME(3) NOT NULL | |

Indexes: `(event_id)`, `(tenant_id, class_id)`, `(tenant_id, student_id)`, `(tenant_id, route_id)`, `(tenant_id, vehicle_id)`.

### 5.3 `calendar_acknowledgements`

| Column | Type | Notes |
|--------|------|--------|
| `id` | CHAR(36) PK | |
| `tenant_id` | VARCHAR(64) NOT NULL | |
| `event_id` | CHAR(36) NOT NULL | |
| `user_id` | VARCHAR(64) NOT NULL | |
| `acknowledged_at` | DATETIME(3) NOT NULL | |
| `device` | VARCHAR(64) NULL | `web`, `android`, `ios` |
| Unique | `(event_id, user_id)` | Idempotent ack |

### 5.4 `calendar_notification_jobs`

| Column | Type | Notes |
|--------|------|--------|
| `id` | CHAR(36) PK | |
| `tenant_id` | VARCHAR(64) NOT NULL | |
| `event_id` | CHAR(36) NOT NULL | |
| `user_id` | VARCHAR(64) NOT NULL | |
| `channel` | VARCHAR(16) NOT NULL | `in_app`, `push`, `email` (`sms` later) |
| `kind` | VARCHAR(32) NOT NULL | see 3.9 |
| `idempotency_key` | VARCHAR(190) NOT NULL UNIQUE | `cal:{eventId}:{kind}:{userId}:{channel}` |
| `payload_json` | JSON NULL | Role-specific title/body already rendered |
| `status` | VARCHAR(16) NOT NULL | `queued`, `processing`, `sent`, `failed`, `skipped` |
| `retry_count` | INT NOT NULL DEFAULT 0 | |
| `failure_reason` | VARCHAR(500) NULL | No PII dump |
| `queued_at` | DATETIME(3) NOT NULL | |
| `sent_at` | DATETIME(3) NULL | |

Index: `(status, queued_at)`, `(event_id, kind)`.

### 5.5 `calendar_audit_logs`

| Column | Type | Notes |
|--------|------|--------|
| `id` | CHAR(36) PK | |
| `tenant_id` | VARCHAR(64) NOT NULL | |
| `event_id` | CHAR(36) NULL | |
| `actor_id` | VARCHAR(64) NOT NULL | |
| `action` | VARCHAR(32) NOT NULL | `created`, `updated`, `published`, `cancelled`, `deleted`, `restored`, `emergency_sent`, `transport_changed`, `copied`, `acknowledged` |
| `previous_json` | JSON NULL | Diff snapshot |
| `next_json` | JSON NULL | |
| `created_at` | DATETIME(3) NOT NULL | |

Use existing school audit table if one already exists; otherwise this table.

### 5.6 `calendar_settings` (one row per tenant)

| Column | Type | Notes |
|--------|------|--------|
| `tenant_id` | VARCHAR(64) PK | |
| `timezone` | VARCHAR(64) DEFAULT `Asia/Kolkata` | Prefer school settings if already stored |
| `week_starts_on` | TINYINT DEFAULT 1 | `0=Sun … 6=Sat`; India typically `1` |
| `working_days` | JSON | `[1,2,3,4,5,6]` Mon–Sat |
| `default_reminders` | JSON | `["immediate"]` |
| `emergency_override_prefs` | TINYINT(1) DEFAULT 1 | |
| `updated_at` | DATETIME(3) | |

---

## 6. APIs to implement

All list endpoints **must** filter by tenant + audience (except managers listing drafts).

Paginate. Default `page=1`, `size=50`, max `size=200`. Calendar month views send `from` + `to` (about 42 days). Do not return years of rows.

### 6.1 `GET /calendar/events`

**Query**

| Param | Type | Description |
|-------|------|-------------|
| `from` | `YYYY-MM-DD` | Inclusive |
| `to` | `YYYY-MM-DD` | Inclusive |
| `status` | string | |
| `eventType` | string | |
| `category` | string | `holiday`, `emergency`, … |
| `priority` | string | |
| `academicYear` | string | |
| `q` | string | Search title, description, location (permission-scoped) |
| `classId` | string | Extra filter |
| `includeDeleted` | boolean | Admin only |
| `page`, `size` | int | |

**Include recurrence overlap:** a weekly series starting before `from` still returns if any occurrence falls in range. Expand in the **response** as either:

- Option A (simpler for current SPA): return **series masters** that overlap the range; frontend expands.
- Option B (preferred): return expanded occurrences with `id` = series id, `occurrenceDate`, `occurrenceId` = `{id}:{date}`.

Current SPA expands locally. Either is OK if `startDate`/`endDate`/`recurrence*` are correct.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [ { "...event..." } ],
    "page": 1,
    "size": 50,
    "total": 12
  }
}
```

Also acceptable: `data` as a bare array (frontend `asCrudList` supports both).

**Errors:** `401`, `403`.

---

### 6.2 `GET /calendar/events/{id}`

- 404 if missing, other tenant, or caller not in audience (do not leak existence across schools).
- Managers may load drafts.

**Response `200`:** `{ "success": true, "data": { ...event } }`

---

### 6.3 `POST /calendar/events`

**Roles:** school_admin, admission_officer, super_admin (tenant-scoped).

**Body:** canonical event without `id`. `status` default `draft`.

If `status=published` on create, run the **publish transaction** (section 7) in the same request **after** insert — still enqueue email, do not send SMTP inline.

**Validation `400`**

- Title required
- `startDate` required
- `endDate >= startDate`
- Times valid when not all-day
- `publishAt` in the future if `scheduled`
- Recurrence until >= start
- Class/route/student ids must exist in this tenant (no typed names)
- If `transportStatus` is `cancelled`/`updated` and `transportScope=selected`, require `routeIds` or `vehicleIds`

**Conflict warnings (do not hard-fail unless you choose):** exam vs school closed, PTM vs closure, transport operating vs transport cancelled. Return `meta.warnings: [{ code, message }]` so admin can override.

**Response `201`:** created event.

---

### 6.4 `PATCH /calendar/events/{id}`

Partial update. Recalculate `eventCategory` from `eventType` if type changes.

If event is **published** and a **meaningful** field changed, enqueue `kind=updated` notifications (section 8). Meaningful fields:

- `title`, `startDate`, `endDate`, `startTime`, `endTime`, `location`
- `operations.schoolStatus`, `transportStatus`, `classesStatus`, `closeTime`, `openTime`, `busDepartureTime`
- audience targeting

Do **not** notify for `displayColor`, icon, internal notes.

**Recurring edit modes** (body extra fields):

```json
{
  "editMode": "this" | "future" | "series",
  "occurrenceDate": "2026-08-24"
}
```

- `this` — add `occurrenceDate` to `excludedDates`; insert exception row with `parentEventId`.
- `future` — set series `recurrenceUntil` to day before occurrence; insert new series from that date.
- `series` — update master.

If `editMode` omitted, update the master (current SPA behavior).

---

### 6.5 `DELETE /calendar/events/{id}`

Soft delete: `deleted_at=now`, `status=archived`.  
Response `{ "success": true, "data": { "ok": true } }`.

Optional later: `POST /calendar/events/{id}/restore`.

---

### 6.6 `POST /calendar/events/{id}/publish`

Preferred over PATCH-for-publish. Frontend currently PATCHes status; support **both**.

Idempotent: second publish must not duplicate notification jobs.

Runs publish transaction (section 7).

---

### 6.7 `POST /calendar/events/{id}/cancel`

```json
{ "reason": "Sports Day cancelled due to rain" }
```

Set `status=cancelled`. Keep history. If it was published, enqueue `kind=cancelled`.

---

### 6.8 `POST /calendar/events/{id}/duplicate`

Copy settings. Force `status=draft`, clear `publishedAt`, do not copy acknowledgements or notification jobs. Title suffix ` (copy)` is OK.

---

### 6.9 `POST /calendar/events/{id}/acknowledge`

```json
{ "device": "web" }
```

`userId` comes from JWT, **not** trusted from body (frontend currently sends `userId`; ignore it).

Unique `(event_id, user_id)`. Response `{ "ok": true, "duplicate": true|false }`.

---

### 6.10 `GET /calendar/feed`

Unified feed for calendars. **This is what production should use** instead of the SPA stitching exams/homework/notices.

**Query:** `from`, `to`, plus same filters as list. Optional `childStudentId` for parents.

**Response items** must include `source` and `sourceId`:

| source | Opens |
|--------|--------|
| `EVENT` / `HOLIDAY` | Calendar detail |
| `EXAM` | Existing exam screen (`sourceId` = exam id) |
| `ASSIGNMENT` | Homework (`sourceId` = homework id) |
| `NOTICE` | Notice detail |
| `TRANSPORT` | Driver/parent transport |

Do not duplicate a native holiday that was also posted as a notice (dedupe by title+date or by linking `sourceId`).

Expand recurrence for the requested range only.

---

### 6.11 `GET /calendar/holidays`

Same as list with `category` in `holiday,vacation`. Admin holidays page.

---

### 6.12 `POST /calendar/holidays/copy`

```json
{ "fromYear": "2026-27", "toYear": "2027-28" }
```

Copy holiday + vacation events to `toYear` as **drafts**.  
**Do not** assume festival dates stay the same; copy dates as-is and require admin review before publish.  
Append description: `Copied from 2026-27. Confirm the date before publishing.`

Response: array of created drafts.

---

### 6.13 `GET /calendar/emergencies`

Active or listed emergency/weather closures. Query `from`,`to`,`activeToday=true`.

---

### 6.14 `GET /calendar/operations`

**Query:** `date=YYYY-MM-DD` required. Optional `classId`, `routeId`.

**Response:** operational snapshot for attendance + transport:

```json
{
  "date": "2026-11-08",
  "schoolStatus": "closed",
  "classesStatus": "cancelled",
  "studentAttendance": "holiday",
  "teacherAttendance": "not_required",
  "transportStatus": "cancelled",
  "transportScope": "all",
  "closeTime": null,
  "openTime": null,
  "busDepartureTime": null,
  "reopensOn": "2026-11-09",
  "eventId": "cal-diwali-2026",
  "title": "Diwali Holiday"
}
```

If multiple events, precedence: `emergency` > `closed` > `half_day` / `late_opening` > `open`.

Attendance module **must** call this (or an internal service) before treating unmarked students as `ABSENT`.

---

### 6.15 `GET /calendar/analytics`

Admin dashboard cards.

```json
{
  "total": 40,
  "published": 32,
  "holidays": 12,
  "emergencies": 1,
  "transportChanges": 3,
  "pendingAcknowledgements": 18,
  "notificationsQueued": 400,
  "notificationsSent": 380,
  "notificationsFailed": 2
}
```

Optional query `from`,`to`,`academicYear`.

---

### 6.16 `GET /calendar/events/{id}/acknowledgements`

Admin: `{ sent, delivered, viewed, acknowledged, pending }` counts + paginated user list. Retry failed jobs: see 6.18.

---

### 6.17 `GET /calendar/events/{id}/audit`

Admin audit trail for that event.

---

### 6.18 `POST /calendar/events/{id}/notifications/retry`

Retry `failed` jobs only. New idempotency key suffix `:retry:{n}` or reset status to `queued` if original never sent. Never send a second email if `sent`.

---

### 6.19 `GET /calendar/events/{id}/ics`

Standards ICS (`UID`, `DTSTART`, `DTEND`, `SUMMARY`, `DESCRIPTION`, `LOCATION`, `TZID`).  
Strip internal notes. 404 if caller cannot view the event.

Frontend currently generates ICS in-browser; server ICS is for email “Add to calendar” and mobile.

---

### 6.20 `GET /calendar/settings` · `PATCH /calendar/settings`

Timezone, week start, working days, default reminders. Reuse school settings if already stored; do not duplicate conflicting timezone sources.

---

### 6.21 Bulk (admin holidays)

`POST /calendar/holidays/bulk`

```json
{
  "ids": ["...", "..."],
  "action": "publish" | "archive" | "assignYear",
  "academicYear": "2027-28"
}
```

Confirm-style: require explicit `action`. Transaction per batch. Skip ids the actor cannot manage.

---

## 7. Publish transaction (required)

One DB transaction, then queue:

1. Save event + audience rows.
2. If `schoolStatus=closed` / emergency: persist operations (already on the row).
3. Resolve audience **user ids** (section 9). Persist recipient snapshot optional (`calendar_notification_jobs` is enough).
4. Insert notification jobs with unique `idempotency_key`.
5. Insert audit `published` / `emergency_sent`.
6. Commit.
7. Workers send in-app / FCM / email.

If any step before commit fails, roll back. No orphan emails.

**Idempotency:** `Idempotency-Key` request header recommended on publish. Same key + same event → return existing published event, do not enqueue again.

---

## 8. Notification engine

Do not send production email inside the HTTP thread if the project already has a queue (use it).

### 8.1 Channels

| Channel | Now | Later |
|---------|-----|--------|
| `in_app` | Required — existing `/notifications` | |
| `push` | Required — existing FCM | |
| `email` | Required if `notify_email` | |
| `sms` / WhatsApp | Columns reserved | Do not couple event domain to a vendor |

### 8.2 Job statuses

`queued` → `processing` → `sent` | `failed` (increment `retry_count`). Worker must be safe on double pickup (unique key).

### 8.3 Role-specific copy (do not send one generic string)

Examples for Diwali, school closed, transport cancelled:

| Role | Message |
|------|---------|
| Parent | `School will remain closed on {date} for {title}. Classes and transport services are unavailable.` |
| Student | `No school on {date} — {title}.` |
| Teacher | `School is closed on {date} for {title}.` |
| Driver | `Bus service is cancelled on {date} because of {title}.` (include route/bus code if known) |

Half day: include `closeTime` and `busDepartureTime`.  
Late opening: include `openTime`.  
Cancellation: `Cancelled: {title}` + reason.  
Update: old vs new time/location only.

### 8.4 Deep links (`webRoute` / notification `type`)

| Event | `type` | Path |
|-------|--------|------|
| Holiday / event | `calendar` | `/parent/calendar`, `/teacher/calendar`, `/admin/calendar`, `/driver/calendar` |
| Emergency | `emergency` | same calendar routes |
| Exam sourced | existing exam type | existing exam URL |
| Route change | `calendar` | `/driver/calendar` or `/parent/transport` |

Frontend `resolveNotificationPath` already maps `calendar` and `emergency`.

### 8.5 Preferences

Honor user email/push flags for non-emergency.  
`priority=emergency` + school `emergency_override_prefs`: send anyway.

### 8.6 Reminders

Worker scans published events: fire reminder at `event start (timezone) minus offset`. Skip if job with same idempotency exists.

Also:

- Reopening reminder: day before `reopensOn` if configured.
- Transport resume: day before school reopens when `transportStatus` was `cancelled`.

### 8.7 In-app payload (align with existing notifications)

```json
{
  "userId": "usr-parent",
  "title": "Diwali Holiday",
  "message": "School will remain closed on 2026-11-08 for Diwali Holiday. Classes and transport services are unavailable.",
  "type": "calendar",
  "eventId": "cal-diwali-2026",
  "read": false,
  "webRoute": "/parent/calendar",
  "createdAt": "2026-08-01T09:00:00.000Z"
}
```

---

## 9. Audience resolution (server)

Resolve to **user ids**, not denormalized names.

| `audience.type` | Recipients |
|-----------------|------------|
| `everyone` | Active users in tenant except maybe `super_admin` / `support_staff` per product rules. Include parent, student, teacher, driver. |
| `roles` | Users whose role is in `roles[]` (lowercase: `parent`, `teacher`, `student`, `driver`) |
| `classes` | Students in `classIds` (+ `sectionIds` if set); **parents of those students**; teachers assigned to those classes if `includeTeachers` equivalent (frontend class targeting implies parents+students; include assigned teachers) |
| `students` | Those `studentIds` + their parents; optional listed `parentIds` |
| `teachers` | Listed `teacherIds`, or all teachers if empty |
| `drivers` | Listed `driverIds`, or all drivers if empty |
| `routes` | Drivers on those routes/vehicles + parents/students assigned to those routes |

**Multi-child parents:** a parent with Aarav (3A) and Anaya (6B) receives a 3A-only event once, not Anaya’s. Feed items should still be filterable by `studentId` on the parent calendar (`appliesTo` list: `{ studentId, studentName, classId }`).

**Teacher training example**

- Audience `roles: [teacher]` (or `teachers`)
- Operations: students `holiday`, teachers `required`
- Optionally notify parents with a **parent** template even if parents are not in audience — product choice. Frontend Diwali notifies everyone; teacher training seed is teachers-focused. If `notifications` are on and audience is teachers only, **do not** email all parents.

---

## 10. Integrations (must be real, not UI-only)

### 10.1 Attendance

When `GET /calendar/operations?date=` says `studentAttendance=holiday` or `schoolStatus=closed`:

- Do **not** auto-mark students `ABSENT`.
- Prefer default `EXCUSED` / holiday status if the attendance catalog has it; otherwise block finalize with a clear error.
- Never rewrite **historical** finalized sessions.

### 10.2 Transport

- `transportStatus=cancelled` + `transportScope=all` → all routes that day.
- `transportScope=selected` → only `routeIds` / `vehicleIds`.
- Half day / late opening: expose `busDepartureTime` / `openTime` to driver trip APIs so GPS trips are not “on time” against the old 15:30.

### 10.3 Exams / homework / notices / timetable

Feed aggregation only. Source of truth stays in those modules. Optional: when an exam is created, do **not** insert `calendar_events` unless you need a holiday-style operations overlay.

### 10.4 Existing notice board

Keep working. Calendar is the operational timeline; notices remain announcements. Deduplicate in `/calendar/feed`.

---

## 11. Scheduled jobs

Use the existing scheduler. Each job must be **tenant-looped** and **idempotent**.

| Job | Cadence | Action |
|-----|---------|--------|
| Publish due | 1 min | `status=scheduled` AND `publish_at <= now` → publish transaction |
| Reminders | 1 min | Due reminder windows |
| Reopening / resume | hourly | Day-before messages |
| Complete past events | daily | `published` + `end_date < today` → `completed` (optional) |
| Email/push worker | continuous | Drain `calendar_notification_jobs` |

Log failures **without** dumping student names/phones into logs.

---

## 12. Security checklist

- Tenant isolation on every query
- No IDOR on get/update/delete/ack
- Parents: child graph from existing parent-student tables
- Drivers: assignment tables already used by transport
- Validate file uploads via existing media service (type, size)
- Sanitize description
- Rate-limit publish / retry to prevent notification bombs
- Do not accept `schoolId` from client that differs from tenant

---

## 13. Error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "End date must be on or after the start date.",
    "details": []
  }
}
```

| HTTP | Code |
|------|------|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` (optional hard conflict) |
| 422 | `NO_RECIPIENTS` (publish with empty audience) |
| 429 | `RATE_LIMITED` |

No stack traces in body.

---

## 14. Frontend mapping (what to return)

The web normalizer reads:

`id`, `title`, `description`, `eventType`/`type`, `eventCategory`/`category`, `startDate`/`start_date`/`date`, `endDate`/`end_date`, `startTime`/`start_time`, `endTime`/`end_time`, `timezone`, `isAllDay`, `location`, `meetingUrl`/`meeting_url`, `displayColor`/`color`, `priority`, `recurrence`, `recurrenceWeekdays`, `recurrenceUntil`/`recurrence_end_date`, `parentEventId`/`parent_event_id`, `excludedDates`, `status`, `publishAt`, `publishedAt`, `academicYear`/`academic_year`, `audience`, `operations`, `notifications`, `acknowledgement`, `source`, `sourceId`/`source_id`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`, `deletedAt`.

List helpers accept `{ items: [] }` or a raw array.

---

## 15. Suggested implementation order

1. Tables + tenant indexes + Flyway/Liquibase migration (empty; no data wipe).
2. CRUD `GET/POST/PATCH/DELETE /calendar/events` with RBAC + audience SQL.
3. Acknowledge + audit.
4. Publish transaction + in-app notifications (reuse existing notification table).
5. Queue email + FCM.
6. `GET /calendar/operations` + attendance hook.
7. Transport scope on live/trip services.
8. `GET /calendar/feed` (exams + homework + notices).
9. Copy holidays, analytics, ICS, bulk, settings, reminder jobs.
10. Recurring `editMode` this/future/series.

---

## 16. Backend tests (minimum)

- CRUD + publish + cancel + duplicate + copy holidays (drafts only)
- Parent sees child class event; other child class hidden
- Driver route-specific; other route 404
- Cross-tenant get/update 404
- All-day Diwali stays `2026-11-08` in `Asia/Kolkata` (no off-by-one)
- Recurrence weekly expand in range; excluded date omitted
- Second publish does not send duplicate email
- Holiday date → attendance not ABSENT
- Selected-route cancel does not cancel all routes
- Ack unique constraint

---

## 17. Out of scope for v1 backend

- Public-holiday internet scraping
- SMS/WhatsApp vendors
- AI assistant (keep APIs clean so “is school open tomorrow?” can call `GET /calendar/operations`)
- CSV import (design `POST /calendar/holidays/import` later)

---

## 18. Done when

- Web calendar pages load from API (no localStorage fallback on 200s)
- Publish from admin notifies parent, teacher, student, driver with different copy
- Emergency appears in in-app + push immediately
- Attendance does not mark absences on full-school holiday
- Transport cancel is route-scoped when configured
- Mobile apps can consume the same `/api/v1/calendar` contract later without a second model
