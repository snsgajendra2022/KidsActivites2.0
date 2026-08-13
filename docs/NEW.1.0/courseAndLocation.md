# Course and Location — Remaining Backend Requirements

Date: 13 August 2026
Scope: Kids Activities **Web** (`KidsActivities2.0`) + **Mobile (Expo)** clients
API base: `{API_BASE_URL}/api/v1`
Auth: `Authorization: Bearer {accessToken}`, `X-Tenant-Slug: {tenantSlug}`

## Purpose

Both frontends are already wired for the LMS course/quiz/certificate flow and for
transport map location, live GPS and stop rosters. This document lists only what
the **backend still has to implement or correct** so the clients can drop their
defensive fallbacks.

Every endpoint below is called by real client code today. Nothing here is
speculative: paths were taken from `src/services/lmsService.js`,
`src/services/transportTracking/trackingApi.js`, mobile `src/api/lmsApi.ts` and
mobile `src/api/transportApi.ts`.

Related documents:

- [`FULL_BACKEND_API_CONTRACT.md`](./FULL_BACKEND_API_CONTRACT.md) — sections 7 (LMS) and 8 (Transport)
- [`transport/MASTER_LIVE_TRACKING_API.md`](./transport/MASTER_LIVE_TRACKING_API.md) — canonical live-tracking endpoint list
- [`transport/DRIVER_ASSIGNMENT_LIVE_API.md`](./transport/DRIVER_ASSIGNMENT_LIVE_API.md) — driver/route relationships
- [`transport/LIVE_BUS_TRACKING.md`](./transport/LIVE_BUS_TRACKING.md) — Spring Boot package guidance

## Status legend

| Status | Meaning |
|--------|---------|
| `IMPLEMENTED` | Backend already behaves as the clients need |
| `PARTIAL` | Endpoint exists but the response or the rule is wrong/incomplete |
| `NEEDED` | Clients call it; backend must implement (or currently returns 404) |

---

## Priority / blocking

These break the product for real users today, in order.

| # | Area | What breaks | Requirement |
|---|------|-------------|-------------|
| P1 | Course | A learner who **fails** the quiz still gets a certificate, because `POST /lms/enrollments/{id}/complete` issues `CERT-YYYY-####` regardless of quiz outcome | [C1](#c1-certificate-only-on-pass) |
| P2 | Location | Admin live fleet shows `stopped · 0 km/h` while a driver is actively publishing GPS, because `tracking_status` is derived from speed | [L1](#l1-any-accepted-ping-means-running) |
| P3 | Location | Driver stop sheet shows "No students assigned" for stops created from a student's home address | [L5](#l5-student-home-derived-stops-must-resolve-their-student) |
| P4 | Course | Certificate cards/preview show blank learner name, blank course title and a UUID instead of a certificate number | [C2](#c2-certificate-list--detail-must-carry-display-fields) |
| P5 | Location | Driver pings are silently dropped when the device clock/cached fix is a couple of minutes old, so the bus never appears live | [L2](#l2-do-not-reject-pings-for-stale-client-timestamps) |
| P6 | Location | Stop roster returns nothing unless a trip-scoped endpoint exists; clients fan out across up to five paths per stop tap | [L4](#l4-stop-roster-endpoint--assignment-fallback) |
| P7 | Course | Quiz review/retry is guessed client-side because the submit response has no per-question result, no attempt number and often no `passed` | [C4](#c4-quiz-submit-response-must-be-self-describing) |
| P8 | Both | Parent scoping is enforced only in the UI: certificates, my-learning, trip status and approvals must be role-scoped server-side | [C3](#c3-parent-scoping-for-my-learning-and-certificates), [L6](#l6-parent-scoping-for-transport) |

---

# 1. Course / LMS

## 1.0 Endpoints the clients call today

| Method | Path | Used by | Status |
|--------|------|---------|--------|
| GET | `/lms/courses`, `/lms/courses/{courseId}` | Course list, player, progress page | `IMPLEMENTED` |
| POST/PATCH/DELETE | `/lms/courses`, `/lms/courses/{id}`, `.../publish`, `.../archive` | `LmsCourseEditorPage` | `IMPLEMENTED` |
| POST/PATCH/DELETE | `/lms/courses/{id}/lessons`, `/lms/lessons/{id}`, `/lms/lessons/{id}/upload` | Course editor | `IMPLEMENTED` |
| POST/DELETE | `/lms/courses/{id}/quizzes`, `/lms/quizzes/{id}` | Course editor | `IMPLEMENTED` |
| POST | `/lms/lessons/{lessonId}/playback-token` | Video player | `IMPLEMENTED` |
| GET | `/lms/lessons/{lessonId}/stream`, `/lms/lessons/{lessonId}/hls/{file}` | Video player | `IMPLEMENTED` |
| GET/POST/DELETE | `/lms/enrollments`, `/lms/enrollments/enroll-class`, `/lms/enrollments/{id}` | `LmsEnrollmentsPage` | `IMPLEMENTED` |
| GET | `/lms/my-learning`, `/lms/my-learning/{enrollmentId}` | `MyLearningPage`, `CoursePlayerPage`, mobile LMS | `PARTIAL` (see [C3](#c3-parent-scoping-for-my-learning-and-certificates)) |
| GET | `/parent/lms/my-learning`, `/parent/lms/enrollments`, `/parent/lms/my-learning/{id}` | Parent fallback chain | `NEEDED` |
| POST | `/lms/lessons/{lessonId}/progress` | Course player | `IMPLEMENTED` |
| POST | `/lms/quizzes/{quizId}/attempts` | Start attempt | `IMPLEMENTED` |
| POST | `/lms/quizzes/{quizId}/attempts/{attemptId}/submit` | Submit answers | `PARTIAL` (see [C4](#c4-quiz-submit-response-must-be-self-describing)) |
| GET | `/lms/quizzes/{quizId}/attempts?enrollmentId=` | `LmsEnrollmentProgressPage` | `NEEDED` (soft-404 today) |
| GET | `/lms/quizzes/{quizId}/attempts/{attemptId}` | Attempt detail | `NEEDED` (soft-404 today) |
| POST | `/lms/enrollments/{enrollmentId}/complete` | Finish course | `PARTIAL` (see [C1](#c1-certificate-only-on-pass)) |
| GET | `/lms/certificates`, `/lms/certificates/{id}` | `LmsCertificatesPage` | `PARTIAL` (see [C2](#c2-certificate-list--detail-must-carry-display-fields)) |
| GET | `/parent/lms/certificates`, `/teacher/lms/certificates`, `/parent/lms/certificates/{id}` | Role fallback chain | `NEEDED` |
| GET | `/lms/certificates/{id}/html`, `/parent/lms/certificates/{id}/html` | Backend-rendered fallback preview | `PARTIAL` |

`GET /public/lms/certificates/verify/{certificateNumber}` is documented in the
full contract but **no client calls it**. Leave it out of scope unless a public
verification page is built.

---

## C1. Certificate only on pass

**Status: `PARTIAL` — the blocking bug.**

### What the client does today

`CoursePlayerPage.jsx` and mobile `LmsScreens.tsx` both gate the Finish button
with `canCompleteCourse(detail)` (`src/utils/lmsEnrollmentOutcome.js`), which
requires every lesson `completed` **and** every quiz with
`requiredForCompletion !== false` actually passed. Exhausted attempts are
explicitly not treated as a pass.

Because the backend still issues a certificate on fail, the clients also run a
second, purely defensive filter: `keepEarnedCertificates()` /
`isFailedEnrollment()` drop certificates whose enrollment shows
`passed === false`. That filtering is a workaround and should be removable.

### Expected backend behavior

```text
POST /lms/enrollments/{enrollmentId}/complete
```

1. Recompute eligibility server-side. Do not trust the client.
2. Eligible only when: all lessons with `requiredForCompletion !== false` have
   progress `completed`, **and** every required quiz has at least one attempt
   with `passed = true`.
3. "Attempts exhausted" is a **failure**, never a pass. See [C5](#c5-completioncancomplete-semantics).
4. When eligible: set enrollment `status = completed`, `completedAt`, issue
   exactly one certificate, and return it inline.
5. When not eligible: return `409` with a machine-readable reason. Do **not**
   create a certificate row, and do **not** set `status = completed`.
6. Completing twice must be idempotent: return the existing certificate, never
   a second `certificateNumber`.

Success response:

```json
{
  "success": true,
  "data": {
    "enrollmentId": "5a1c…",
    "status": "completed",
    "completedAt": "2026-08-13T09:12:00Z",
    "passed": true,
    "certificateId": "9f2e…",
    "certificate": {
      "id": "9f2e…",
      "certificateNumber": "CERT-2026-0184",
      "learnerName": "Aarav Sharma",
      "courseTitle": "Introduction to Numbers",
      "issuedAt": "2026-08-13T09:12:00Z",
      "studentId": "1b7a…",
      "courseId": "44c9…",
      "enrollmentId": "5a1c…",
      "passed": true,
      "percentage": 82.5,
      "passingPercentage": 60
    }
  }
}
```

Rejection response:

```json
{
  "error": {
    "code": "LMS_QUIZ_NOT_PASSED",
    "message": "Pass the required quiz before a certificate can be issued.",
    "details": [
      {
        "quizId": "77aa…",
        "bestPercentage": 40,
        "passingPercentage": 60,
        "attemptsUsed": 3,
        "maxAttempts": 3
      }
    ]
  }
}
```

### Error cases

| Condition | HTTP | Code |
|-----------|------|------|
| Required quiz not passed (including attempts exhausted) | 409 | `LMS_QUIZ_NOT_PASSED` |
| Required lessons incomplete | 409 | `LMS_LESSONS_INCOMPLETE` |
| Enrollment already completed | 200 | idempotent, return existing certificate |
| Enrollment belongs to another learner/tenant | 404 | `NOT_FOUND` |
| Caller is not the learner or a linked parent | 403 | `FORBIDDEN` |

---

## C2. Certificate list / detail must carry display fields

**Status: `PARTIAL`.**

### What the client does today

`src/utils/courseCertificateFields.js` (and mobile `src/utils/lmsCertificate.ts`)
exist purely to survive thin payloads. They:

- try roughly 15 aliases per field (`learnerName`, `student_name`,
  `student.fullName`, `enrollment.student.firstName`, …);
- reject a `certificateNumber` that is a UUID, equals the record `id`, or is a
  32-char hex string (`isDisplayableCertNumber`), so a UUID renders as **blank**
  rather than as a fake certificate number;
- treat `"Learner"`, `"Student"`, `"Course"`, `"Certificate of Completion"` as
  placeholders and blank them out;
- re-fetch `/lms/my-learning/{enrollmentId}` in `resolveCertificate()` just to
  recover the learner name and course title before printing.

### Expected backend behavior

```text
GET /lms/certificates?studentIds=&classIds=&courseId=&page=&pageSize=
GET /lms/certificates/{certificateId}
```

Both must return these fields, already resolved, in camelCase:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | yes | Record id |
| `certificateNumber` | string | yes | Human-readable, e.g. `CERT-2026-0184`. Must never equal `id` or be a bare UUID/hex |
| `learnerName` | string | yes | Resolved student full name; never `"Learner"`/`"Student"` |
| `courseTitle` | string | yes | Resolved course title; never `"Course"` |
| `issuedAt` | ISO-8601 | yes | Issue timestamp |
| `studentId` | uuid | yes | For parent scoping/filtering |
| `courseId` | uuid | yes | |
| `enrollmentId` | uuid | yes | Lets the client link back without a second lookup |
| `passed` | boolean | yes | Outcome that justified issuing |
| `percentage` | number | when a quiz exists | Best/final score |
| `passingPercentage` | number | when a quiz exists | Course/quiz pass mark, not a hardcoded 70 |

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "9f2e…",
        "certificateNumber": "CERT-2026-0184",
        "learnerName": "Aarav Sharma",
        "courseTitle": "Introduction to Numbers",
        "issuedAt": "2026-08-13T09:12:00Z",
        "studentId": "1b7a…",
        "courseId": "44c9…",
        "enrollmentId": "5a1c…",
        "passed": true,
        "percentage": 82.5,
        "passingPercentage": 60
      }
    ],
    "total": 1
  }
}
```

`GET /lms/certificates/{id}/html` must return `{ "renderedHtml": "<html>…</html>" }`
with the same names already interpolated — it is the print fallback when the
portal template is disabled, and the client cannot patch placeholders into HTML.

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| No certificates for the caller | 200 | Empty `items`, not 404 |
| Certificate of another tenant | 404 | `NOT_FOUND` |
| Parent requesting another family's certificate | 403 | `FORBIDDEN` |
| HTML rendering disabled | 404 | Client falls back to its own template |

---

## C3. Parent scoping for my-learning and certificates

**Status: `NEEDED`.**

### What the client does today

`lmsApi.myLearning()` and `lmsApi.listCertificates()` run a fallback chain
because no single role-scoped route is guaranteed:

1. `GET /lms/my-learning?studentIds=&classIds=`
2. `GET /parent/lms/my-learning`
3. `GET /parent/lms/enrollments`
4. per-child `GET /lms/enrollments?studentId={id}` and
   `GET /parent/lms/enrollments?studentId={id}`
5. per-class `GET /lms/enrollments?classId={id}`, then filter client-side to the
   parent's own `studentIds`

Certificates do the same across `/lms/certificates`,
`/parent/lms/certificates`, `/teacher/lms/certificates`. `studentIds` and
`classIds` are sent as comma-separated strings. `LmsCertificatesPage` then calls
`hydrateCertificatesWithChildren()` to paste the child's name back in.

This is slow (N+1 requests per child) and the client-side filter is not
authorization.

### Expected backend behavior

1. `GET /lms/my-learning` and `GET /lms/certificates` must be **role-scoped**:
   - learner: own enrollments/certificates
   - parent: all linked children, no extra parameters required
   - teacher: their classes
   - admin: tenant
2. Accept optional `studentIds` and `classIds` (comma-separated) as **filters
   within** the caller's permitted scope. Ignore or `403` ids outside scope;
   never widen scope from a query parameter.
3. Class-level enrollment created by `POST /lms/enrollments/enroll-class` must
   appear in the linked parent's `my-learning` result with `studentId` set.
4. Either implement the `/parent/lms/*` aliases with identical response shapes,
   or make the canonical routes correct for parents so the aliases can be
   removed from the clients.

```text
GET /lms/my-learning?studentIds=1b7a…,2c8b…&classIds=9de1…
GET /lms/certificates?studentIds=1b7a…
```

Each `my-learning` row must include `studentId`, `learnerName`, `courseId`,
`courseTitle`, `status`, `progressPct`, `certificateId` (when issued), and the
`quizzes[]` block described in [C5](#c5-completioncancomplete-semantics).

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| Parent has no children with enrollments | 200 | Empty list |
| `studentIds` contains an unlinked child | 403 | `FORBIDDEN` (or drop the id and return the rest) |
| Role has no LMS access | 403 | `FORBIDDEN` |

---

## C4. Quiz submit response must be self-describing

**Status: `PARTIAL`.**

### What the client does today

`normalizeQuizSubmitResult()` (`src/utils/lmsQuizScoring.js`, mobile
`src/utils/lmsQuiz.ts`) reconstructs the result from whatever comes back:

- reads points from `earnedPoints|score|marksObtained|pointsEarned` and
  `totalPoints|maxScore|totalMarks|pointsPossible`, else sums per-question rows;
- computes `percentage` itself when absent;
- falls back to a `60` pass mark when the quiz carries no `passPercentage`;
- **hides correct answers entirely** unless the *result* row supplies
  `correctOptionId`/`correctAnswerId`/`answerKeyOptionId` — the course editor's
  `option.correct` flag is staff-only and is deliberately not used for learner
  review;
- guesses `attemptsRemaining` as `maxAttempts - attemptNumber`.

The result: after a quiz, a child often sees a score with no answer review, and
the retry button state is a guess.

### Expected backend behavior

```text
POST /lms/quizzes/{quizId}/attempts/{attemptId}/submit
```

Request (unchanged):

```json
{
  "answers": [
    { "questionId": "q1", "selectedOptionId": "o3" },
    { "questionId": "q2", "selectedOptionId": "o1" }
  ]
}
```

Response must include:

```json
{
  "success": true,
  "data": {
    "attemptId": "att-88…",
    "quizId": "77aa…",
    "enrollmentId": "5a1c…",
    "attemptNumber": 2,
    "maxAttempts": 3,
    "attemptsRemaining": 1,
    "earnedPoints": 8,
    "totalPoints": 10,
    "percentage": 80,
    "passingPercentage": 60,
    "passed": true,
    "bestPercentage": 80,
    "submittedAt": "2026-08-13T09:05:00Z",
    "questionResults": [
      {
        "questionId": "q1",
        "prompt": "How many apples?",
        "selectedOptionId": "o3",
        "correctOptionId": "o2",
        "correct": false,
        "points": 1,
        "earnedPoints": 0
      },
      {
        "questionId": "q2",
        "prompt": "Which is larger?",
        "selectedOptionId": "o1",
        "correctOptionId": "o1",
        "correct": true,
        "points": 1,
        "earnedPoints": 1
      }
    ]
  }
}
```

Rules:

- `passed` is authoritative and computed server-side as
  `percentage >= passingPercentage`; clients trust it when present.
- `passingPercentage` must come from the quiz/course configuration. Never omit
  it — omission makes the clients assume 60.
- `correctOptionId` is what unlocks answer review. If a course is configured to
  hide answers, omit `correctOptionId` and `correct` deliberately; the clients
  already render "review unavailable" rather than guessing.
- `attemptsRemaining` must account for the attempt just submitted.
- `POST /lms/quizzes/{quizId}/attempts` (start) should return
  `{ attempt: { id, attemptNumber, startedAt }, maxAttempts, attemptsRemaining }`.

### Error cases

| Condition | HTTP | Code |
|-----------|------|------|
| Attempt already submitted | 409 | `LMS_ATTEMPT_ALREADY_SUBMITTED` |
| No attempts left | 409 | `LMS_QUIZ_ATTEMPTS_EXHAUSTED` |
| Attempt belongs to another learner | 403 | `FORBIDDEN` |
| Unknown `questionId` / `selectedOptionId` | 400 | `VALIDATION_ERROR` |

---

## C5. `completion.canComplete` semantics

**Status: `PARTIAL`.**

### What the client does today

`FULL_BACKEND_API_CONTRACT.md` §7 currently states: *"Completion requires all
lessons completed and every required quiz either passed **or attempts
exhausted**."* Both clients reject that rule. `canCompleteCourse()` is documented
in code as *"Never uses attemptsExhausted"* and *"Backend `canComplete` is not
trusted when the quiz failed."*

### Expected backend behavior

1. Amend the rule: **attempts exhausted is a fail**, not a completion path. A
   learner who used all attempts without reaching the pass mark stays
   `in_progress` (or moves to an explicit `failed` state) and gets no
   certificate.
2. If a `completion` block is returned on `my-learning` detail, its fields must
   mean exactly this:

| Field | Meaning |
|-------|---------|
| `lessonsComplete` | All required lessons `completed` |
| `requiredQuizzesPassed` | Every required quiz has an attempt with `passed = true` |
| `canComplete` | `lessonsComplete && requiredQuizzesPassed` — nothing else |
| `blockedReason` | `LESSONS_INCOMPLETE` \| `QUIZ_NOT_PASSED` \| `ATTEMPTS_EXHAUSTED` \| `null` |

3. Every `my-learning` row/detail must expose a `quizzes[]` array so the clients
   can render outcome without extra calls:

```json
{
  "quizzes": [
    {
      "id": "77aa…",
      "title": "Numbers check",
      "requiredForCompletion": true,
      "passPercentage": 60,
      "maxAttempts": 3,
      "attemptCount": 3,
      "attemptsRemaining": 0,
      "bestPercentage": 40,
      "passed": false,
      "latestAttempt": {
        "id": "att-88…",
        "attemptNumber": 3,
        "percentage": 40,
        "passed": false,
        "submittedAt": "2026-08-13T09:05:00Z"
      }
    }
  ]
}
```

`requiredForCompletion` defaults to `true` when absent (clients treat
`!== false` as required).

---

## C6. Quiz attempt history

**Status: `NEEDED` — currently 404/403, clients soft-degrade to an empty list.**

### What the client does today

`LmsEnrollmentProgressPage.jsx` calls
`lmsApi.listQuizAttempts(quizId, { enrollmentId })`. On 404/405/403 it returns
`{ items: [], total: 0 }` and the attempt history section renders empty, so
teachers and parents cannot see how a child progressed across attempts.

### Expected backend behavior

```text
GET /lms/quizzes/{quizId}/attempts?enrollmentId={uuid}&studentId={uuid}
GET /lms/quizzes/{quizId}/attempts/{attemptId}
```

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "att-86…",
        "attemptNumber": 1,
        "startedAt": "2026-08-12T10:00:00Z",
        "submittedAt": "2026-08-12T10:07:00Z",
        "earnedPoints": 5,
        "totalPoints": 10,
        "percentage": 50,
        "passingPercentage": 60,
        "passed": false
      }
    ],
    "total": 1
  }
}
```

`GET .../attempts/{attemptId}` returns the same object plus `questionResults[]`
in the [C4](#c4-quiz-submit-response-must-be-self-describing) shape.

Scope: learner sees own attempts; parent sees linked children; teacher sees their
classes; admin sees the tenant.

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| No attempts yet | 200 | Empty `items` |
| Quiz not in tenant | 404 | `NOT_FOUND` |
| Caller outside scope | 403 | `FORBIDDEN` (client shows empty section) |

---

# 2. Location / Transport

## 2.0 Endpoints the clients call today

| Method | Path | Used by | Status |
|--------|------|---------|--------|
| GET | `/parent/transport/live?studentId=` | Parent live (web + mobile) | `NEEDED` |
| GET | `/admin/transport/live` | Admin fleet (web `TransportLiveTrackingPage`, mobile) | `PARTIAL` (see [L1](#l1-any-accepted-ping-means-running)) |
| GET/POST/PATCH/DELETE | `/admin/transport/routes`, `/admin/transport/routes/{id}` | `TransportRoutesManagePage` | `PARTIAL` (see [L5](#l5-student-home-derived-stops-must-resolve-their-student)) |
| GET/POST/PATCH | `/admin/transport/vehicles`, `.../{id}`, `.../{id}/driver` | Vehicles + drivers pages | `IMPLEMENTED` |
| GET/POST/PATCH/DELETE | `/admin/transport/assignments`, `.../{id}` | `TransportAssignmentsPage`, roster fallback | `PARTIAL` (see [L4](#l4-stop-roster-endpoint--assignment-fallback)) |
| GET/POST/PATCH | `/admin/transport/gps-devices`, `.../{id}`, `.../{id}/rotate-token` | `GpsDeviceSetupModal` | `NEEDED` |
| POST | `/tracking/location` | Hardware devices + `tools/gps-simulator` | `NEEDED` |
| POST | `/tracking/update-location` | Mobile `DriverLocationPublisher` | `PARTIAL` (see [L1](#l1-any-accepted-ping-means-running), [L2](#l2-do-not-reject-pings-for-stale-client-timestamps)) |
| POST | `/tracking/trips/start`, `/tracking/trips/{id}/complete` | Driver trip screen | `NEEDED` |
| GET | `/driver/transport/current-trip` (aliases `/assignment`, `/me`, `/live`) | Driver trip screen | `NEEDED` |
| GET | `/admin/transport/trips` | Trip history | `NEEDED` |
| GET | `/transport/trips/{tripId}/stops/{stopId}/students` | Admin stop modal, driver stop sheet | `NEEDED` |
| GET | `/transport/routes/{routeId}/stops/{stopId}/students` | Roster fallback #1 | `NEEDED` |
| GET | `/driver/transport/stops/{stopId}/students` | Mobile roster fallback | `NEEDED` |
| POST | `/tracking/trips/{tripId}/students/{studentId}/pickup` \| `/dropoff` | Driver marks | `NEEDED` |
| GET | `/parent/transport/trips/{tripId}/students/{studentId}/status` | Parent approval card | `NEEDED` |
| POST | `/parent/transport/trips/{tripId}/students/{studentId}/pickup/approval` \| `/dropoff/approval` | Parent approve/reject | `NEEDED` |
| GET | `/admin/transport/trips/{tripId}/student-transport-statuses` | Admin status table | `NEEDED` |
| WS | `/ws/tracking?token=&tenant=&vehicleId=` | Web + mobile live maps | `NEEDED` |

Path note: the stop roster is served under **`/transport/trips/...`**, not
`/tracking/trips/...`. Both `trackingApi.js` (web) and `transportApi.ts` (mobile)
use `/transport/trips/{tripId}/stops/{stopId}/students`. The `/tracking/...`
prefix is used only for GPS ingest, trip lifecycle and driver pickup/dropoff
marks.

---

## L1. Any accepted ping means running

**Status: `PARTIAL` — the blocking bug.**

### What the client does today

The admin fleet list in `TransportLiveTrackingPage.jsx` renders
`vehicle.tracking_status` straight from `GET /admin/transport/live`, and appends
a speed label only when `speed >= 1`:

```jsx
const status = vehicle.tracking_status || vehicle.trackingStatus || 'offline';
const speedLabel = Number.isFinite(speed) && speed >= 1
  ? ` · ${speed.toFixed(0)} km/h`
  : (status === 'running' && hasGps ? ' · live GPS' : '');
```

When a driver tests indoors or the bus is at a stop, the GPS reports `speed = 0`
and the backend marks the vehicle `stopped`, so the admin sees
`stopped · 0 km/h` even though pings are arriving every few seconds. The mobile
client has already worked around this twice: `normalizeFleetVehicle()` overrides
the status to `running` whenever coordinates are fresher than 3 minutes, and
`DriverLocationPublisher.buildPayload()` **omits `speed` entirely** when it is
below 0.5 km/h, with the comment *"Sending 0 makes some backends keep
tracking_status=stopped."*

Both workarounds should be deleted once the backend is fixed.

### Expected backend behavior

`tracking_status` is a function of **recency of accepted fixes**, never of speed:

| Time since last accepted fix | `tracking_status` |
|------------------------------|-------------------|
| Any accepted ping, within warning window | `running` |
| No fix for ~5 minutes | `warning` |
| No fix for ~15 minutes | `offline` |
| Trip completed/cancelled | `completed` |
| No trip started, or no fix ever | `stopped` |

Rules:

1. On every accepted `POST /tracking/update-location` or `POST /tracking/location`
   during an active trip, set `tracking_status = running`, including when
   `speed = 0` or `speed` is absent.
2. `speed` is reported as-is for display; it must never drive the status.
3. Emit `vehicle.location_updated` on each accepted ping, and only emit
   `vehicle.tracking_warning` / `vehicle.tracking_offline` on the recency
   thresholds above.
4. `GET /admin/transport/live` must return the recomputed status at read time,
   not a stale stored value.

Accepted ping response:

```json
{
  "success": true,
  "data": {
    "vehicleId": "veh-01…",
    "tripId": "trip-77…",
    "trackingStatus": "running",
    "sequence": 3412,
    "acceptedAt": "2026-08-13T09:14:03Z"
  }
}
```

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| Null island `(0,0)` or out-of-range lat/lng | 400 | `VALIDATION_ERROR`, status unchanged |
| Driver not assigned to `vehicle_id` | 403 | `TRANSPORT_DRIVER_NOT_AUTHORIZED` |
| Ping faster than the ingest rate limit | 202 or 429 | Do **not** downgrade `tracking_status` |
| No active trip for the vehicle | 409 | Store as last-known location, keep `stopped` |

Note on a real observed failure: `POST /api/v1/tracking/update-location`
returned `{"code":"FORBIDDEN","message":"Access denied"}` for a signed-in driver
(recorded in `MASTER_LIVE_TRACKING_API.md` §6.21). Drivers with an assigned
vehicle and an active trip must be authorized on this route.

---

## L2. Do not reject pings for stale client timestamps

**Status: `PARTIAL`.**

### What the client does today

`DriverLocationPublisher.buildPayload()` rewrites the device timestamp before
sending, precisely because pings were being rejected:

```ts
// Backend rejects pings older than ~2 minutes. Cached indoor GPS timestamps
// would otherwise keep the trip stuck at "stopped · 0 km/h".
const ingestIso = (!Number.isFinite(rawTs) || age > 90_000 || age < -15_000)
  ? new Date(now).toISOString()
  : new Date(rawTs).toISOString();
```

The publisher also queues up to 120 fixes offline and flushes them when
connectivity returns — those replayed fixes are legitimately old.

Rewriting timestamps is lossy and hides genuine device-clock problems. The
backend should define the window instead.

### Expected backend behavior

1. Accept a fix whose `timestamp` is within **-15 seconds to +10 minutes** of
   server time (future skew tolerance small, past tolerance generous enough for
   offline replay).
2. Outside that window, **clamp and accept**: store `recordedAt = timestamp`,
   set `receivedAt = now`, and still update the current location if the fix is
   the newest one seen for the vehicle. Only reject on invalid coordinates.
3. Order by `sequence` (server-assigned, monotonic per vehicle), not by client
   timestamp. Clients already ignore out-of-order `sequence` values.
4. Replayed offline batches must append to `vehicle_location_history` without
   moving the live marker backwards.
5. Document the accepted window in the API response headers or docs so the
   mobile publisher can drop its rewriting logic.

Replayed-fix response:

```json
{
  "success": true,
  "data": {
    "vehicleId": "veh-01…",
    "accepted": true,
    "stale": true,
    "recordedAt": "2026-08-13T09:02:11Z",
    "receivedAt": "2026-08-13T09:14:03Z",
    "appliedToCurrentLocation": false
  }
}
```

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| `timestamp` missing or unparseable | 200 | Use server time, `stale: true` |
| `timestamp` more than 10 min in the future | 400 | `VALIDATION_ERROR` (real clock fault) |
| Fix older than the current stored fix | 200 | Append to history, do not move the marker |

---

## L3. Live location payload fields

**Status: `PARTIAL`.**

### What the client does today

`normalizeLiveSnapshot()` / `normalizeFleetVehicle()` (mobile) and
`normalizeParentLiveSnapshot()` / `normalizeAdminFleetVehicle()` (web) each try
three to five aliases per field — `lat|latitude|location.lat|currentLocation.lat`,
`speedKmh|speed_kmh|location.speedKmh`, `tripId|trip_id|activeTripId|trip.id`,
and so on. Any one canonical shape removes all of it.

### Expected backend behavior

Ingest body (`POST /tracking/update-location`, driver JWT) — accept snake_case
as the clients send it:

```json
{
  "vehicle_id": "veh-01…",
  "trip_id": "trip-77…",
  "route_id": "route-12…",
  "latitude": 18.5204,
  "longitude": 73.8567,
  "speed": 0,
  "heading": 92,
  "accuracy": 12.5,
  "timestamp": "2026-08-13T09:14:01Z"
}
```

`speed` is km/h. `trip_id` and `route_id` are optional; when omitted, resolve
from the driver's active trip.

Admin fleet element (`GET /admin/transport/live`) — one entry per vehicle:

```json
{
  "vehicleId": "veh-01…",
  "vehicleNumber": "MH-12-AB-1234",
  "routeId": "route-12…",
  "routeName": "North Route",
  "driverName": "Ramesh K",
  "tripId": "trip-77…",
  "tripStatus": "active",
  "trackingStatus": "running",
  "lat": 18.5204,
  "lng": 73.8567,
  "speedKmh": 0,
  "heading": 92,
  "accuracy": 12.5,
  "sequence": 3412,
  "recordedAt": "2026-08-13T09:14:01Z",
  "updatedAt": "2026-08-13T09:14:03Z",
  "etaMinutes": 7,
  "lastStop": "Stop A",
  "nextStop": "Stop B",
  "studentCount": 14
}
```

Parent snapshot (`GET /parent/transport/live?studentId=`) adds `studentId`,
`assignedStop`, `stateCode`, `stops[]` and `geometry`:

```json
{
  "studentId": "1b7a…",
  "vehicleId": "veh-01…",
  "vehicleNumber": "MH-12-AB-1234",
  "routeId": "route-12…",
  "routeName": "North Route",
  "activeTripId": "trip-77…",
  "tripStatus": "active",
  "trackingStatus": "running",
  "stateCode": "LIVE",
  "assignedStop": "Stop B",
  "lat": 18.5204,
  "lng": 73.8567,
  "speedKmh": 0,
  "heading": 92,
  "sequence": 3412,
  "updatedAt": "2026-08-13T09:14:03Z",
  "etaMinutes": 7,
  "lastStop": "Stop A",
  "nextStop": "Stop B",
  "geometry": { "type": "LineString", "coordinates": [[73.8567, 18.5204]] },
  "stops": [
    {
      "id": "stop-a1…",
      "name": "Stop A",
      "lat": 18.5188,
      "lng": 73.8541,
      "sequence": 1,
      "stopType": "pickup",
      "radiusMeters": 80,
      "studentId": null
    }
  ]
}
```

Notes:

- `stateCode` values: `NO_ASSIGNMENT`, `ASSIGNED_NO_ACTIVE_TRIP`,
  `WAITING_FOR_GPS`, `LIVE`, `WARNING`, `OFFLINE`, `COMPLETED`.
- `geometry` is the stored road path (GeoJSON `LineString`/`Feature`). When
  absent, both clients draw a straight polyline through ordered stops
  (`resolveRouteLine()` in `transportRouteGeo`), which looks wrong on real roads
  — store the road geometry on the route.
- `sequence` must be monotonic per vehicle; clients drop out-of-order frames.

### Polling and socket

| Client | Behavior |
|--------|----------|
| Web admin fleet | `GET /admin/transport/live` every 15 s (`FLEET_POLL_MS`) plus WebSocket merge |
| Web/mobile parent | Snapshot on mount, then WebSocket; REST resync on reconnect |
| WebSocket | `ws(s)://{API_HOST}/ws/tracking?token={JWT}&tenant={slug}&vehicleId={optional}`; client pings `{"type":"ping"}` every 25 s and reconnects with exponential backoff up to 30 s |

Socket frames must carry the same field names as the REST snapshot so the merge
in `upsertVehicle()` does not need another alias layer. Event types are listed in
`MASTER_LIVE_TRACKING_API.md` §3.

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| Parent has no transport assignment | 404 or `null` | Client renders `NO_ASSIGNMENT` |
| Assigned but no active trip | 200 | `stateCode: ASSIGNED_NO_ACTIVE_TRIP`, no coordinates |
| Active trip but no GPS yet | 200 | `stateCode: WAITING_FOR_GPS` |
| Endpoint not deployed | 404 | Clients soft-empty; no error toast |

---

## L4. Stop roster endpoint + assignment fallback

**Status: `NEEDED`.**

### What the client does today

Tapping a stop should show who boards there. Because no single endpoint is
guaranteed, `getTripStopStudents()` walks a chain (web
`trackingApi.js`, mobile `transportApi.ts`):

1. `GET /transport/trips/{tripId}/stops/{stopId}/students`
2. `GET /transport/routes/{routeId}/stops/{stopId}/students?stopId=&routeId=&vehicleId=&direction=&status=active`
3. `GET /driver/transport/stops/{stopId}/students` (mobile only)
4. `GET /driver/transport/assignments` / `GET /transport/assignments` / `GET /admin/transport/assignments`
   with `?stopId=&routeId=&vehicleId=&direction=&status=active`
5. `GET /admin/transport/assignments?studentId=&routeId=&status=active` for
   student-home stops (see [L5](#l5-student-home-derived-stops-must-resolve-their-student))

Each 404/403 falls through silently. A stop tap can cost five round trips.

### Expected backend behavior

```text
GET /transport/trips/{tripId}/stops/{stopId}/students
```

Roles: `school_admin`, `transport_manager`, and the `driver` of that trip.
Parents must **not** be able to call it (privacy) — they use
[L6](#l6-parent-scoping-for-transport).

```json
{
  "success": true,
  "data": {
    "tripId": "trip-77…",
    "direction": "morning",
    "stop": {
      "stopId": "stop-b2…",
      "stopName": "Stop B",
      "sequence": 2,
      "displaySequence": 1,
      "latitude": 18.5204,
      "longitude": 73.8567
    },
    "students": [
      {
        "studentId": "1b7a…",
        "studentName": "Aarav Sharma",
        "classId": "9de1…",
        "className": "Nursery A",
        "sectionName": "A",
        "parentName": "Neha Sharma",
        "assignmentId": "asg-31…",
        "stopId": "stop-b2…",
        "stopName": "Stop B",
        "pickup": {
          "status": "PENDING",
          "markedAt": null,
          "markedByDriverId": null,
          "parentApprovalStatus": null,
          "parentApprovedAt": null
        },
        "dropoff": {
          "status": "PENDING",
          "markedAt": null,
          "parentApprovalStatus": null
        }
      }
    ],
    "counts": {
      "assignedStudentCount": 1,
      "pickedUpCount": 0,
      "droppedOffCount": 0,
      "pendingCount": 1,
      "notPresentCount": 0,
      "skippedCount": 0
    }
  }
}
```

Required per student: `studentId`, `studentName`, `classId`/`className`,
`pickup.status`, `dropoff.status`, `pickup.parentApprovalStatus`,
`dropoff.parentApprovalStatus`. Legacy flat `pickupStatus`/`dropoffStatus` are
still parsed by the clients but should not be used for new work.

Statuses: `PENDING`, `PICKED_UP`, `DROPPED_OFF`, `NOT_PRESENT`, `SKIPPED`.
`parentApprovalStatus`: `PENDING`, `APPROVED`, `REJECTED`, or `null`.

Also support the assignment fallback so the roster works before a trip exists:

```text
GET /admin/transport/assignments?routeId={uuid}&stopId={uuid}&direction=morning&status=active
GET /admin/transport/assignments?studentId={uuid}&routeId={uuid}&status=active
```

Filtering rules the clients replicate today and expect the backend to apply:

- exclude assignments with status `inactive|disabled|cancelled|deleted`;
- `direction: both` matches both morning and evening trips;
- `morning` matches pickup trips, `evening` matches dropoff trips;
- students are keyed by `stopId`, never by `sequence` or `displaySequence`
  (stop rotation reorders display only).

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| No students at the stop | 200 | Empty `students`, zeroed `counts` |
| Trip or stop not in tenant | 404 | `NOT_FOUND` (clients soft-empty) |
| Driver requesting another driver's trip | 403 | `TRANSPORT_DRIVER_NOT_AUTHORIZED` |
| Parent calling the endpoint | 403 | `FORBIDDEN` |

---

## L5. Student-home derived stops must resolve their student

**Status: `NEEDED` — blocking for routes built from student addresses.**

### What the client does today

`TransportRoutesManagePage` lets an admin build a route directly from a class
roster. `StudentApplicationStopPicker` calls `buildMappedStopFromStudent()`
(`src/services/transportAddressService.js`), which geocodes the enrollment
application address and produces a stop:

```js
stop: {
  id: `stu-${ctx.studentId}`,
  name: `${ctx.fullName} (home)`,
  lat: place.latitude,
  lng: place.longitude,
  radiusMeters: 80,
  stopType: 'pickup',
  studentId: ctx.studentId,
  applicationId: ctx.applicationId,
}
```

That stop is saved with the route. But no transport assignment row points at
`stu-{studentId}`, so the trip roster lookup by `stopId` returns nothing and the
driver sees "No students assigned" at a stop that exists solely for one child.

The clients patch around this with `studentIdFromStop()`
(`src/utils/transportRouteGeo.js` / `.ts`), which recovers the student id from
`stop.studentId` or from the `stu-` id prefix, then retries assignments by
`studentId`, and finally binds the student straight from the student directory
(`studentHomeStopRoster()`).

### Expected backend behavior

1. **Persist `studentId` on the route stop.** `POST`/`PATCH
   /admin/transport/routes` must store and return `stops[].studentId` (and
   optionally `applicationId`) rather than discarding unknown fields. Preserve
   the client-provided stop `id` (`stu-{studentId}`) or return a stable server id
   together with `studentId`.

```json
{
  "name": "North Route",
  "stops": [
    {
      "id": "stu-1b7a…",
      "name": "Aarav Sharma (home)",
      "sequence": 1,
      "lat": 18.5188,
      "lng": 73.8541,
      "radiusMeters": 80,
      "stopType": "pickup",
      "studentId": "1b7a…"
    }
  ]
}
```

2. **Resolve the roster by `studentId` when the stop has one.**
   `GET /transport/trips/{tripId}/stops/{stopId}/students` must return that
   student when `stop.studentId` is set, even if no assignment row references the
   stop id. Resolution order:
   `assignments by stopId` → `assignments by stop.studentId` → `the bound student
   record itself` (with `pickup`/`dropoff` overlaid from the trip).
3. **Or** auto-create the standing assignment when a student-home stop is added
   to a route, so the normal `stopId` lookup works. Either approach is
   acceptable; both must return the same `StopAssignedStudent` shape.
4. Support `GET /admin/transport/assignments?studentId={uuid}&routeId={uuid}` —
   this is the fallback both clients already use.
5. The clients also accept an explicit `studentId` query hint:
   `getTripStopStudents(tripId, stopId, { studentId })`. Accepting
   `?studentId=` on the stop-students route lets the client stop parsing the
   `stu-` prefix.

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| Stop has `studentId` but the student left the school | 200 | Empty `students` with `counts.assignedStudentCount: 0` |
| Stop id has the `stu-` prefix but no matching student | 404 | `NOT_FOUND` |
| Route saved with `studentId` stripped by the backend | — | Regression: the driver sees "No students assigned" |

---

## L6. Parent scoping for transport

**Status: `NEEDED`.**

### What the client does today

`filterStudentsForParent()` in `transportStudentAttendance` filters any student
list down to the parent's linked `studentIds`, and parent screens deliberately do
not call the admin/driver stop-students endpoint. `ParentTransportApprovalCard`
only ever asks about one child at a time. This is UI hygiene, not authorization.

### Expected backend behavior

| Endpoint | Parent rule |
|----------|-------------|
| `GET /parent/transport/live?studentId=` | Only linked children. Without `studentId`, return the child with an active trip (or the first linked child) |
| `GET /parent/transport/trips/{tripId}/students/{studentId}/status` | `403 TRANSPORT_PARENT_NOT_AUTHORIZED` when `studentId` is not linked to the caller |
| `POST /parent/transport/trips/{tripId}/students/{studentId}/pickup/approval` | Same check before mutating |
| `GET /transport/trips/{tripId}/stops/{stopId}/students` | `403` for the `parent` role — parents never see other families' children |
| `GET /admin/transport/*` | `403` for parents and (by default) teachers |

Tenant scoping applies on top: a record from another tenant is `404`, not `403`.

---

## L7. Pickup request to parent approval lifecycle

**Status: `NEEDED`.**

### What the client does today

The driver marks a student, then the parent confirms. The clients model driver
action and parent approval as **two separate facts** so a rejection never erases
the driver's record (`normalizeDriverActionResult`,
`formatDriverApprovalLine`).

Driver mark:

```text
POST /tracking/trips/{tripId}/students/{studentId}/pickup
POST /tracking/trips/{tripId}/students/{studentId}/dropoff
{ "stopId": "stop-b2…", "status": "PICKED_UP", "deviceTimestamp": "2026-08-13T09:14:03Z" }
```

If the response omits `parentApprovalStatus`, the clients synthesize `PENDING`
locally — the backend should send it explicitly.

Parent approval:

```text
POST /parent/transport/trips/{tripId}/students/{studentId}/pickup/approval
{ "approved": true }
{ "approved": false, "reason": "Student was not picked up", "comment": "…" }
```

Rejection reasons offered by the UI: *Student was not picked up*, *Wrong pickup
time*, *Wrong stop*, *Student has not arrived*, *Other*.

### Expected backend behavior

State machine, per `(tripId, studentId, direction)`:

| Driver action | Driver `status` | `parentApprovalStatus` |
|---------------|-----------------|------------------------|
| none | `PENDING` | `null` |
| mark picked up | `PICKED_UP` | `PENDING` |
| mark dropped off | `DROPPED_OFF` | `PENDING` |
| mark not present | `NOT_PRESENT` | `null` (nothing to approve) |
| mark skipped | `SKIPPED` | `null` |
| parent approves | unchanged | `APPROVED` + `parentApprovedAt` |
| parent rejects | unchanged | `REJECTED` + `parentApprovedAt` + `reason` |

Rules:

1. Setting `PICKED_UP`/`DROPPED_OFF` must set `parentApprovalStatus = PENDING`
   and emit `transport.student_picked_up` / `transport.student_dropped_off`.
2. Parent rejection must **not** clear the driver's `status` or `markedAt`.
3. Approval is idempotent per trip+student+direction; a second submission returns
   `TRANSPORT_PARENT_APPROVAL_ALREADY_SUBMITTED`.
4. Emit `transport.pickup_parent_approved|rejected` and
   `transport.dropoff_parent_approved|rejected` with `tripId`, `studentId`,
   `stopId`, `status`, `parentApprovalStatus`, `markedAt`.

Driver mark response:

```json
{
  "success": true,
  "data": {
    "studentId": "1b7a…",
    "tripId": "trip-77…",
    "pickup": {
      "status": "PICKED_UP",
      "stopId": "stop-b2…",
      "stopName": "Stop B",
      "markedAt": "2026-08-13T09:14:05Z",
      "markedByDriverId": "usr-drv-9…",
      "parentApprovalStatus": "PENDING",
      "parentApprovedAt": null
    }
  }
}
```

Parent status response:

```json
{
  "success": true,
  "data": {
    "studentId": "1b7a…",
    "studentName": "Aarav Sharma",
    "tripId": "trip-77…",
    "direction": "morning",
    "pickup": {
      "status": "PICKED_UP",
      "stopId": "stop-b2…",
      "stopName": "Stop B",
      "markedAt": "2026-08-13T09:14:05Z",
      "parentApprovalStatus": "PENDING",
      "parentApprovedAt": null,
      "reason": null
    },
    "dropoff": null,
    "timeline": [
      { "at": "2026-08-13T09:14:05Z", "label": "Picked up at Stop B", "type": "pickup" }
    ]
  }
}
```

### Error cases

| Condition | HTTP | Code |
|-----------|------|------|
| Student not on the trip | 409 | `TRANSPORT_STUDENT_NOT_ON_TRIP` |
| Student not assigned to that stop | 409 | `TRANSPORT_STUDENT_NOT_AT_STOP` |
| Pickup already marked | 409 | `TRANSPORT_PICKUP_ALREADY_MARKED` |
| Dropoff already marked | 409 | `TRANSPORT_DROPOFF_ALREADY_MARKED` |
| Approval before the driver marked | 409 | `TRANSPORT_PICKUP_NOT_MARKED` / `TRANSPORT_DROPOFF_NOT_MARKED` |
| Approval submitted twice | 409 | `TRANSPORT_PARENT_APPROVAL_ALREADY_SUBMITTED` |
| Parent not linked to the student | 403 | `TRANSPORT_PARENT_NOT_AUTHORIZED` |
| Driver not on that trip | 403 | `TRANSPORT_DRIVER_NOT_AUTHORIZED` |

All of these codes already map to friendly copy in
`friendlyTransportError()`.

---

## L8. Standing assignments versus per-day trips

**Status: documentation + explicit confirmation `NEEDED`.**

### What the model actually is

| Concept | Lifetime | Created by | Key fields |
|---------|----------|------------|------------|
| Route + stops | Standing | Admin, `TransportRoutesManagePage` | `routeId`, `stops[]` with `stopId`, `sequence`, `lat/lng`, optional `studentId` |
| Assignment | Standing | Admin, `TransportAssignmentsPage` | `classId`, `studentId`, `routeId`, `stopId`, `vehicleId`, `direction`, `status` |
| Trip | One per vehicle per direction per day | Driver, `POST /tracking/trips/start` | `tripId`, `vehicleId`, `routeId`, `direction`, `status`, `startedAt`, `completedAt` |
| Pickup/dropoff mark | Per trip + student | Driver | `status`, `markedAt`, `parentApprovalStatus` |

An assignment is a **standing** relationship, not a daily booking. It stays valid
until an admin changes it or sets `status` to inactive. There is **no daily
scheduler**: nothing on either client (and nothing in the transport docs)
pre-creates trips at the route's `morningStart`/`eveningStart`. A trip exists
only after a driver taps Start, and `direction` comes from that call.

### What the backend must confirm or build

1. Trips are created **on demand** by `POST /tracking/trips/start`. Only one
   active trip per vehicle at a time; a second start returns `409`.
2. Roster for a trip is derived from standing assignments filtered by
   `routeId` + `direction` at trip-start time (plus student-home stops per
   [L5](#l5-student-home-derived-stops-must-resolve-their-student)).
3. `morningStart` / `eveningStart` on the route are **display/ETA hints only**
   today. If scheduled auto-start is wanted later, it is new backend work and a
   new contract section — no client currently expects it.
4. Changing an assignment must not retroactively rewrite completed trips'
   pickup/dropoff records.
5. `GET /admin/transport/trips` returns history with `startedAt`, `completedAt`,
   `direction`, `status`, `vehicleNumber`, `routeName`, `driverName`.

---

# 3. Acceptance checklist

Course / LMS:

- [ ] Failing the required quiz produces no certificate and `409 LMS_QUIZ_NOT_PASSED` from `POST /lms/enrollments/{id}/complete`
- [ ] `GET /lms/certificates` returns `learnerName`, `courseTitle`, `issuedAt`, non-UUID `certificateNumber`, `studentId`, `enrollmentId`
- [ ] A parent hitting `GET /lms/my-learning` and `GET /lms/certificates` with no parameters sees exactly their children
- [ ] Quiz submit returns `passed`, `percentage`, `passingPercentage`, `attemptNumber`, `attemptsRemaining` and `questionResults[]` with `correctOptionId`
- [ ] Attempts exhausted keeps the enrollment incomplete
- [ ] `GET /lms/quizzes/{quizId}/attempts?enrollmentId=` returns history instead of 404

Location / Transport:

- [ ] A driver publishing at 0 km/h shows as `running` in `GET /admin/transport/live` within one poll
- [ ] A ping replayed from the offline queue 5 minutes late is accepted and appended to history
- [ ] Parent live snapshot carries `stateCode`, `stops[]` and route `geometry`
- [ ] `GET /transport/trips/{tripId}/stops/{stopId}/students` returns students with `pickup`/`dropoff` blocks and counts
- [ ] A route stop created from a student's home address returns that student in the driver's stop sheet
- [ ] A parent cannot read another family's trip status, and cannot call the stop-students endpoint
- [ ] Parent rejection leaves the driver's `PICKED_UP` mark intact
- [ ] Starting a second trip for the same vehicle returns `409`

---

*Written from client code on 13 August 2026. When an item ships, mark it
`IMPLEMENTED` here and remove the matching client fallback.*
