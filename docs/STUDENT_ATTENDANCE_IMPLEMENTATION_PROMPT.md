# Student Attendance System — Full Implementation Prompt

## Ready-to-paste Cursor / AI Coding Prompt

You are a senior full-stack engineer working on the **Kids Activities / SchoolBridge** project.

Your task is to implement a complete **Student Attendance System** with real backend APIs, database persistence, role-based access, frontend/mobile UI, validation, audit logs, reports, exports, and parent visibility.

Do **not** create dummy data.  
Do **not** create static/mock attendance lists.  
Use existing authentication, tenant/workspace context, role permissions, students, classes, parent-child mapping, and real database records.

---

## 1. Goal

Build a full attendance module for:

- School Admin
- Teacher
- Parent
- Portal User / Staff, if permissions allow

The system must allow teachers/admins to mark attendance by class and date, allow admins to review/export reports, and allow parents to view only their own child’s attendance history.

---

## 2. Core Functional Requirements

### Teacher

Teachers can:

1. Open Attendance from mobile app and/or web portal.
2. Select assigned class.
3. Select date.
4. View students from real class/student API.
5. Mark each student:
   - Present
   - Absent
   - Late
   - Half Day
   - Excused
6. Add optional note/reason per student.
7. Save Draft.
8. Submit/Finalize.
9. View previous attendance for assigned classes.
10. Edit only if session is draft/reopened or school policy allows.

Teachers must only access assigned classes/students.

### School Admin

Admins can:

1. View all classes and teachers.
2. View attendance by class/date/range.
3. Create, update, finalize, reopen attendance sessions.
4. Override records where permitted.
5. View summary counts and percentages.
6. Export attendance reports.
7. View audit logs.
8. Configure attendance behavior if settings module exists.

### Parent

Parents can:

1. View only their own child/children attendance.
2. See daily status, calendar/history, and monthly summary.
3. See notes if school setting allows.
4. Receive absence/late notifications if enabled.

Parents must never access another student’s attendance.

---

## 3. Attendance Statuses

Default statuses:

| Code | Label | Meaning |
|---|---|---|
| PRESENT | Present | Student attended normally |
| ABSENT | Absent | Student did not attend |
| LATE | Late | Student came late |
| HALF_DAY | Half Day | Student attended partial day |
| EXCUSED | Excused | Absence/late is excused |

Rules:

- Validate statuses server-side.
- Finalized attendance is locked unless admin reopens.
- Notes may be required for Absent/Late depending on settings.

---

## 4. Permissions

Add/use these permissions:

```text
attendance.view
attendance.create
attendance.update
attendance.finalize
attendance.reopen
attendance.export
attendance.audit.view
attendance.config.manage
```

Role rules:

- Teacher: assigned classes only.
- Parent: own children only, read-only.
- Admin: workspace/school scope.
- Portal user/staff: explicit permission only.

---

## 5. Database Design

Create migrations as needed.

### attendance_sessions

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
workspace_id UUID NOT NULL
class_id UUID NOT NULL
section_id UUID NULL
date DATE NOT NULL
status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
marked_by UUID NULL
finalized_by UUID NULL
finalized_at TIMESTAMP NULL
reopened_by UUID NULL
reopened_at TIMESTAMP NULL
reopen_reason TEXT NULL
notes TEXT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
deleted_at TIMESTAMP NULL
```

Unique:

```sql
UNIQUE (tenant_id, workspace_id, class_id, section_id, date)
```

Statuses:

```text
DRAFT
SUBMITTED
FINALIZED
REOPENED
```

### attendance_records

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
workspace_id UUID NOT NULL
attendance_session_id UUID NOT NULL
student_id UUID NOT NULL
class_id UUID NOT NULL
section_id UUID NULL
date DATE NOT NULL
status VARCHAR(30) NOT NULL
note TEXT NULL
marked_by UUID NULL
marked_at TIMESTAMP NULL
updated_by UUID NULL
created_at TIMESTAMP
updated_at TIMESTAMP
deleted_at TIMESTAMP NULL
```

Unique:

```sql
UNIQUE (attendance_session_id, student_id)
```

### attendance_audit_logs

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
workspace_id UUID NOT NULL
attendance_session_id UUID NOT NULL
attendance_record_id UUID NULL
student_id UUID NULL
action VARCHAR(50) NOT NULL
old_value JSON NULL
new_value JSON NULL
changed_by UUID NOT NULL
changed_at TIMESTAMP NOT NULL
ip_address VARCHAR(80) NULL
user_agent TEXT NULL
reason TEXT NULL
created_at TIMESTAMP
```

Actions:

```text
SESSION_CREATED
RECORD_CREATED
RECORD_UPDATED
BULK_UPDATED
SESSION_SUBMITTED
SESSION_FINALIZED
SESSION_REOPENED
SESSION_DELETED
```

### attendance_settings optional

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
workspace_id UUID NOT NULL
default_status VARCHAR(30) NULL
teacher_can_edit_finalized BOOLEAN DEFAULT false
require_absent_reason BOOLEAN DEFAULT false
require_late_reason BOOLEAN DEFAULT false
notify_parent_on_absent BOOLEAN DEFAULT true
notify_parent_on_late BOOLEAN DEFAULT false
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

## 6. Backend API Contract

Base path:

```text
/api/v1/attendance
```

Every endpoint must validate:

- authenticated user
- tenant/workspace access
- role permissions
- class/student ownership
- teacher assignment
- parent-child relationship where applicable

### 6.1 Get Attendance Statuses

```http
GET /api/v1/attendance/statuses
```

Response:

```json
{
  "success": true,
  "data": [
    { "code": "PRESENT", "label": "Present", "color": "green" },
    { "code": "ABSENT", "label": "Absent", "color": "red" },
    { "code": "LATE", "label": "Late", "color": "amber" },
    { "code": "HALF_DAY", "label": "Half Day", "color": "blue" },
    { "code": "EXCUSED", "label": "Excused", "color": "purple" }
  ]
}
```

### 6.2 Get Classes for Attendance

```http
GET /api/v1/attendance/classes?date=2026-07-23
```

Teacher returns assigned classes only. Admin returns all workspace classes.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "cls_123",
      "name": "Grade I",
      "sectionId": "sec_a",
      "sectionName": "A",
      "studentCount": 32,
      "assignedTeacherId": "user_456",
      "attendanceStatus": "DRAFT",
      "attendanceSessionId": "att_sess_123"
    }
  ]
}
```

### 6.3 Get Attendance Session

```http
GET /api/v1/attendance/session?classId=cls_123&sectionId=sec_a&date=2026-07-23
```

If session exists, return session and records.  
If session does not exist, return real students with blank/default status but do not persist until save.

Response:

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "att_sess_123",
      "classId": "cls_123",
      "sectionId": "sec_a",
      "date": "2026-07-23",
      "status": "DRAFT",
      "markedBy": "user_456",
      "finalizedAt": null,
      "canEdit": true
    },
    "summary": {
      "total": 32,
      "present": 25,
      "absent": 3,
      "late": 2,
      "halfDay": 1,
      "excused": 1,
      "percentage": 78.13
    },
    "students": [
      {
        "studentId": "stu_001",
        "studentName": "Aarav Sharma",
        "rollNumber": "01",
        "photoUrl": null,
        "status": "PRESENT",
        "note": "",
        "recordId": "att_rec_001",
        "lastUpdatedAt": "2026-07-23T09:30:00Z"
      }
    ]
  }
}
```

### 6.4 Save Draft / Bulk Update Attendance

```http
PUT /api/v1/attendance/session
```

Payload:

```json
{
  "classId": "cls_123",
  "sectionId": "sec_a",
  "date": "2026-07-23",
  "mode": "DRAFT",
  "records": [
    {
      "studentId": "stu_001",
      "status": "PRESENT",
      "note": ""
    },
    {
      "studentId": "stu_002",
      "status": "ABSENT",
      "note": "Sick leave"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "message": "Attendance saved successfully.",
  "data": {
    "sessionId": "att_sess_123",
    "status": "DRAFT",
    "summary": {
      "total": 32,
      "present": 25,
      "absent": 3,
      "late": 2,
      "halfDay": 1,
      "excused": 1,
      "percentage": 78.13
    }
  }
}
```

Rules:

- Validate student belongs to class/section.
- Reject duplicate student IDs.
- Reject invalid statuses.
- Create audit logs.
- Notify parent if status changed to Absent/Late and notification setting is enabled.

### 6.5 Finalize Attendance

```http
POST /api/v1/attendance/session/{sessionId}/finalize
```

Payload:

```json
{
  "confirm": true,
  "note": "Attendance completed for today."
}
```

Response:

```json
{
  "success": true,
  "message": "Attendance finalized successfully.",
  "data": {
    "sessionId": "att_sess_123",
    "status": "FINALIZED",
    "finalizedAt": "2026-07-23T10:00:00Z"
  }
}
```

Rules:

- Teacher/admin with permission only.
- Lock finalized records.
- Create audit log.

### 6.6 Reopen Attendance

```http
POST /api/v1/attendance/session/{sessionId}/reopen
```

Payload:

```json
{
  "reason": "Correction requested by admin."
}
```

Response:

```json
{
  "success": true,
  "message": "Attendance reopened successfully.",
  "data": {
    "sessionId": "att_sess_123",
    "status": "REOPENED",
    "reopenedAt": "2026-07-23T11:00:00Z"
  }
}
```

Rules:

- Admin/permission required.
- Reason required.
- Create audit log.

### 6.7 Student Attendance History

```http
GET /api/v1/attendance/students/{studentId}/history?from=2026-07-01&to=2026-07-31
```

Parent can call only for own child.  
Teacher only for assigned student/class.  
Admin for workspace.

Response:

```json
{
  "success": true,
  "data": {
    "student": {
      "id": "stu_001",
      "name": "Aarav Sharma",
      "className": "Grade I",
      "sectionName": "A"
    },
    "summary": {
      "totalDays": 22,
      "present": 18,
      "absent": 2,
      "late": 1,
      "halfDay": 1,
      "excused": 0,
      "percentage": 81.82
    },
    "records": [
      {
        "date": "2026-07-23",
        "status": "PRESENT",
        "note": "",
        "markedAt": "2026-07-23T09:30:00Z"
      }
    ]
  }
}
```

### 6.8 Attendance Report

```http
GET /api/v1/attendance/reports/summary?classId=cls_123&sectionId=sec_a&from=2026-07-01&to=2026-07-31&status=ABSENT
```

Response:

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalStudents": 32,
      "totalAttendanceDays": 704,
      "present": 600,
      "absent": 50,
      "late": 20,
      "halfDay": 14,
      "excused": 20,
      "averageAttendancePercentage": 85.23
    },
    "students": [
      {
        "studentId": "stu_001",
        "studentName": "Aarav Sharma",
        "rollNumber": "01",
        "present": 18,
        "absent": 2,
        "late": 1,
        "percentage": 81.82
      }
    ]
  }
}
```

### 6.9 Export Report

```http
GET /api/v1/attendance/reports/export?format=csv&classId=cls_123&from=2026-07-01&to=2026-07-31
```

Support:

```text
csv
xlsx
pdf optional
```

Admin permission required. Teacher export only if enabled.

### 6.10 Audit Logs

```http
GET /api/v1/attendance/session/{sessionId}/audit-logs
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "log_001",
      "action": "RECORD_UPDATED",
      "studentId": "stu_001",
      "studentName": "Aarav Sharma",
      "oldValue": { "status": "ABSENT" },
      "newValue": { "status": "PRESENT" },
      "changedBy": "Admin User",
      "changedAt": "2026-07-23T11:10:00Z",
      "reason": "Correction"
    }
  ]
}
```

---

## 7. Frontend / Mobile UI Requirements

Implement with real API integration in web and mobile app where applicable.

### Teacher Attendance Screen

Required UI:

- Attendance header
- Date picker
- Class selector
- Status summary cards
- Student list
- Quick Mark All Present
- Status chips per student
- Note/reason field
- Save Draft
- Finalize
- Loading, empty, error states

Student row:

- avatar/photo
- student name
- roll number
- status selector
- note indicator
- last updated if available

### Admin Attendance Dashboard

Required UI:

- date range filter
- class filter
- teacher filter
- status filter
- summary cards
- attendance table
- export button
- finalize/reopen actions
- audit log modal

### Parent Attendance Screen

Required UI:

- child selector
- attendance summary
- calendar/history
- monthly percentage
- status legend
- notes if allowed

Parent must see own children only.

---

## 8. Notification Integration

If project notification system exists, integrate it.

Trigger notification when:

- Student marked Absent
- Student marked Late, if enabled
- Attendance finalized, if needed
- Admin reopens attendance, if needed

Payload:

```json
{
  "type": "ATTENDANCE_STATUS_CHANGED",
  "title": "Attendance updated",
  "body": "Aarav Sharma was marked Absent today.",
  "entityType": "attendance",
  "entityId": "att_rec_001",
  "mobileTab": "More",
  "mobileScreen": "AttendanceHistory",
  "webRoute": "/attendance/students/stu_001"
}
```

---

## 9. Validation Rules

Backend must validate:

1. date is valid
2. class exists in tenant/workspace
3. section belongs to class
4. student belongs to class/section
5. teacher is assigned to class
6. parent owns child
7. status is valid
8. finalized sessions cannot be edited without permission
9. notes required for Absent/Late if settings require
10. no duplicate session for class/date
11. no duplicate record for student/session

---

## 10. Security Requirements

1. Every query must be tenant/workspace scoped.
2. No cross-school attendance leak.
3. Parent can access only own children.
4. Teacher can access only assigned classes.
5. Admin can access only own workspace.
6. Role permissions checked server-side.
7. Do not trust frontend role flags.
8. Audit every change.
9. Export requires permission.
10. Do not expose unnecessary student private data.

---

## 11. Empty / Error States

Use these messages:

```text
Select a class and date to start marking attendance.
No students found in this class.
Attendance has been finalized for this date. Contact admin to reopen it.
No attendance records found for this period.
Unable to load attendance. Please check your connection and try again.
```

---

## 12. Suggested File Structure

Backend:

```text
attendance/
  attendance.routes.js
  attendance.controller.js
  attendance.service.js
  attendance.repository.js
  attendance.validation.js
  attendance.permissions.js
  attendance.notifications.js
  attendance.exports.js
  attendance.audit.js
```

Frontend Web:

```text
src/pages/attendance/
  AttendanceDashboard.jsx
  AttendanceSessionPage.jsx
  StudentAttendanceHistory.jsx

src/components/attendance/
  AttendanceStatusChip.jsx
  AttendanceSummaryCards.jsx
  AttendanceStudentRow.jsx
  AttendanceFilters.jsx
  AttendanceAuditLogModal.jsx
```

Mobile:

```text
src/screens/attendance/
  TeacherAttendanceScreen.tsx
  ParentAttendanceScreen.tsx
  AdminAttendanceScreen.tsx
  AttendanceHistoryScreen.tsx

src/components/attendance/
  AttendanceStatusChip.tsx
  AttendanceSummaryCard.tsx
  AttendanceStudentRow.tsx
  AttendanceDatePicker.tsx

src/services/attendanceApi.ts
src/hooks/useAttendance.ts
```

Docs:

```text
docs/STUDENT_ATTENDANCE_BACKEND_CONTRACT.md
```

---

## 13. Testing Checklist

Teacher:

- sees assigned classes only
- marks attendance
- saves draft
- finalizes
- cannot edit finalized unless reopened
- cannot access unassigned class

Admin:

- sees all classes
- views daily attendance
- reopens finalized session
- edits record
- exports report
- views audit logs

Parent:

- sees own child attendance
- cannot access another student
- receives absence notification if enabled
- date filter works

Security:

- tenant/workspace isolation
- unauthorized API rejected
- invalid student/class rejected
- finalized lock enforced
- audit logs created

UI:

- loading states
- empty states
- error states
- responsive mobile/web layout
- no dummy data

---

## 14. Completion Criteria

Complete only when:

1. Real APIs are implemented.
2. Real DB persistence exists.
3. Teacher can mark attendance.
4. Admin can manage attendance.
5. Parent can view child attendance.
6. Reports work.
7. Export works.
8. Notifications are integrated if available.
9. Audit logs are created.
10. Role permissions are enforced.
11. Tenant/workspace security is enforced.
12. No dummy data remains.
13. Mobile and web UI use real API responses.
14. API payload/response matches this contract.
15. Backend documentation markdown file is created/updated.
16. Tests/manual QA are completed.

---

## 15. Final Developer Response Format

After implementation, respond only:

```text
Student Attendance System completed.

- Backend attendance APIs added
- Database tables/migrations added
- Teacher attendance marking completed
- Admin dashboard/reporting completed
- Parent attendance history completed
- Role permissions enforced
- Tenant/workspace security added
- Attendance audit logs added
- Export/report API added
- Notification integration added
- Web UI connected to real APIs
- Mobile UI connected to real APIs
- Backend contract documentation added
- Testing completed
```
