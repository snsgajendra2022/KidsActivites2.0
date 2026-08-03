# Advanced Attendance — Backend Contract

Related:

- Daily class attendance (session bulk mark): [`STUDENT_ATTENDANCE_BACKEND_CONTRACT.md`](./STUDENT_ATTENDANCE_BACKEND_CONTRACT.md)
- Full API index: [`FULL_BACKEND_API_CONTRACT.md`](./FULL_BACKEND_API_CONTRACT.md) §17 Advanced Attendance

Base URL: `{API_BASE_URL}` ending in `/api/v1`  
Auth: Bearer JWT + `X-Tenant-Slug` matching the workspace in the token.

---

## Purpose

Capture **single attendance events** beyond whole-class daily sessions:

| Mode | Use |
|------|-----|
| `daily` | One student whole-day status override / late correction |
| `period` | Period-wise mark for one student |
| `late` | Late entry with arrival time |
| `early` | Early leave with time + note |
| `qr` | QR scanner check-in/out |
| `rfid` | RFID reader ingest |
| `face` | Face-recognition check-in (consent required server-side) |

Web UI: `/{tenant}/admin/attendance-advanced`  
Frontend: `src/pages/modules/AdvancedAttendancePage.jsx`  
Service: `saveAttendanceEvent()` in `src/services/attendanceService.js`

---

## Rules

- Authenticated admin (or role permitted for attendance write)
- Tenant / workspace scoped — reject JWT ↔ `X-Tenant-Slug` mismatch with `403`
- `studentId` must belong to `classId` in this workspace
- Prefer relationship IDs only (`classId`, `studentId`) — do not require denormalized names
- Device modes (`qr` | `rfid` | `face`) must be **idempotent** on `deviceEventId`
- When `notifyParent: true`, enqueue App/SMS/push after persist (do not block response on delivery)

---

## Statuses

`PRESENT` · `ABSENT` · `LATE` · `EARLY_LEAVE` · `HALF_DAY` · `EXCUSED`

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/admin/attendance/events` | Create one advanced attendance event |
| `POST` | `/admin/attendance/sessions/{id}/bulk` | Bulk update inside an existing session (optional) |
| `POST` | `/devices/attendance/ingest` | Device gateway ingest (API key / device auth) |
| `GET` | `/admin/attendance/reports` | Advanced attendance reports feed |

---

## `POST /admin/attendance/events`

### Request body

```json
{
  "mode": "period",
  "date": "2026-08-03",
  "classId": "uuid-or-id",
  "period": 1,
  "studentId": "uuid-or-id",
  "status": "LATE",
  "time": "09:15",
  "notifyParent": true,
  "note": "Arrived after assembly",
  "deviceEventId": null,
  "sessionId": null
}
```

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `mode` | string | yes | `daily` \| `period` \| `late` \| `early` \| `qr` \| `rfid` \| `face` |
| `date` | string `YYYY-MM-DD` | yes | Attendance calendar date |
| `classId` | string | yes | Existing class |
| `studentId` | string | yes* | Must be enrolled in `classId` |
| `studentIds` | string[] | yes* | Prefer for multi-student capture; backend may expand to one event per id |
| `status` | string | yes | See Statuses |
| `time` | string `HH:mm` | recommended | Required for `late` / `early`; optional otherwise |
| `period` | number \| null | for `period` | Period number ≥ 1 when `mode=period`; otherwise `null` |
| `notifyParent` | boolean | no | Default `false` |
| `note` | string | no | Free-text reason / remark |
| `deviceEventId` | string | for device modes | Required for `qr` / `rfid` / `face`; unique per tenant for idempotency |
| `sessionId` | string \| null | no | Link to daily session if already open |

### Success response `200` / `201`

```json
{
  "success": true,
  "data": {
    "id": "evt_123",
    "mode": "period",
    "date": "2026-08-03",
    "classId": "uuid-or-id",
    "studentId": "uuid-or-id",
    "status": "LATE",
    "time": "09:15",
    "period": 1,
    "notifyParent": true,
    "notificationQueued": true,
    "message": "Attendance event recorded."
  }
}
```

### Errors

| Status | Code / meaning |
|--------|----------------|
| `400` | Validation (missing fields, invalid mode/status/period) |
| `403` | Forbidden / tenant mismatch |
| `404` | Class or student not found |
| `409` | Duplicate `deviceEventId` (return existing event instead of failing hard if preferred) |
| `422` | Student not in class |

---

## `POST /devices/attendance/ingest`

Device gateway variant. Same core fields; authenticate with device credentials (not user JWT). Must upsert by `deviceEventId`.

```json
{
  "mode": "rfid",
  "deviceEventId": "scanner-event-123",
  "studentId": "uuid-or-id",
  "classId": "uuid-or-id",
  "date": "2026-08-03",
  "time": "09:03",
  "status": "PRESENT",
  "notifyParent": true
}
```

---

## `GET /admin/attendance/reports`

Query params (suggested): `from`, `to`, `classId`, `mode`, `status`, `studentId`.

Return a list/summary suitable for admin dashboards. Shape may evolve; frontend currently has a soft client helper `getAdvancedAttendanceReports()`.

---

## Frontend payload (current)

Built in `AdvancedAttendancePage` → `saveAttendanceEvent(payload)`:

```js
{
  mode,           // UI mode id
  date,           // YYYY-MM-DD
  classId,
  studentId,
  status,
  time,           // HH:mm or null
  period,         // number when mode=period, else null
  notifyParent,   // boolean
  note,           // string
  deviceEventId,  // set for qr|rfid|face from note field
}
```

Class / student selects use role-scoped APIs (`useClassStudentOptions`) — IDs only in the write request.

---

## Relation to daily session attendance

| Feature | Path family |
|---------|-------------|
| Whole-class daily mark | `/attendance/session` (see student attendance contract) |
| Single advanced / device event | `/admin/attendance/events` (this doc) |

Prefer linking an event to `sessionId` when a daily session already exists for that class+date, so reports stay consistent.
