# KidsActivities 2.0 — New Work Backend API Contract

> This document contains **only APIs required by the newly added Student Profile
> and School ERP modules**.
>
> Unchanged APIs for authentication, admissions, chat, notices, albums, core
> attendance, and other previously implemented features are intentionally
> excluded.
>
> Base URL: `{API_BASE_URL}/api/v1`  
> Tenant header: `X-Tenant-Slug: {tenantSlug}`  
> Authentication: `Authorization: Bearer {accessToken}`

---

## 1. Shared conventions

### Success

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

The frontend also accepts a raw object/array during migration.

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "dueDate",
        "message": "Due date is required"
      }
    ]
  }
}
```

Use:

- `400` invalid input
- `401` unauthenticated
- `403` insufficient permission
- `404` missing or wrong-tenant record
- `409` state/version/conflict error
- `413` attachment too large
- `429` rate limited

### List query

All new list endpoints should support:

```text
?q=&page=1&pageSize=20&sort=createdAt,desc
```

They may also accept module-specific exact-match filters.

### Common fields

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "version": 1,
  "createdAt": "2026-07-30T08:00:00Z",
  "updatedAt": "2026-07-30T08:00:00Z",
  "createdByUserId": "uuid",
  "updatedByUserId": "uuid",
  "deletedAt": null
}
```

Use UUIDs, ISO-8601 timestamps, `YYYY-MM-DD` dates, and tenant isolation on every query.

### Generic CRUD contract

The newly scaffolded frontend services use this contract:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/{resource}` | List records |
| GET | `/admin/{resource}/{id}` | Get one record |
| POST | `/admin/{resource}` | Create |
| PATCH | `/admin/{resource}/{id}` | Partial update |
| DELETE | `/admin/{resource}/{id}` | Delete/soft-delete |

Create and update return the resulting record. Lists may return an array or `{ items, page, pageSize, total }`.

### Relationship selector APIs

The updated ERP forms no longer accept manually typed student, class, subject,
teacher, exam, or book names. The backend must support these ID-based option
sources:

| Method | Path | Role/scope | Purpose |
|--------|------|------------|---------|
| GET | `/admin/classes?status=active&q=` | Authorized school staff | Active class options |
| GET | `/teacher/classes` | Teacher | Assigned classes only |
| GET | `/admin/students?classId={classId}&sectionId={sectionId?}&status=active&q=` | Authorized school staff | Enrolled students in the selected class |
| GET | `/teacher/students?classId={classId}&sectionId={sectionId?}&q=` | Teacher | Students from assigned classes only |
| GET | `/parent/children` | Parent/student | Own linked children only |
| GET | `/admin/subjects?classId={classId?}&status=active&q=` | Authorized school staff | Subject master options |
| GET | `/teacher/subjects?classId={classId}&q=` | Teacher | Subjects assigned to that teacher/class |
| GET | `/admin/teachers?classId={classId?}&subjectId={subjectId?}&status=active&q=` | School admins | Eligible teacher options |
| GET | `/admin/exams?classId={classId?}&status={status?}&q=` | Authorized school staff | Exam options for marks entry |
| GET | `/admin/library/books?availableOnly=true&q=` | Library-authorized staff | Issueable books |

Option lists must return stable IDs and display fields:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Class 5",
      "code": "5",
      "sectionId": "uuid",
      "sectionName": "A"
    }
  ]
}
```

Requirements:

- Apply tenant and role scope before search/filtering.
- Never trust denormalized display names submitted by clients.
- Validate every submitted FK belongs to the same tenant and is active.
- Teacher selectors must enforce class/subject assignment.
- Parent selectors must never return another parent's child.
- Support server-side search and pagination; small catalogs may return arrays
  during migration.
- The frontend currently has a temporary static subject catalog. Production
  must implement `/admin/subjects` and class/teacher subject assignments before
  that fallback is removed.

---

## 2. Student Profile and Transfer Certificate

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/students/{studentId}` | Load the new full student profile |
| PATCH | `/admin/students/{studentId}` | Update profile, guardian, emergency, or medical data |
| PATCH | `/admin/students/{studentId}/class` | Assign an existing class/section using `{ "classId": "uuid", "sectionId": "uuid" }` |
| POST | `/admin/students/{studentId}/transfer-certificate` | Issue a transfer certificate |

### Student profile response

```json
{
  "id": "uuid",
  "admissionNo": "ADM-2026-0012",
  "fullName": "Aarav Sharma",
  "status": "active",
  "classId": "uuid",
  "className": "Class 1",
  "sectionId": "uuid",
  "sectionName": "A",
  "rollNumber": "12",
  "dateOfBirth": "2020-04-10",
  "gender": "male",
  "bloodGroup": "B+",
  "phone": "9876543210",
  "email": "parent@example.com",
  "address": {
    "line1": "Address",
    "line2": "",
    "city": "Pune",
    "state": "Maharashtra",
    "postalCode": "411001"
  },
  "guardians": [
    {
      "id": "uuid",
      "name": "Parent Name",
      "relation": "Father",
      "phone": "9876543210",
      "email": "parent@example.com",
      "occupation": "",
      "isPrimary": true
    }
  ],
  "emergencyContacts": [
    {
      "id": "uuid",
      "name": "Emergency Contact",
      "relation": "Uncle",
      "phone": "9876543211"
    }
  ],
  "medical": {
    "allergies": "None",
    "conditions": "",
    "medications": "",
    "doctorName": "",
    "doctorPhone": "",
    "notes": ""
  },
  "documents": [
    {
      "id": "uuid",
      "fieldKey": "birthCertificate",
      "fileName": "birth-certificate.pdf",
      "mimeType": "application/pdf",
      "url": "https://signed-url",
      "status": "verified"
    }
  ],
  "transferCertificate": null,
  "history": [
    {
      "id": "uuid",
      "action": "ADMISSION_CONFIRMED",
      "note": "Student admission confirmed",
      "at": "2026-07-30T08:00:00Z",
      "performedBy": "School Admin"
    }
  ]
}
```

### Update request

`PATCH /admin/students/{studentId}`

```json
{
  "classId": "class-uuid",
  "sectionId": "section-uuid",
  "rollNumber": "18",
  "bloodGroup": "B+",
  "address": {
    "line1": "Updated address",
    "city": "Pune",
    "state": "Maharashtra",
    "postalCode": "411001"
  },
  "guardians": [],
  "emergencyContacts": [],
  "medical": {
    "allergies": "Peanuts",
    "conditions": "",
    "medications": "",
    "notes": ""
  }
}
```

Class assignment may also use the focused endpoint:

```http
PATCH /admin/students/{studentId}/class
Content-Type: application/json

{ "classId": "class-uuid", "sectionId": "section-uuid" }
```

Validate that the class/section belongs to the current tenant and is active.
The response includes resolved class/section display labels.

### Issue transfer certificate

`POST /admin/students/{studentId}/transfer-certificate`

```json
{
  "issueDate": "2026-07-30",
  "reason": "Family relocation",
  "lastClass": "Class 1",
  "conduct": "Good",
  "issuedBy": "Principal",
  "overridePendingFees": false
}
```

Response:

```json
{
  "id": "uuid",
  "certificateNumber": "TC-2026-0001",
  "studentId": "uuid",
  "issueDate": "2026-07-30",
  "reason": "Family relocation",
  "lastClass": "Class 1",
  "conduct": "Good",
  "issuedBy": "Principal",
  "pdfUrl": "https://signed-url",
  "status": "issued"
}
```

Requirements:

- Allocate certificate numbers atomically per tenant and academic year.
- Change student lifecycle to `transferred`.
- Block issuance when fees are pending unless an authorized override is supplied.
- Record the issue and any override in audit history.
- Reissuing/revoking must preserve previous certificate records.

---

## 3. Homework and Submissions

### CRUD resources

```text
/admin/homework
/admin/homework-submissions
```

### Homework create/update request

```json
{
  "title": "Math practice worksheet",
  "subjectId": "uuid",
  "classId": "uuid",
  "sectionId": "uuid",
  "teacherId": "uuid",
  "dueDate": "2026-08-02",
  "status": "draft",
  "description": "Complete exercises 1–20.",
  "maxMarks": 20,
  "attachments": [
    {
      "id": "uuid",
      "url": "https://signed-url",
      "name": "worksheet.pdf",
      "mime": "application/pdf",
      "size": 12345
    }
  ],
  "assignedStudentIds": ["student-uuid-1", "student-uuid-2"]
}
```

`assignedStudentIds: null` means the entire active class/section roster.
An empty array must be normalized to `null` or rejected as ambiguous. Display
fields (`className`, `subject`, `teacherName`) are read-response conveniences
only; the server resolves them from the submitted IDs.

### Submission create/update request

```json
{
  "homeworkId": "uuid",
  "studentId": "uuid",
  "status": "submitted",
  "marks": null,
  "comments": "",
  "attachments": [],
  "submittedAt": "2026-08-01T10:30:00Z"
}
```

### Workflow endpoints

| Method | Path | Body |
|--------|------|------|
| GET | `/teacher/homework` | Filters; assigned classes only |
| GET | `/parent/homework` | Filters; own children only |
| POST | `/parent/homework/{id}/submit` | `{ studentId, comments?, attachments[] }` |
| POST | `/admin/homework/{id}/assign` | `{ studentIds?:[] }`; omitted/null means entire roster |
| POST | `/admin/homework/{id}/close` | `{ reason? }` |

Rules:

- Status: `draft | assigned | closed`.
- Submission status: `pending | submitted | late | graded | returned`.
- Assignment atomically creates one pending submission per selected student.
- Unique `(homeworkId, studentId)`.
- Grade only submitted/late work; marks cannot exceed `maxMarks`.
- For teacher requests, derive/verify `teacherId` from the authenticated user
  and class/subject assignment; do not accept arbitrary teacher IDs.
- Validate selected students belong to `classId`/`sectionId`.
- Events: `homework.assigned`, `homework.submitted`, `homework.graded`, `homework.closed`.

---

## 4. Exams, Marks, and Report Cards

### CRUD resources

```text
/admin/exams
/admin/exam-marks
```

### Exam create/update request

```json
{
  "name": "Unit Test 1",
  "type": "unit_test",
  "classId": "uuid",
  "subjectId": "uuid",
  "maxMarks": 50,
  "examDate": "2026-08-10",
  "status": "scheduled",
  "academicYearId": "uuid",
  "termId": "uuid"
}
```

### Mark create/update request

```json
{
  "examId": "uuid",
  "studentId": "uuid",
  "marksObtained": 42,
  "grade": "A",
  "rank": 1,
  "comments": "Strong understanding",
  "isAbsent": false
}
```

### Workflow endpoints

| Method | Path | Body |
|--------|------|------|
| POST | `/admin/exam-marks/bulk` | `{ examId, marks:[...] }` |
| POST | `/admin/exams/{id}/complete` | `{ overrideMissingMarks?:false }` |
| POST | `/admin/exams/{id}/publish` | `{ notifyParents?:true }` |
| GET | `/parent/exams` | Published exams only |
| GET | `/parent/exam-marks` | Own children, published only |
| POST | `/admin/report-cards/generate` | `{ studentId, termId }` |
| GET | `/admin/report-cards/{id}` | Report-card snapshot |
| GET | `/admin/report-cards/{id}/pdf` | PDF response |

Rules:

- Exam status: `draft | scheduled | completed | published`.
- Unique `(examId, studentId)`.
- Marks must be `0..maxMarks` unless absent.
- `classId`, `subjectId`, and `maxMarks` are derived from `examId`; reject
  conflicting client values.
- Server calculates grades/rank from tenant configuration. A client-provided
  grade is advisory only.
- Validate the student is enrolled in the exam class/section and the teacher
  is assigned to that class/subject.
- Publish marks and enqueue notifications in one transaction/outbox.

---

## 5. Timetable

### CRUD resource

```text
/admin/timetable
```

### Slot create/update request

```json
{
  "classId": "uuid",
  "sectionId": "uuid",
  "day": "Monday",
  "period": 1,
  "startTime": "09:00",
  "endTime": "09:40",
  "subjectId": "uuid",
  "teacherId": "uuid",
  "room": "A-101",
  "academicYearId": "uuid"
}
```

### Additional endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/admin/timetable/validate` | Dry-run conflict check |
| POST | `/admin/timetable/bulk` | Replace class/week atomically |
| GET | `/teacher/timetable` | Own timetable |
| GET | `/parent/timetable` | Child class timetable |

Return `409` with `conflicts[]` for teacher, class, or room overlaps. Require `endTime > startTime` and unique class/day/period.

The frontend performs basic class/day/period and time-range checks for early
feedback. The backend remains authoritative and must run the complete overlap
check on every create/update, not only through `/validate`.

---

## 6. Leave Requests

### CRUD resource

```text
/admin/leave-requests
```

### Create/update request

```json
{
  "studentId": "uuid",
  "classId": "uuid",
  "fromDate": "2026-08-01",
  "toDate": "2026-08-02",
  "reason": "Fever",
  "status": "pending",
  "requestedByUserId": "uuid",
  "reviewedByUserId": null,
  "reviewedAt": null,
  "reviewNote": null,
  "attachmentUrl": null
}
```

### Workflow endpoints

| Method | Path | Body |
|--------|------|------|
| POST | `/parent/leave-requests` | Leave request without status |
| GET | `/parent/leave-requests` | Own children only |
| POST | `/admin/leave-requests/{id}/approve` | `{ reviewNote? }` |
| POST | `/admin/leave-requests/{id}/reject` | `{ reviewNote }` |

Approval marks relevant attendance dates `EXCUSED` and notifies parent/teacher.

For parent/student requests, ignore or reject client-supplied `status`,
`reviewedByUserId`, and `reviewedAt`; always create with `status=pending`.
Validate `studentId` belongs to the authenticated parent and derive
`classId`/display names from the active enrollment. Require
`toDate >= fromDate`.

---

## 7. LMS

### CRUD resource

```text
/admin/lms
```

### Create/update request

```json
{
  "title": "Introduction to Numbers",
  "type": "video_lesson",
  "classId": "uuid",
  "subject": "Mathematics",
  "status": "published",
  "description": "Animated counting lesson",
  "resourceUrl": "https://media-url",
  "fileId": null,
  "payload": null,
  "publishedAt": "2026-07-30T08:00:00Z"
}
```

Types: `video_lesson | notes | study_material | quiz | practice_test | question_bank`.

Additional endpoints:

```text
POST /admin/lms/{id}/publish
POST /admin/lms/{id}/archive
GET  /parent/lms
POST /parent/lms/{id}/attempts
GET  /parent/lms/{id}/attempts/{attemptId}
```

Validate quiz payloads by type. Publish requires a resource URL, file, or valid quiz payload.

---

## 8. Transport and Live GPS Tracking

This must be implemented inside the existing Java Spring Boot backend and its
existing database. Do not deploy a separate tracking backend or create a second
database. Detailed Spring Boot integration requirements are documented in
[`docs/transport/LIVE_BUS_TRACKING.md`](./transport/LIVE_BUS_TRACKING.md).

### Master / CRUD resources

```text
/admin/transport/vehicles
/admin/transport/routes
/admin/transport/assignments
/admin/transport/gps-devices
```

### Vehicle

```json
{
  "vehicleNumber": "MH-12-AB-1234",
  "capacity": 40,
  "driverUserId": "uuid",
  "attendantUserId": "uuid",
  "status": "active",
  "routeId": "uuid"
}
```

### Route + stops

```json
{
  "name": "North Route",
  "vehicleId": "uuid",
  "stops": [
    {
      "id": "uuid",
      "name": "Stop A",
      "sequence": 1,
      "lat": 18.5204,
      "lng": 73.8567,
      "radiusMeters": 80,
      "stopType": "pickup",
      "etaOffsetMin": 10
    }
  ],
  "morningStart": "07:30",
  "eveningStart": "14:30",
  "status": "active"
}
```

### Real GPS ingest

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/tracking/location` | `X-Device-Token` + IMEI | `{ device_id?, imei, latitude, longitude, speed?, direction?, timestamp, battery? }` |
| POST | `/tracking/update-location` | Driver JWT | `{ vehicle_id, latitude, longitude, speed?, heading?, accuracy?, timestamp, trip_id? }` |
| POST | `/admin/transport/gps-devices` | Admin JWT | `{ vehicleId, imei, deviceToken, provider? }` |

Rules:

- Reject null-island `(0,0)`, out-of-range coordinates, stale (>2 min) and future timestamps.
- Rate-limit ingest (default ≥3s between accepted updates per vehicle).
- Upsert `vehicle_current_locations` and append `vehicle_location_history` in one transaction.
- Device tokens are stored hashed with a server pepper.

### Trip lifecycle

| Method | Path | Body |
|--------|------|------|
| POST | `/tracking/trips/start` | `{ vehicle_id, route_id?, direction }` |
| POST | `/tracking/trips/{id}/complete` | `{ status?: "completed"\|"cancelled" }` |
| POST | `/admin/transport/trips/{id}/pickup` | `{ studentId, stopId, event, recordedAt }` |
| GET | `/admin/transport/trips` | History filters |
| GET | `/admin/transport/live?status=` | Fleet snapshot (`all\|running\|stopped\|warning\|offline`) |
| GET | `/parent/transport/live` | Child's assigned bus only |

### Realtime WebSocket

```text
ws://{TRACKING_HOST}/ws/tracking?token={JWT}&vehicleId={optional}
```

Broadcast events through the existing Spring WebSocket/STOMP infrastructure.
Redis pub/sub may be added behind Spring only when multiple backend instances
need cross-node fan-out:

- `vehicle.location_updated`
- `vehicle.tracking_warning` (no fix for 5 minutes)
- `vehicle.tracking_offline` (no fix for 15 minutes)
- `entered_stop` / `left_stop` / `reached_school`
- `transport.trip_started` / `transport.trip_completed`

Parent sockets must be scoped to the assigned vehicle. Admin sockets receive the tenant fleet.

### Parent live response

```json
{
  "studentId": "uuid",
  "vehicleId": "uuid",
  "vehicleNumber": "MH-12-AB-1234",
  "routeName": "North Route",
  "assignedStop": "Stop B",
  "status": "running",
  "etaMinutes": 7,
  "lastStop": "Stop A",
  "nextStop": "Stop B",
  "lat": 18.5204,
  "lng": 73.8567,
  "speedKmh": 28.5,
  "heading": 92,
  "updatedAt": "2026-07-30T08:00:00Z"
}
```

Only one active trip per vehicle. ETA is computed from current GPS to next/assigned stop using live speed with fallback average speed. Geofence events enqueue push/SMS/WhatsApp-ready outbox rows.

---

## 9. Library

### CRUD resources

```text
/admin/library/books
/admin/library/issues
```

Book fields: `title`, `author`, `isbn`, `barcode`, `category`, `copies`, `available`, `status`.

Issue request fields: `classId`, `bookId`, `studentId`, `issueDate`,
`dueDate`, `returnDate`, `fine`, `status`.
`bookTitle` and `studentName` may be returned for display but are never
authoritative request fields.

```text
POST /admin/library/issues/{id}/return
POST /admin/library/jobs/mark-overdue
GET  /parent/library/issues
```

Issuing decrements availability atomically. Returning increments it and
calculates late fine. Never allow negative availability or
`available > copies`. Validate `dueDate >= issueDate`, student status is active,
and the book is available in the same tenant. Ignore client-provided fine on
return; calculate it server-side.

---

## 10. Inventory

### CRUD resource

```text
/admin/inventory
```

```json
{
  "name": "Desktop Computer",
  "category": "IT",
  "quantity": 12,
  "location": "Computer Lab",
  "condition": "good",
  "purchaseDate": "2025-06-01",
  "status": "in_stock",
  "assetTag": "ASSET-001"
}
```

Actions:

```text
POST /admin/inventory/{id}/adjust
POST /admin/inventory/{id}/issue
POST /admin/inventory/{id}/return
POST /admin/inventory/{id}/dispose
```

Adjustment body: `{ delta, reason, referenceType?, referenceId? }`.

---

## 11. HR and Payroll

### CRUD resources

```text
/admin/hr/staff
/admin/payroll
```

### Staff

```json
{
  "name": "Priya Mehta",
  "employeeId": "EMP-101",
  "role": "Teacher",
  "department": "Academics",
  "phone": "9988776655",
  "email": "priya@school.test",
  "joiningDate": "2023-04-01",
  "status": "active",
  "userId": "uuid"
}
```

### Payslip

```json
{
  "staffId": "uuid",
  "employeeName": "Priya Mehta",
  "month": "2026-07",
  "basic": 35000,
  "allowances": 5000,
  "deductions": 2500,
  "bonuses": 1000,
  "netPay": 38500,
  "status": "generated",
  "paidAt": null,
  "paymentRef": null
}
```

Additional endpoints:

```text
POST /admin/hr/staff/{id}/exit
POST /admin/payroll/generate
POST /admin/payroll/{id}/mark-paid
GET  /admin/payroll/{id}/pdf
```

Unique employee ID per tenant and unique `(staffId, month)`. Server calculates net pay. Paid slips are immutable except audited reversal.

---

## 12. Expenses and Accounting

### Expense CRUD resource

```text
/admin/expenses
```

```json
{
  "title": "Electricity Bill",
  "category": "Utilities",
  "amount": 18500,
  "currency": "INR",
  "date": "2026-07-30",
  "status": "paid",
  "vendor": "Electricity Board",
  "receiptUrl": "https://signed-url"
}
```

Actions:

```text
POST /admin/expenses/{id}/approve
POST /admin/expenses/{id}/reject
POST /admin/expenses/{id}/mark-paid
```

### Accounting dashboard

`GET /admin/accounting/dashboard?from=&to=&academicYearId=`

```json
{
  "totalStudents": 128,
  "monthlyFeeCollection": 485000,
  "pendingFees": 92000,
  "expenses": 18500,
  "payroll": 38500,
  "teacherAttendance": 96.4,
  "admissionGrowth": 18,
  "currency": "INR",
  "asOf": "2026-07-30T08:00:00Z"
}
```

---

## 13. Certificates

### CRUD resource

```text
/admin/certificates
```

```json
{
  "type": "bonafide",
  "studentId": "uuid",
  "classId": "uuid",
  "purpose": "Bank account opening",
  "certificateNumber": "BNF-2026-0001",
  "status": "issued",
  "issuedAt": "2026-07-30T08:00:00Z",
  "pdfUrl": "https://signed-url",
  "payload": {}
}
```

`studentName`, `className`, issue timestamps, and PDF URLs are generated
response fields. Validate that `studentId` is actively enrolled in `classId`.

```text
POST /admin/certificates/generate
POST /admin/certificates/{id}/revoke
GET  /admin/certificates/{id}/pdf
GET  /public/certificates/verify/{certificateNumber}
```

Certificate numbers require atomic per-type/year sequences. Revocation must preserve the original record.

---

## 14. Subscription Plans

### CRUD resource

```text
/admin/subscription/plans
```

```json
{
  "name": "Professional",
  "priceMonthly": 9999,
  "currency": "INR",
  "studentLimit": 1500,
  "features": ["fees", "exams", "parent_app", "transport"],
  "status": "available"
}
```

Additional endpoints:

```text
GET  /admin/subscription/current
POST /admin/subscription/checkout
POST /webhooks/billing/{provider}
```

Authorization:

- `GET /admin/subscription/plans`: `super_admin` and `school_admin`. School
  admins receive available plans read-only.
- `POST/PATCH/DELETE /admin/subscription/plans`: `super_admin` only.
- `GET /admin/subscription/current`: authenticated `school_admin`, scoped to
  the current tenant.
- Checkout changes the current tenant's subscription; plan catalog records are
  never edited by a school admin.

Enforce student limits and feature flags server-side.

---

## 15. Security and Login History

### Login history resource

```text
GET /admin/security/login-history
GET /admin/security/login-history/{id}
```

Login history is append-only; do not permit create/update/delete from clients.

```json
{
  "id": "uuid",
  "userId": "uuid",
  "userName": "School Admin",
  "email": "admin@school.test",
  "ip": "192.168.1.10",
  "device": "Chrome / macOS",
  "status": "success",
  "failureReason": null,
  "createdAt": "2026-07-30T08:00:00Z"
}
```

### Security center endpoints

```text
GET   /admin/security/mfa
PATCH /admin/security/mfa
POST  /admin/security/mfa/enable
POST  /admin/security/mfa/verify
GET   /admin/security/backup-policy
PUT   /admin/security/backup-policy
POST  /admin/security/backups/run
GET   /admin/security/backups
```

MFA methods: `otp_sms | totp`. Encrypt backups; restore requires privileged authorization and audit.

---

## 16. Performance Notes

### CRUD resource

```text
/admin/performance-notes
```

```json
{
  "studentId": "uuid",
  "classId": "uuid",
  "subject": "Mathematics",
  "note": "Shows improvement in problem solving.",
  "visibility": "private"
}
```

Resolve student/class/creator display labels in read responses only. Replace
the temporary subject text with `subjectId` when the subject-master API is
enabled.

```text
GET/POST/PATCH/DELETE /admin/performance-notes
GET /parent/performance-notes
```

The current shared frontend service uses `/admin/performance-notes` for both
school admins and teachers. Permit teacher-role access on this resource only
for assigned classes/students, or provide a compatible role-aware gateway
mapping. Parents see `shared_parent` notes only.

---

## 17. Advanced Attendance

```text
POST /admin/attendance/events
POST /admin/attendance/sessions/{id}/bulk
POST /devices/attendance/ingest
GET  /admin/attendance/reports
```

```json
{
  "mode": "rfid",
  "date": "2026-07-30",
  "classId": "uuid",
  "period": null,
  "studentId": "uuid",
  "status": "PRESENT",
  "time": "09:03",
  "notifyParent": true,
  "note": "",
  "deviceEventId": "scanner-event-123",
  "sessionId": "uuid"
}
```

Modes: `daily | period | late | early | qr | rfid | face`. Device ingest must be idempotent on `deviceEventId`.

---

## 18. Advanced Fees

### Resources

```text
CRUD /admin/fees/heads
CRUD /admin/fees/structures
POST /admin/fees/invoices/generate
POST /admin/fees/reminders/schedule
POST /admin/fees/refunds
POST /admin/fees/payments/checkout
POST /webhooks/payments/{provider}
GET  /parent/fees
```

### Invoice generation request

```json
{
  "classId": "uuid",
  "studentId": "uuid",
  "feeStructureId": "uuid",
  "discount": 1000,
  "scholarship": 0,
  "dueDate": "2026-08-10",
  "idempotencyKey": "invoice-student-period"
}
```

Validate that `studentId` belongs to `classId` and derive the applicable fee
heads, amounts, gross, net, and display labels from persisted relationships.
Invoice status:
`draft | issued | partial | paid | void | refunded`. Verify payment webhook
signatures. Make checkout/refund idempotent.

---

## 19. AI Assistant

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/admin/ai/ask` | `{ question, context?:{ from, to } }` | `{ answer, sources:[] }` |
| POST | `/admin/ai/report-comment` | `{ studentId, subject, notes }` | `{ comment }` |
| POST | `/admin/ai/homework` | `{ classId, subject, topic }` | `{ title, description }` |

Requirements:

- Require the subscription `ai` feature.
- Tenant-scope all retrieved context.
- Rate-limit by tenant and user.
- Scrub sensitive PII from provider logs.
- Return suggestions only; never auto-publish generated output.

---

## 20. Communication Center

```text
GET  /admin/communication/channels
PUT  /admin/communication/channels/{channel}
POST /admin/communication/send
```

Send request:

```json
{
  "channel": "whatsapp",
  "templateId": "fee-reminder",
  "audience": {
    "type": "class",
    "classId": "uuid"
  },
  "data": {
    "dueDate": "2026-08-10"
  }
}
```

Channels: `push | chat | notice | email | sms | whatsapp`. WhatsApp requires approved templates and opt-in.

---

## 21. Management Reports Hub

```text
GET /admin/reports/enrollment-growth
GET /admin/reports/attendance
GET /admin/reports/exam-performance
GET /admin/reports/fee-collection
GET /admin/reports/teacher-workload
GET /admin/reports/export?type=&format=csv|xlsx
```

Common filters:

```text
?from=2026-07-01&to=2026-07-31&classId=&academicYearId=
```

Exports must be tenant-scoped, permission-checked, and audit logged.

---

## 22. Roles and Permissions

```text
GET     /admin/roles
GET     /admin/roles/{role}/permissions
PUT     /admin/roles/{role}/permissions
POST    /admin/roles/custom
```

Update request:

```json
{
  "permissions": [
    {
      "module": "fees",
      "actions": ["read", "create", "update", "approve", "export"],
      "scope": "finance"
    }
  ]
}
```

Permission actions: `create | read | update | delete | approve | publish | export | configure`.

---

## 23. Required Domain Events

Publish events through a transactional outbox:

```text
homework.assigned
homework.submitted
homework.graded
exam.scheduled
exam.marks_published
report_card.published
timetable.updated
leave.requested
leave.approved
lms.published
transport.trip_started
transport.location_updated
transport.student_boarded
library.issued
library.returned
inventory.adjusted
inventory.low_stock
hr.staff_created
hr.staff_exited
payroll.generated
payroll.paid
expense.paid
certificate.issued
certificate.revoked
subscription.updated
security.login_failed
security.mfa_enabled
security.backup_completed
performance_note.shared
attendance.marked
attendance.parent_notified
fee.invoice_issued
fee.payment_succeeded
fee.refund_processed
comm.message_sent
report.exported
```

Event envelope:

```json
{
  "id": "evt_uuid",
  "type": "homework.assigned",
  "tenantSlug": "school-slug",
  "occurredAt": "2026-07-30T08:00:00Z",
  "data": {}
}
```

---

## 24. Backend Delivery Requirements

1. Enforce tenant isolation in every repository query.
2. Apply role and permission checks server-side.
3. Use database transactions for assignment expansion, publication, stock changes, payment allocation, refunds, and certificate numbering.
4. Use optimistic locking for invoices, payroll, library availability, and inventory quantity.
5. Apply academic-year scoping to exams, timetable, fees, and LMS.
6. Use idempotency keys for payments, refunds, attendance-device events, and transport location batches.
7. Store secrets for gateways, AI, SMS, and WhatsApp in a secrets manager.
8. Return FK IDs and resolved relationship objects/display labels in read
   responses. Create/update requests must contain IDs only; reject client-sent
   `className` and `studentName` relationship fields.
9. Record audit logs for approval, publication, refund, certificate override/revocation, MFA, and backup actions.
10. Use signed URLs for files and PDFs.
11. Treat display names sent by the frontend as non-authoritative; load class,
    student, subject, teacher, staff, exam, and book data from FK records.
12. Add indexes for dependent selector and workflow queries:
    `(tenant_id, status)`, student enrollment `(tenant_id, class_id,
    section_id, status)`, teacher assignment `(tenant_id, teacher_id,
    class_id, subject_id)`, exam `(tenant_id, class_id, status)`, and library
    book `(tenant_id, status, available)`.
13. Return `409` when optimistic version, timetable conflicts, duplicate
    homework assignments, or unavailable library stock prevents a write.

---

## 25. New Frontend Route to API Map

| New UI | API |
|--------|-----|
| Student profile | `/admin/students/{id}` |
| Student class assignment | `/admin/classes`, `/admin/students/{id}/class` |
| Transfer certificate | `/admin/students/{id}/transfer-certificate` |
| Homework | `/admin/classes`, `/admin/students`, `/admin/subjects`, `/admin/homework`, `/admin/homework-submissions` |
| Exams and marks | `/admin/classes`, `/admin/subjects`, `/admin/exams`, `/admin/students`, `/admin/exam-marks` |
| Timetable | `/admin/classes`, `/admin/subjects`, `/admin/teachers`, `/admin/timetable` |
| Leave requests | `/admin/classes`, `/admin/students`, `/parent/children`, role-scoped leave endpoints |
| LMS | `/admin/classes`, `/admin/lms` |
| Live Bus Tracking | `/admin/transport/live`, `/parent/transport/live`, WS `/ws/tracking` |
| Library | `/admin/classes`, `/admin/students?classId=`, `/admin/library/books`, `/admin/library/issues` |
| Inventory | `/admin/inventory` |
| HR | `/admin/hr/staff` |
| Payroll | `/admin/payroll` |
| Expenses | `/admin/expenses` |
| Accounting | `/admin/accounting/dashboard` |
| Certificates | `/admin/classes`, `/admin/students?classId=`, `/admin/certificates` |
| Subscription | `/admin/subscription/plans` |
| Login history/security | `/admin/security/*` |
| Performance notes | `/teacher/classes`, `/teacher/students?classId=`, `/admin/performance-notes` |
| Advanced attendance | `/admin/classes`, `/admin/students?classId=`, `/admin/attendance/*` |
| Advanced fees | `/admin/classes`, `/admin/students?classId=`, `/admin/fees/*` |
| AI assistant | role-scoped class/student selectors, `/admin/ai/*` |
| Creative Cards recipient selectors | role-scoped class and student list endpoints |
| Communication center | `/admin/communication/*` |
| Reports hub | `/admin/reports/*` |
| Roles | `/admin/roles` |
