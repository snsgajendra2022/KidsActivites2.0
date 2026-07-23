# Student Attendance — Backend Contract (summary)

Full prompt: [`STUDENT_ATTENDANCE_IMPLEMENTATION_PROMPT.md`](./STUDENT_ATTENDANCE_IMPLEMENTATION_PROMPT.md).  
Also indexed in [`backend.md`](../backend.md#18-student-attendance).

Base path: `/api/v1/attendance`

## Rules

- Authenticated + tenant/workspace scoped
- Teacher: assigned classes/students only
- Parent: own children only (read-only history)
- Admin: workspace scope; reopen requires reason
- No mock data — persist sessions/records/audit logs

## Statuses

Student: `PRESENT` · `ABSENT` · `LATE` · `HALF_DAY` · `EXCUSED`  
Session: `DRAFT` · `SUBMITTED` · `FINALIZED` · `REOPENED`

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/attendance/statuses` | Status catalog |
| `GET` | `/attendance/classes?date=` | Classes for date (role-filtered) |
| `GET` | `/attendance/session?classId=&sectionId=&date=` | Session + students (defaults if unsaved) |
| `PUT` | `/attendance/session` | Save draft/submit bulk records |
| `POST` | `/attendance/session/{id}/finalize` | Lock session |
| `POST` | `/attendance/session/{id}/reopen` | Admin reopen |
| `GET` | `/attendance/students/{id}/history?from=&to=` | Student history |
| `GET` | `/attendance/reports/summary?...` | Admin report |
| `GET` | `/attendance/reports/export?format=csv&...` | Export blob |
| `GET` | `/attendance/session/{id}/audit-logs` | Audit trail |

## Clients

- Web: `src/services/attendanceService.js`, routes under `/teacher|admin|parent/attendance`
- Mobile: `src/api/attendanceApi.ts`, stack screens `TeacherAttendance` / `AdminAttendance` / `ParentAttendance` / `AttendanceHistory`
