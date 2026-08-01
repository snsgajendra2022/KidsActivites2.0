TODAY'S WORK STATUS
Thursday, 30 July 2026

Project: Kids Activities Mobile

Overview
--------

Expanded the mobile application with API-connected School ERP modules for
parents, teachers, and administrators. Added academic, student, operations, and
transport screens; connected them to role-aware navigation; added reusable ERP
UI and data types; and introduced a real-device driver GPS publishing foundation.


 ERP API and shared type foundation

- Added dedicated API services for student profiles, homework, exams, timetable,
  leave, LMS, performance notes, transport, library, and school operations.
- Added shared mobile ERP types for academic records, students, transport,
  library, certificates, inventory, expenses, accounting, and login history.
- Added consistent API list normalization for array,items`,content`, and
  wrappeddata` responses.
- Kept requests connected to the existing Spring Boot API base URL instead of
  introducing a separate backend or database.


Student and academic modules

- Added a student directory and detailed student profile screen.
- Student profiles now display overview, guardian, emergency contact, medical,
  document, transfer certificate, and history information returned by the API.
- Added role-aware homework list and detail screens.
- Added homework creation for teachers/admins, parent submission, teacher grading,
  assignment status, search, refresh, and API error handling.
- Added exam list, exam detail, published results, and marks-entry screens.
- Added weekly timetable, LMS content/detail, and performance-note screens.
- Parent academic requests are scoped through the currently selected child.


Leave, library, certificates, and operations

- Added leave request lists, parent leave creation, and admin approval access.
- Added library catalog/issue views and certificate records.
- Added admin student list access with navigation to full student profiles.
- Added inventory, expenses, accounting dashboard, and login history screens.
- Added shared status, date, and currency formatting for ERP records.

  Live transport and driver GPS foundation
- Added the parent live transport screen using the existing
 /parent/transport/live` Spring Boot endpoint.
- Added vehicle, route, trip-start, and driver location API integrations.
- Added automatic parent transport refresh every 30 seconds.
- Added vehicle, route, driver, ETA, stop, coordinate, status, and last-update
  presentation with loading, retry, and unavailable-data states.
- Added a driver location publisher using realexpo-location` coordinates.
- Added foreground and background location permission checks.
- Added invalid-coordinate and null-island protection.
- Added configurable GPS publishing intervals with speed, heading, accuracy, and
  recorded timestamps.
- Added trip-specific and general driver tracking endpoint support.
- Addedexpo-location` and updated package lock dependencies.


Role-based navigation and dashboards

- Registered all new ERP screens in the typed application stack.
- Extended navigation parameter types and the shared stack navigation hook.
- Added parent quick actions for homework, timetable, exams, transport, and leave.
- Added teacher quick actions for homework, exams, performance notes, timetable,
  students, and attendance.
- Added admin quick actions for students, leave approvals, and accounting.
- Reorganized the More menu into role-specific school, classroom, family, and
  account sections.
- Applied role visibility for parent, teacher, accountant, admission officer,
  school admin, principal, and super-admin access paths.
- Added safe optional selected-child access for screens shared across role stacks.


6. Reusable ERP mobile interface
--------------------------------

- Added a reusable module list screen with:
  - Loading state
  - Empty state
  - Error and retry state
  - Pull-to-refresh
  - Search filtering
  - Primary module actions
- Added reusable ERP status badges and date/money formatting helpers.
- Reused the existing mobile design system, glass cards, list cards, headers,
  buttons, modals, and feedback utilities across the new screens.


7. Notification routing
-----------------------

- Added deep-link routing for homework notifications.
- Added role-aware routing for leave requested, approved, and rejected events.
- Added routing for published exams and exam marks.
- Added transport ETA notification routing to live transport.
- Updated notification types for the new ERP event categories.
- Preserved safe fallback behavior for unsupported notification destinations.


8. Verification completed
-------------------------

- TypeScript validation passed:npm run typecheck`.
- The new ERP screens, APIs, navigation routes, and shared types compile without
  TypeScript errors.
- Existing enrollment screens were not changed as part of this ERP work.
- No separate mobile database or tracking backend was introduced.
- Native builds, deployed-backend smoke tests, notification deep links, and
  physical-device GPS tests were not completed for this change set.


Remaining final checks
----------------------

- Replace manual homework Class and Subject fields with role-scoped class and
  roster selectors that saveclassId` /studentId` relationships.
- Add explicit class/student selection to performance-note and other creation
  flows that currently omit relationship IDs.
- Verify selected-child scoping. Homework and leave use it partially, but exams,
  timetable, LMS, notes, library, certificates, and transport do not currently
  pass the selected student ID.
- Confirm the canonical student ID is used instead of an enrollment application
  ID in every parent request.
- Verify role-specific backend contracts. Several teacher/parent operations call
  or fall back to/admin/*` endpoints, including homework, exams, LMS, notes,
  certificates, and student profiles.
- Resolve role/endpoint mismatches, including admin transport navigation using
  the parent live endpoint and parent certificates using the admin endpoint.
- WireDriverLocationPublisher` into an actual driver trip start/stop screen.
- Register the Expo background-location task and required native background
  modes/permissions. Current app config only enables background remote
  notifications.
- Implement and verify the native live map.mapbox-gl` is installed but unused;
  the current transport screen only displays coordinates and polls.
- Test all new screens against the deployed Spring Boot endpoints with parent,
  teacher, accountant, admission-officer, and admin accounts.
- Test notification deep links, GPS publishing, background tracking, and
  permission behavior on physical Android and iOS devices.
- Run native debug/release builds and perform end-to-end regression testing.
