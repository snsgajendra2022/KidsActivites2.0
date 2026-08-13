# Course, Location and Chat — Remaining Backend Requirements

Date: 13 August 2026
Scope: Kids Activities **Web** (`KidsActivities2.0`) + **Mobile (Expo)** clients
API base: `{API_BASE_URL}/api/v1`
Auth: `Authorization: Bearer {accessToken}`, `X-Tenant-Slug: {tenantSlug}`

## Purpose

The frontends are already wired for three areas: the LMS course/quiz/certificate
flow, transport map location / live GPS / stop rosters, and chat with
attachments and unread badges. This document lists only what the **backend still
has to implement or correct** so the clients can drop their defensive fallbacks.

Every endpoint below is called by real client code today. Nothing here is
speculative: paths were taken from `src/services/lmsService.js`,
`src/services/transportTracking/trackingApi.js`, `src/services/chatService.js`,
`src/utils/chatAttachments.js`, mobile `src/api/lmsApi.ts`, mobile
`src/api/transportApi.ts` and mobile `src/api/chatApi.ts`.

This document supersedes `courseAndLocation.md`: sections 1 and 2 carry that
document's requirements forward with the same IDs (C1–C6, L1–L8), plus new
transport items (L9–L11) and a new chat section (CH1–CH8). Long JSON examples
are kept here in full where a backend dev needs them; where a payload is only
summarized, the original document remains the reference.

Related documents:

- [`../FULL_BACKEND_API_CONTRACT.md`](../FULL_BACKEND_API_CONTRACT.md) — sections 7 (LMS) and 8 (Transport)
- [`../CHAT_API_CONTRACT.md`](../CHAT_API_CONTRACT.md) — current chat HTTP + STOMP contract that section 3 corrects
- [`../transport/MASTER_LIVE_TRACKING_API.md`](../transport/MASTER_LIVE_TRACKING_API.md) — canonical live-tracking endpoint list
- [`../transport/DRIVER_ASSIGNMENT_LIVE_API.md`](../transport/DRIVER_ASSIGNMENT_LIVE_API.md) — driver/route relationships
- [`../transport/LIVE_BUS_TRACKING.md`](../transport/LIVE_BUS_TRACKING.md) — Spring Boot package guidance

## Status legend

| Status | Meaning |
|--------|---------|
| `IMPLEMENTED` | Backend already behaves as the clients need |
| `PARTIAL` | Endpoint exists but the response or the rule is wrong/incomplete |
| `NEEDED` | Clients call it; backend must implement (or currently returns 404) |

---

## Priority / blocking

These break the product for real users today, in order, across all three areas.

| # | Area | What breaks | Requirement |
|---|------|-------------|-------------|
| P1 | Course | A learner who **fails** the quiz still gets a certificate, because `POST /lms/enrollments/{id}/complete` issues `CERT-YYYY-####` regardless of quiz outcome | [C1](#c1-certificate-only-on-pass) |
| P2 | Location | Admin live fleet shows `stopped · 0 km/h` while a driver is actively publishing GPS, because `tracking_status` is derived from speed | [L1](#l1-any-accepted-ping-means-running) |
| P3 | Chat | Attachment key is not standardized. The client accepts nine URL aliases plus three key aliases and **refuses to send** anything it cannot prove is server-stored, so a file can silently fail to attach | [CH1](#ch1-attachment-upload-response-must-have-one-canonical-key) |
| P4 | Chat | Attachment images do not render for the recipient when the file is served behind header auth. Web retries via an authenticated fetch; **mobile cannot** — React Native `Image` cannot send a bearer token | [CH2](#ch2-attachment-serving-and-auth-model) |
| P5 | Location | Driver stop sheet shows "No students assigned" for stops created from a student's home address | [L5](#l5-student-home-derived-stops-must-resolve-their-student) |
| P6 | Location | A driver cannot read the student behind a home stop: `GET /admin/students/{id}` is admin-only, so the driver gets `403`, sees the stop label as the child's name and a status stuck at Pending | [L9](#l9-driver-readable-student-lookup) |
| P7 | Chat | Sidebar `Messages` badge shows a wrong count (an observed `2` on a fully read inbox) because `GET /chat/conversations` returns no per-user unread or read receipt, so the client guesses | [CH5](#ch5-unread-counts) |
| P8 | Course | Certificate cards/preview show blank learner name, blank course title and a UUID instead of a certificate number | [C2](#c2-certificate-list--detail-must-carry-display-fields) |
| P9 | Location | Driver pings are silently dropped when the device clock/cached fix is a couple of minutes old, so the bus never appears live | [L2](#l2-do-not-reject-pings-for-stale-client-timestamps) |
| P10 | Location | Stop roster returns nothing unless a trip-scoped endpoint exists; clients fan out across up to five paths per stop tap, and the assignment endpoints appear to ignore the filters | [L4](#l4-stop-roster-endpoint--assignment-fallback) |
| P11 | Location | Parents have no stop-roster endpoint at all, so the parent list is assembled client-side from three unrelated payloads and shows `—` for class | [L11](#l11-parent-scoped-stop-roster) |
| P12 | Chat | A single `404`/`405`/`501` from the attachment route disables attachments for the whole session (`markFeatureUnavailable`), so a validation failure returned with the wrong status hides the paper-clip until reload | [CH3](#ch3-attachment-error-statuses-must-not-soft-disable-the-feature) |
| P13 | Location | `/parent/transport/live` omits `direction` and `assignedStopId`, so parent clients assume Pickup and match the child's stop by name | [L10](#l10-parent-live-snapshot-needs-direction-and-assignedstopid) |
| P14 | Course | Quiz review/retry is guessed client-side because the submit response has no per-question result, no attempt number and often no `passed` | [C4](#c4-quiz-submit-response-must-be-self-describing) |
| P15 | Chat | Read receipts (the "seen" ticks) exist only in socket memory. After a reload the REST message payload has no read state, so ticks disappear | [CH6](#ch6-persisted-read-receipts-on-messages) |
| P16 | All | Parent scoping is enforced only in the UI: certificates, my-learning, trip status, approvals and chat conversations must be role-scoped server-side | [C3](#c3-parent-scoping-for-my-learning-and-certificates), [L6](#l6-parent-scoping-for-transport), [CH5](#ch5-unread-counts) |

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
| GET | `/parent/transport/live?studentId=` | Parent live (web + mobile) | `NEEDED` (see [L10](#l10-parent-live-snapshot-needs-direction-and-assignedstopid)) |
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
| GET | `/admin/transport/trips/{tripId}/student-transport-statuses` | Admin status table; **admin-only, so drivers cannot use it** | `NEEDED` (see [L9](#l9-driver-readable-student-lookup)) |
| GET | `/admin/students/{studentId}` | Home-stop student resolution; **admin-only, drivers get 403** | `PARTIAL` (see [L9](#l9-driver-readable-student-lookup)) |
| GET | `/transport/students/{studentId}` or `/driver/transport/students/{studentId}` | Proposed driver-scoped student lookup | `NEEDED` (see [L9](#l9-driver-readable-student-lookup)) |
| GET | `/parent/transport/trips/{tripId}/stops/{stopId}/students` | Parent stop roster — **does not exist** | `NEEDED` (see [L11](#l11-parent-scoped-stop-roster)) |
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

**Observed defect:** the assignment endpoints appear to **ignore the
`studentId` and `stopId` query parameters** — the same full assignment list comes
back regardless — so the clients re-filter the response themselves by
`stopId`/`studentId` after every call. That is why a stop tap can return the
whole school's assignments over the wire, and why filtering is happening in the
browser instead of the database.

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

## L9. Driver-readable student lookup

**Status: `NEEDED` — new since `courseAndLocation.md`.**

### What the client does today

Resolving a student-home stop ([L5](#l5-student-home-derived-stops-must-resolve-their-student))
needs the student record behind `stu-{studentId}`. The only lookup that exists is
`GET /admin/students/{studentId}`, which is **admin-only**. A signed-in driver
calling it gets `403`, so the driver stop sheet falls back to using the **stop
label** as the child's name — the row reads `Aarav Sharma (home)` (or worse, a
truncated label) instead of a real name, with no class and no student id bound to
the row.

The same wall exists for status: `GET /admin/transport/trips/{tripId}/student-transport-statuses`
is admin-only, so the driver's home-stop row cannot read the existing
pickup/dropoff state and always renders **Pending**, even after the driver
already marked the child on a previous trip that day.

Net effect for a driver on a home-stop route: no real name, no class, and a
status that lies.

### Expected backend behavior

Either option is acceptable; option 1 is cheaper for the clients.

**Option 1 (preferred) — put the student on the payload the driver already gets.**
Include `studentId`, `studentName` and `className` on every stop in the driver's
trip/route payload and on the assignment rows the driver can read:

```json
{
  "stops": [
    {
      "id": "stu-1b7a…",
      "name": "Aarav Sharma (home)",
      "sequence": 1,
      "lat": 18.5188,
      "lng": 73.8541,
      "stopType": "pickup",
      "studentId": "1b7a…",
      "studentName": "Aarav Sharma",
      "classId": "9de1…",
      "className": "Nursery A"
    }
  ]
}
```

**Option 2 — add a role-scoped student lookup.**

```text
GET /transport/students/{studentId}
GET /driver/transport/students/{studentId}
```

Allowed for the `driver` role **only when** the student is assigned to a route or
trip that driver is currently operating. Response is a minimal, privacy-reduced
projection — no address, no parent phone unless a separate permission is granted:

```json
{
  "success": true,
  "data": {
    "studentId": "1b7a…",
    "studentName": "Aarav Sharma",
    "classId": "9de1…",
    "className": "Nursery A",
    "sectionName": "A",
    "photoUrl": null
  }
}
```

Also required: a driver-readable status source so the home-stop row starts at the
real status. Expose the pickup/dropoff state either inside
`GET /transport/trips/{tripId}/stops/{stopId}/students` ([L4](#l4-stop-roster-endpoint--assignment-fallback),
which already allows the trip's driver) or via a driver-scoped equivalent of
`student-transport-statuses`.

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| Driver requests a student not on any of their routes/trips | 403 | `TRANSPORT_DRIVER_NOT_AUTHORIZED` |
| Student not in tenant | 404 | `NOT_FOUND` |
| Driver requests during a completed trip | 200 | Allowed for the trip's own day; the driver still needs the roster to reconcile |
| Admin-only route called by a driver | 403 | Current behavior — the reason this item exists |

Removable once shipped: the stop-label-as-name fallback in the driver stop sheet,
and the forced `Pending` default for home-stop rows.

---

## L10. Parent live snapshot needs `direction` and `assignedStopId`

**Status: `PARTIAL` — new since `courseAndLocation.md`.**

### What the client does today

`GET /parent/transport/live` returns neither `direction` nor `assignedStopId`.
Because of that the parent clients:

- **assume `direction = 'pickup'`/`morning`** when deciding which status card and
  which approval action to show, so an evening drop-off trip is labelled as a
  pickup;
- **match the child's stop by name**, comparing `assignedStop` (a string) against
  `stops[].name`, and additionally by the `stu-`/`(home)` home-stop convention
  from [L5](#l5-student-home-derived-stops-must-resolve-their-student). Any
  rename, trailing space or duplicate stop name breaks the match and the
  "your stop" marker lands on the wrong pin or on nothing.

### Expected backend behavior

Add both fields to the parent snapshot:

| Field | Type | Meaning |
|-------|------|---------|
| `direction` | `morning` \| `evening` \| `pickup` \| `dropoff` | Direction of the **active trip**, not of the standing assignment |
| `assignedStopId` | uuid \| `stu-{studentId}` | Id of the stop this child boards/alights at, matching an entry in `stops[]` |

```json
{
  "studentId": "1b7a…",
  "activeTripId": "trip-77…",
  "direction": "evening",
  "assignedStopId": "stop-b2…",
  "assignedStop": "Stop B",
  "stateCode": "LIVE",
  "stops": [
    { "id": "stop-b2…", "name": "Stop B", "sequence": 2, "stopType": "dropoff" }
  ]
}
```

Rules:

1. `assignedStopId` must be present whenever the child has an assignment, even
   when no trip is running (`stateCode: ASSIGNED_NO_ACTIVE_TRIP`).
2. `direction` must reflect the running trip. When no trip is running, return the
   direction of the next scheduled/most likely trip or `null` — do not silently
   default to morning.
3. Keep `assignedStop` (the display name) for backwards compatibility; the
   clients will prefer the id once it exists.

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| Child has no assignment | 200 | `assignedStopId: null`, `direction: null`, `stateCode: NO_ASSIGNMENT` |
| Assignment points at a deleted stop | 200 | `assignedStopId: null` plus a `warning` — never a dangling id |
| Two trips active for the child's vehicle | 409 | Should be impossible per [L8](#l8-standing-assignments-versus-per-day-trips) |

Removable once shipped: the pickup default and the name-based stop matching in
the parent live screens.

---

## L11. Parent-scoped stop roster

**Status: `NEEDED` — new since `courseAndLocation.md`.**

### What the client does today

There is no parent-scoped roster endpoint. `GET /parent/transport/trips/{tripId}/stops/{stopId}/students`
does not exist, and parents are (correctly) `403` on the admin/driver route from
[L4](#l4-stop-roster-endpoint--assignment-fallback). So the parent transport list
is **assembled client-side from three separate payloads**:

1. the live snapshot (`GET /parent/transport/live`) for the trip, vehicle and stops;
2. one per-child status call (`GET /parent/transport/trips/{tripId}/students/{studentId}/status`);
3. the linked-children payload for names and classes.

Class name is read from `academic.className` on the linked-children record, and
when that is omitted the row renders a literal `—`. Nothing joins these three
sources server-side, so a parent with three children costs 1 + 3 + 1 requests and
still shows partial data.

### Expected backend behavior

```text
GET /parent/transport/trips/{tripId}/stops/{stopId}/students
GET /parent/transport/trips/{tripId}/students        (all of the caller's children on that trip)
```

Same envelope as [L4](#l4-stop-roster-endpoint--assignment-fallback), but
**filtered server-side to the caller's linked children only** — a parent must
never see another family's child at a shared stop:

```json
{
  "success": true,
  "data": {
    "tripId": "trip-77…",
    "direction": "evening",
    "stop": {
      "stopId": "stop-b2…",
      "stopName": "Stop B",
      "sequence": 2,
      "latitude": 18.5204,
      "longitude": 73.8567
    },
    "students": [
      {
        "studentId": "1b7a…",
        "studentName": "Aarav Sharma",
        "classId": "9de1…",
        "className": "Nursery A",
        "assignedStopId": "stop-b2…",
        "pickup": {
          "status": "PICKED_UP",
          "markedAt": "2026-08-13T09:14:05Z",
          "parentApprovalStatus": "PENDING",
          "parentApprovedAt": null
        },
        "dropoff": null
      }
    ]
  }
}
```

Rules:

1. `className` must be resolved through the class relationship on the server, not
   left to the client to find on a different payload. Never return a placeholder.
2. `counts` should be **omitted or scoped to the caller's children** — a parent
   must not learn how many other children board at the stop.
3. The response must carry enough state (`pickup`/`dropoff` plus
   `parentApprovalStatus`) that the approval card needs no second call.

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| None of the caller's children are at that stop | 200 | Empty `students` |
| `tripId` for another tenant | 404 | `NOT_FOUND` |
| Parent not linked to any student on the trip | 403 | `TRANSPORT_PARENT_NOT_AUTHORIZED` |
| Endpoint not deployed | 404 | Clients keep the current three-call assembly |

Removable once shipped: the client-side merge of live snapshot + per-child status
+ linked-children payload, and the `academic.className` lookup with its `—`
fallback.

---

# 3. Chat

## 3.0 Endpoints the clients call today

| Method | Path | Used by | Status |
|--------|------|---------|--------|
| GET | `/chat/contacts` | New-conversation picker (web + mobile) | `IMPLEMENTED` |
| GET | `/chat/conversations` | `ChatPage`, `useUnreadMessageCount`, mobile inbox | `PARTIAL` (see [CH5](#ch5-unread-counts)) |
| POST | `/chat/conversations` | New conversation | `IMPLEMENTED` |
| GET | `/chat/conversations/{id}/messages?limit=&before=` | Thread + pagination | `PARTIAL` (see [CH6](#ch6-persisted-read-receipts-on-messages)) |
| POST | `/chat/conversations/{id}/messages` | Send | `PARTIAL` (see [CH4](#ch4-send-message-must-echo-attachments)) |
| POST | `/chat/conversations/{id}/read` | Opening a thread | `PARTIAL` (see [CH5](#ch5-unread-counts)) |
| GET | `/chat/unread-count` | Sidebar badge (optional today) | `PARTIAL` (see [CH5](#ch5-unread-counts)) |
| POST | `/chat/conversations/{id}/attachments` | Paper-clip upload | `PARTIAL` (see [CH1](#ch1-attachment-upload-response-must-have-one-canonical-key)) |
| GET | `/documents/{fileKey}/download` | Attachment fallback when only a key is returned | `PARTIAL` (see [CH2](#ch2-attachment-serving-and-auth-model)) |
| PATCH | `/chat/conversations/{id}/messages/{messageId}` | Edit | `NEEDED` (soft-disables on 404/405/501) |
| DELETE | `/chat/conversations/{id}/messages/{messageId}` | Delete | `NEEDED` (soft-disables) |
| POST | `/chat/conversations/{id}/messages/{messageId}/reactions` | Reactions | `NEEDED` (see [CH8](#ch8-edit-delete-and-reaction-semantics)) |
| WS | `/api/v1/ws/chat` (SockJS + STOMP) | Realtime | `PARTIAL` (see [CH7](#ch7-realtime-transport-and-event-payloads)) |
| STOMP | `/topic/tenant/{tenantSlug}/conversation/{conversationId}` | Subscribe | `PARTIAL` (see [CH7](#ch7-realtime-transport-and-event-payloads)) |
| STOMP | `/app/chat/read`, `/app/chat/typing`, `/app/chat/presence` | Client publish | `NEEDED` |

Client entry points: `src/services/chatService.js`,
`src/services/chatRealtime.js`, `src/utils/chatAttachments.js`,
`src/utils/chatUnread.js`, `src/hooks/useUnreadMessageCount.js`,
`src/components/chat/ChatAttachmentView.jsx`, `src/pages/shared/ChatPage.jsx`;
mobile `src/api/chatApi.ts`, `src/utils/chatAttachments.ts`,
`src/components/MessageBubble.tsx`.

---

## CH1. Attachment upload response must have one canonical key

**Status: `PARTIAL` — the blocking chat bug.**

### What the client does today

[`../CHAT_API_CONTRACT.md`](../CHAT_API_CONTRACT.md) documents the upload
response as `{ id, name, mimeType, size, url }`. In practice the returned shape
varied enough that `normalizeChatAttachment()`
(`src/utils/chatAttachments.js`, mirrored in mobile `src/utils/chatAttachments.ts`)
now probes a list of aliases per field:

| Field | Aliases the client accepts |
|-------|----------------------------|
| URL | `url`, `downloadUrl`, `fileUrl`, `signedUrl`, `publicUrl`, `previewUrl`, `location`, `href`, `src` |
| Storage key | `fileKey`, `storageKey`, `objectKey`, `key`, `path`, `filePath` |
| Id | `id`, `attachmentId`, `fileId`, `documentId`, `uuid`, `_id` |
| Name | `name`, `fileName`, `filename`, `originalName`, `originalFilename`, `displayName`, `title` |
| MIME | `mimeType`, `mimetype`, `contentType`, `content_type`, `fileType`, `type` |
| Size | `size`, `fileSize`, `sizeBytes`, `bytes`, `contentLength`, `length` |

It also flattens nested envelopes (`{ attachment: {…} }`, `{ file: {…} }`,
`{ data: {…} }`, `{ result: {…} }`), accepts a bare string body, and treats a
non-addressable URL value as if it were a storage key.

On top of that, `isServerStoredAttachment()` now **refuses to send** a message
whose attachment is not provably server-stored: `uploadChatAttachment()` throws
*"The server did not return a link for this file"* when the response yields
neither a usable URL nor a key, and `sendMessage()` throws *"An attachment was
not stored on the server"* before it will `POST` the message. This was added
because `data:`/`blob:` sources are dead for the recipient and after a reload, so
a message would appear to send and arrive with a broken file.

### Expected backend behavior

```text
POST /chat/conversations/{conversationId}/attachments
Content-Type: multipart/form-data
Multipart field name: file          (single file per request)
```

The clients deliberately do **not** set `Content-Type` so the platform adds the
multipart boundary (web: `body instanceof FormData` skips the JSON header;
mobile: axios sets it). The server must accept a browser/RN-generated boundary.

Pick **one** canonical response and document it. Recommended:

```json
{
  "success": true,
  "data": {
    "id": "att-123",
    "name": "progress-report.pdf",
    "mimeType": "application/pdf",
    "size": 48231,
    "url": "https://cdn.example.com/tenant-a/chat/att-123.pdf?token=…",
    "fileKey": "tenant-a/chat/att-123.pdf",
    "expiresAt": "2026-08-13T10:14:03Z"
  }
}
```

Rules:

1. `url` is the canonical key. Always populate it. Return `downloadUrl` and the
   rest **only** as deprecated aliases, or not at all.
2. Always return a **server-stored reference**. `url` must be an absolute
   `https://` URL or an API-relative path beginning with `/`; it must never be a
   `data:` or `blob:` value. Returning a key without a URL is acceptable only if
   `fileKey` is set and resolvable per [CH2](#ch2-attachment-serving-and-auth-model).
3. Return `fileKey` alongside `url` when the URL is short-lived, so the client can
   re-resolve it later instead of rendering a broken image.
4. `name`, `mimeType` and `size` must be echoed from the stored object, not from
   the client's claim. The clients fall back to the local `File` metadata when
   these are missing, which drifts from what was actually stored.
5. Validate before storing: conversation membership, tenant ownership, MIME type,
   file signature (not just the extension) and size. Limits the clients enforce
   locally: **10 MB**, and `pdf, jpg, jpeg, png, webp, doc, docx, xls, xlsx`.
6. One `id` per stored attachment, stable, usable as the join key if
   `attachmentIds` is ever preferred over inline objects on send.

### Error cases

| Condition | HTTP | Code | Client effect |
|-----------|------|------|---------------|
| No `file` part | 400 | `VALIDATION_ERROR` | Toast, paper-clip stays enabled |
| File over 10 MB | 413 | `FILE_TOO_LARGE` | Toast, paper-clip stays enabled |
| Disallowed MIME/signature | 415 | `UNSUPPORTED_FILE_TYPE` | Toast, paper-clip stays enabled |
| Caller not a conversation member | 403 | `FORBIDDEN` | Toast |
| Conversation in another tenant | 404 | `NOT_FOUND` | **Disables attachments for the session** — see [CH3](#ch3-attachment-error-statuses-must-not-soft-disable-the-feature) |
| Storage write failed | 502/500 | `STORAGE_UNAVAILABLE` | Toast, retry allowed |
| Response omits both URL and key | — | — | Client throws and drops the file rather than sending a dead message |

Removable once shipped: the URL/key alias tables, the nested-envelope flattening,
and the `isServerStoredAttachment()` pre-send guard.

---

## CH2. Attachment serving and auth model

**Status: `PARTIAL` — needs an explicit decision, not just an implementation.**

### What the client does today

The web client cannot render a tenant-authorized image through a plain
`<img src>`, because the browser will not attach the bearer token. So
`ChatAttachmentView.jsx` fetches any API-hosted file itself with
`Authorization: Bearer …` + `X-Tenant-Slug` and renders the response as an object
URL. The fetch is now made up front for images rather than only after an
`<img>` error, because the error path cost every image a guaranteed-failed request
first.

A **relative** attachment path is ambiguous: it can be rooted at the host
(`/uploads/chat/3_kids.png`) or under the API prefix
(`/chat/attachments/att-1/download` returned by an `/api/v1` route), and nothing in
the response says which. Joining it to the API *origin* silently drops `/api/v1`
and 404s. `attachmentUrlCandidates()` therefore builds every plausible absolute URL
and the component probes them in order, then falls back to the signed-URL endpoint,
then to one plain `<img>` attempt in case cross-origin rules blocked the fetch on a
file the browser could have loaded itself. Responses are also content-type checked:
a single-page-app host answers an unknown path with `index.html` and an API answers
a rejected download with JSON, both as `200 OK`, and either one previously became a
"successfully fetched" broken image.

When the payload carried only a key, the client resolves it through the documents
module — `getDocumentDownloadUrl(fileKey)` → `GET /documents/{fileKey}/download`,
reading `downloadUrl` or `url` off the response — and each `/`-separated segment of
the key is URL-encoded individually, so the route must accept a multi-segment key
path.

Images open in a lightbox (`ChatAttachmentLightbox.jsx`) with download and
open-in-new-tab actions; PDFs resolve on demand and render in an iframe. Non-previewable
types show name, size and download only.

**Mobile has no equivalent escape hatch.** `MessageBubble.tsx` renders
`<Image source={{ uri }} />`, which cannot send an `Authorization` header at all.
If attachment URLs require header auth, image attachments will **never** render
on mobile — they silently fall back to a file card.

### Expected backend behavior

Choose one model and state it in the contract:

| Model | Works on web | Works on mobile | Notes |
|-------|--------------|-----------------|-------|
| **Short-lived signed URL** (token in the query string) | Yes, directly in `<img>` | Yes | **Recommended.** No client auth plumbing; expire in 5–15 minutes and return `expiresAt` |
| Header-authenticated API path (`/chat/attachments/{id}`) | Only via the authenticated-fetch retry | **No** | Requires a mobile blob/base64 workaround that does not exist today |
| Public URL | Yes | Yes | Unacceptable: attachments are student data and must not be world-readable |

If signed URLs are chosen:

```text
GET /chat/conversations/{conversationId}/attachments/{attachmentId}/download
  → 302 to a signed storage URL, or { "downloadUrl": "https://…", "expiresAt": "…" }
GET /documents/{fileKey}/download
  → { "downloadUrl": "https://…", "expiresAt": "…" }   (already called by the web client)
```

Rules:

1. A signed URL must be scoped to one attachment and must not be guessable from
   the attachment id.
2. Authorize at issue time: conversation membership plus tenant. Do not rely on
   the URL being secret as the only control.
3. `GET /documents/{fileKey}/download` must accept slash-containing keys with
   each segment percent-encoded, and must return `downloadUrl` (the client also
   accepts `url`).
4. Serve with `Content-Type` from the stored object and
   `Content-Disposition: attachment; filename="…"` for non-images, so the
   download name is right without client patching.
5. If header auth is kept, say so explicitly in the contract and accept that
   mobile image previews stay broken until a mobile-side fetch-to-base64 path is
   built.
6. **Return an absolute URL, or a path that already includes the API prefix.** A
   bare relative path forces the client to guess the base and issue up to three
   probe requests per attachment. `https://…/api/v1/chat/attachments/att-1/download`
   or `/api/v1/chat/attachments/att-1/download` are both unambiguous;
   `/chat/attachments/att-1/download` is not.
7. Never answer a download route with `text/html` or a JSON error body under
   `200 OK`. Use the real status code, so an expired or unauthorized file is
   distinguishable from a file that is simply not an image.

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| Signed URL expired | 403 | Client re-resolves from `fileKey`; without a key it shows "This file is no longer available" |
| Caller not a conversation member | 403 | No file, no leak of existence |
| Attachment id not in tenant | 404 | `NOT_FOUND` |
| Key not found in storage | 404 | Client renders the broken-file card |

Removable once shipped: the authenticated fetch and object-URL juggling in
`ChatAttachmentView.jsx`, the `isApiHostedUrl()` branch on download, the
multi-base probing in `attachmentUrlCandidates()`, and the content-type sniffing
guard.

---

## CH3. Attachment error statuses must not soft-disable the feature

**Status: `PARTIAL` — a contract rule, cheap to honour.**

### What the client does today

`chatService.js` wraps advanced chat calls in `withFeatureSupport()`. Any
`404`, `405` or `501` calls `markFeatureUnavailable(feature)`, which flips a
module-level flag:

```js
function isUnsupportedApiError(error) {
  return error instanceof ApiError && [404, 405, 501].includes(error.status);
}
```

Once that flag is off, the paper-clip (or edit / delete / reactions) disappears
for the **rest of the session** — there is no re-probe. The intent is graceful
degradation against servers that never implemented the route.

### Expected backend behavior

1. Reserve `404`, `405` and `501` for *"this route genuinely does not exist"*.
2. Return per-request failures with a status that does **not** imply the feature
   is missing: `400` validation, `413` too large, `415` wrong type, `403`
   membership, `409` conflict, `422` semantic, `500`/`502` server-side.
3. In particular, do not return `404` for a conversation the caller cannot see on
   the attachment route — that permanently hides attachments for that user's
   session. Use `403` when the conversation exists but is not the caller's, and
   reserve `404` for cross-tenant records.
4. If a feature is intentionally disabled per tenant, prefer advertising it
   (a capability flag on `GET /chat/conversations` or a config endpoint) over
   letting the client discover it by failure.

Removable once shipped: nothing on the client — but this is what makes the
existing soft-disable behave correctly instead of hiding working features.

---

## CH4. Send message must echo attachments

**Status: `PARTIAL`.**

### What the client does today

`sendMessage()` posts the documented `{ text }` when there are no files, and
`{ text, attachments: [...] }` when there are. The attachment objects are the
**normalized client shape** (`{ id, name, mimeType, size, url, fileKey }`), not
just ids. The clients then patch the response:

```js
// Some servers persist attachments but echo the message without them.
if (outgoing.length && !message?.attachments?.length) {
  return { ...message, attachments: outgoing };
}
```

So a message can render correctly for the sender and be attachment-less for
everyone else, and attachment-less after a reload.

### Expected backend behavior

```text
POST /chat/conversations/{conversationId}/messages
{ "text": "Please see the report", "attachments": [ { "id": "att-123" } ] }
```

1. Accept the inline attachment objects the clients already send. Trust only the
   `id` (or `fileKey`); re-resolve `name`, `mimeType`, `size` and `url` from
   storage and ignore client-supplied values.
2. Reject an attachment id that was not uploaded to **this** conversation by
   **this** user: `409 CHAT_ATTACHMENT_NOT_IN_CONVERSATION`.
3. The response must be the persisted message including a fully populated
   `attachments[]` array, in the [CH1](#ch1-attachment-upload-response-must-have-one-canonical-key)
   shape:

```json
{
  "success": true,
  "data": {
    "id": "msg-991",
    "conversationId": "conv-12",
    "senderId": "usr-teacher-3",
    "text": "Please see the report",
    "sentAt": "2026-08-13T09:14:03Z",
    "attachments": [
      {
        "id": "att-123",
        "name": "progress-report.pdf",
        "mimeType": "application/pdf",
        "size": 48231,
        "url": "https://…",
        "fileKey": "tenant-a/chat/att-123.pdf"
      }
    ]
  }
}
```

4. `GET /chat/conversations/{id}/messages` must return the same `attachments[]`
   for historical messages. Accepting `attachments` on write while dropping them
   on read is the current worst case.
5. An attachment-only message (empty `text`) is valid and must not be rejected.
   The clients render `attachmentPreviewText()` — `"3 attachments"` or the file
   name — as the conversation preview, so `lastMessage` should carry an
   equivalent server-side preview rather than an empty string.
6. Emit `message:new` on the conversation topic with the same attachment array.

### Error cases

| Condition | HTTP | Code |
|-----------|------|------|
| Empty `text` and no attachments | 400 | `VALIDATION_ERROR` |
| Attachment id unknown or from another conversation | 409 | `CHAT_ATTACHMENT_NOT_IN_CONVERSATION` |
| Caller lacks `SEND_MESSAGES` | 403 | `FORBIDDEN` |
| Conversation not a member's | 403 | `FORBIDDEN` |

Removable once shipped: the "echo the attachments back myself" patch in both
`chatService.js` and mobile `chatApi.ts`.

---

## CH5. Unread counts

**Status: `PARTIAL` — the badge is currently wrong.**

### The observed bug

The sidebar `Messages` badge showed **2** on an inbox with nothing unread.

### Why, in client terms

`GET /chat/conversations` does not reliably return a per-user unread count or a
per-user read receipt. `getConversationUnread()` (`src/utils/chatUnread.js`)
therefore falls through a long chain — `unread[userId]`, `unreadCounts[userId]`,
`participantUnread[userId]`, `unreadCount`, `myUnreadCount`, `unreadForMe`,
`unreadMessages`, `unreadMessageCount`, `hasUnread`, `isUnread` — and when none
of those exist it ends in a **heuristic**:

```js
const lastSender = extractLastMessageSenderId(conv);
if (lastSender && String(lastSender) !== String(userId) && lastAt) {
  const userReadAt = lookupReadAt(conv, userId);
  if (!userReadAt) return 1;      // ← guesses 1 unread per conversation
  …
}
```

Two conversations whose last message came from the other party, with no read
receipt echoed by the API, therefore produce exactly the observed `2`.

`useUnreadMessageCount()` then makes it worse by combining three independently
derived numbers and taking the largest:

```js
const fetchedTotal = sumConversationUnread(conversations, user?.id);
const combined = Math.max(fetchedTotal, liveTotal);
if (Number.isFinite(serverTotal) && serverTotal > combined) return serverTotal;
return combined;
```

so any single over-reporting source wins. `getTotalUnreadChatCount()` also
accepts four different `/chat/unread-count` shapes (bare number, `{ count }`,
`{ total }`, `{ unreadCount }`), which makes it impossible to tell a
message count from a conversation count.

A local read cursor was added to compensate — `src/utils/localChatRead.js`
stores per-user, per-conversation `readUpTo` timestamps in `localStorage` and
exposes `getEffectiveConversationUnread()` / `sumEffectiveConversationUnread()`.
**It is not wired into the sidebar yet** (the frontend fix was aborted mid-way),
and `src/utils/chatUnread.test.js` currently has **2 failing tests**:
*"clears unread when the API reports an explicit zero"* (expects 0, gets 4) and
*"keeps a locally read conversation at zero when a refresh omits unread fields"*
(expects 0, gets 1). Both failures are the same root cause: without a
server-provided read state the merge cannot distinguish "read" from "unknown".

### Expected backend behavior

The badge must count **unread messages**, tenant- and role-scoped, and the server
must own that number.

1. `GET /chat/conversations` returns, per conversation, for the **calling user**:

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `unreadCount` | integer ≥ 0 | yes | Unread **messages** for the caller in this conversation. `0` must be sent explicitly, never omitted |
| `lastReadAt` | ISO-8601 \| null | yes | When the caller last read this conversation |
| `lastMessageAt` | ISO-8601 | yes | Already sent |
| `lastMessageSenderId` | id | yes | Already sent; needed to exclude own messages |

Use a single scalar `unreadCount` for the caller. Do **not** return a
participant-keyed map (`unread: { userId: n }`) — that leaks other participants'
read state and is the reason the client has three map lookups.

2. `GET /chat/unread-count` returns one total, in one shape:

```json
{ "success": true, "data": { "unreadCount": 3 } }
```

It must equal the sum of the per-conversation `unreadCount` values for the same
caller at the same moment. Two sources that can disagree are the reason the
client takes a `Math.max`.

3. Counting rules:
   - count **messages**, not conversations;
   - **exclude the caller's own messages** — a thread where the caller sent the
     last message is never unread;
   - exclude soft-deleted messages;
   - scope to the caller's tenant and to conversations the caller is a member of;
     role does not widen this. `VIEW_ALL_CHAT` must not inflate a support/admin
     user's badge with school-wide conversations they never opened.

4. `POST /chat/conversations/{id}/read` must **clear the count server-side** and
   be reflected on the very next `GET /chat/conversations`:

```text
POST /chat/conversations/{conversationId}/read
{ "readUpToMessageId": "msg-991" }        // optional; default = latest
→ { "success": true, "data": { "conversationId": "conv-12", "unreadCount": 0, "lastReadAt": "2026-08-13T09:15:00Z" } }
```

Returning the new count in the response lets the client stop guessing. The call
must be idempotent, and it must also fire the `conversation:read` socket event so
the other device/tab and the sender's read ticks update.

5. The STOMP publish `/app/chat/read` must have exactly the same effect as the
   REST call, not a weaker one.

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| Conversation not a member's | 403 | `FORBIDDEN` |
| Conversation in another tenant | 404 | `NOT_FOUND` |
| `readUpToMessageId` not in the conversation | 400 | `VALIDATION_ERROR` |
| Already read | 200 | Idempotent, `unreadCount: 0` |
| `/chat/unread-count` not implemented | 404 | Client falls back to summing conversations (current behavior) |

Removable once shipped: the alias chain and the last-sender heuristic in
`getConversationUnread()`, the `Math.max` of three sources in
`useUnreadMessageCount()`, the four accepted `/chat/unread-count` shapes, and
`src/utils/localChatRead.js` entirely. The two failing tests in
`chatUnread.test.js` should be rewritten against the server contract rather than
against the heuristic.

---

## CH6. Persisted read receipts on messages

**Status: `NEEDED`.**

### What the client does today

The "seen" tick is computed only from a live socket frame. `ChatPage.jsx`:

```js
function applyReadReceipt(messages, readerId, readAt, currentUserId) {
  if (!readAt || readerId === currentUserId) return messages;
  const readTime = new Date(readAt).getTime();
  return messages.map((m) => (
    m.senderId === currentUserId && new Date(m.sentAt).getTime() <= readTime
      ? { ...m, seen: true }
      : m
  ));
}
```

`seen` is never persisted and never returned by REST. Reload the page and every
tick reverts to "sent", even for messages the recipient read days ago. There is
also no way to ask *"has this message been read?"* over HTTP.

### Expected backend behavior

1. `GET /chat/conversations/{id}/messages` returns read state per message:

```json
{
  "id": "msg-991",
  "senderId": "usr-teacher-3",
  "text": "Please see the report",
  "sentAt": "2026-08-13T09:14:03Z",
  "deliveredAt": "2026-08-13T09:14:03Z",
  "readAt": "2026-08-13T09:15:10Z",
  "readBy": ["usr-parent-7"]
}
```

For a two-party conversation, `readAt` alone is enough; `readBy` matters if group
conversations are introduced. Only the **sender** needs read state for their own
messages.

2. Alternatively (cheaper), return the other participant's read cursor on the
   conversation and let the client compare timestamps — but then it must be on
   `GET /chat/conversations` **and** on the messages payload's `meta`, not only in
   the socket event:

```json
{ "meta": { "participantReadAt": { "usr-parent-7": "2026-08-13T09:15:10Z" } } }
```

3. The `conversation:read` socket event must carry `conversationId`, `userId` and
   `readAt` — the client reads all three and drops the frame without `readAt`.

### Error cases

| Condition | HTTP | Behavior |
|-----------|------|----------|
| Caller is not the sender | 200 | Omit read state rather than 403 |
| Read state not tracked yet | 200 | `readAt: null`; client shows a single tick |

Removable once shipped: nothing is removed, but the ticks stop lying after a
reload.

---

## CH7. Realtime transport and event payloads

**Status: `PARTIAL`.**

### What the client does today

`src/services/chatRealtime.js` connects with STOMP over **SockJS**, and the
transport list is pinned to `xhr-polling` only:

```js
webSocketFactory: () =>
  new SockJS(getChatSocketUrl(), null, { transports: ['xhr-polling'] }),
```

The comment records why: *"Edge proxy strips Upgrade and buffers long-lived
streams — xhr-polling only."* So chat realtime is running on long-polling in
production, which costs latency and connections.

Handshake details the backend must keep supporting:

- URL: `{API_BASE_URL without /api/v1}/api/v1/ws/chat?X-Tenant-Slug={slug}` —
  the tenant travels as a **query parameter named after the tenant header**,
  because SockJS cannot set headers on the handshake.
- Auth: `Authorization: Bearer …` and `X-Tenant-Slug` are sent as **STOMP CONNECT
  headers**, refreshed on every CONNECT (`beforeConnect`) so reconnects after the
  15-minute access-token TTL succeed.
- Reconnect: 5 s fixed delay; subscriptions are re-bound in `onConnect`.

### Expected backend behavior

1. **Allow a native WebSocket upgrade** through the edge for
   `/api/v1/ws/chat` (do not strip `Upgrade`/`Connection`, do not buffer). Once
   confirmed, the client can drop the `transports: ['xhr-polling']` pin.
2. Accept the tenant on the handshake **query string** as well as on the CONNECT
   frame, and reject a handshake whose CONNECT lacks a valid token — do not fall
   back to an unauthenticated session.
3. Document the exact server → client payloads. The client switches on
   `payload.event` and needs these fields:

| Event | Required payload |
|-------|------------------|
| `message:new` | `{ event, conversationId, message: { id, senderId, text, sentAt, attachments[] } }` |
| `message:updated` | `{ event, conversationId, message: { id, text, editedAt } }` |
| `message:deleted` | `{ event, conversationId, messageId }` (or the soft-deleted message) |
| `message:reaction` | `{ event, conversationId, messageId, reactions: { "<emoji>": ["usr-1"] } }` — keyed by the emoji character itself |
| `conversation:read` | `{ event, conversationId, userId, readAt }` — all three required |
| `typing` | `{ event, conversationId, userId, isTyping }`; expire server-side after ~3 s |
| `presence:update` | `{ event, conversationId, userId, status: "online"\|"away"\|"offline", lastSeenAt }` |

4. `message:new` must be delivered to **every** participant's subscription,
   including the sender's other devices, and must carry `attachments[]`
   ([CH4](#ch4-send-message-must-echo-attachments)).
5. A conversation-level unread signal on the socket would let the sidebar stop
   polling every 20 seconds (`useUnreadMessageCount` runs a 20 s interval off the
   chat route, 60 s on it). Optional, but that polling exists only because the
   badge cannot trust a push.
6. `presence:update` must be derived from authenticated connections server-side;
   the client's `/app/chat/presence` publish is a hint, not a source of truth.

### Error cases

| Condition | Behavior |
|-----------|----------|
| CONNECT without a valid token | Reject the STOMP CONNECT with an ERROR frame; client clears `connectPromise` and retries |
| Subscribe to a conversation the caller is not in | ERROR frame or silently no frames — never another conversation's messages |
| Token expires mid-session | Client refreshes and re-CONNECTs; server must accept the new token on the same SockJS session or force a clean reconnect |
| Malformed JSON frame | Client ignores it silently |

Removable once shipped: the `xhr-polling` transport pin.

---

## CH8. Edit, delete and reaction semantics

**Status: `NEEDED` — all three soft-disable on 404/405/501 today.**

### What the client does today

- **Edit:** `PATCH …/messages/{messageId}` with `{ text }`. Sender only, enforced
  in the UI. The client expects the updated message back and sets `editedAt`.
- **Delete:** `DELETE …/messages/{messageId}`. The client optimistically renders
  a **soft delete** — `{ deleted: true, text: '', attachments: [], reactions: {} }`
  — and supports multi-select deletion, so several ids can be deleted in quick
  succession.
- **Reactions:** `POST …/messages/{messageId}/reactions` with
  **`{ emoji, replace: true }`**. The documented contract is `{ emoji }` only.
  `replace: true` is the web client asking for *one reaction per user*: adding an
  emoji removes that user from every other emoji, and clicking the same emoji
  again clears it. Mobile sends `{ emoji }` without `replace`.

### Expected backend behavior

1. Edit: sender-only, `403` otherwise. Return the full updated message with
   `editedAt`. Emit `message:updated`.
2. Delete: **soft delete**. Keep the row, clear `text`, `attachments` and
   `reactions`, set `deleted: true` and `deletedAt`. Emit `message:deleted`.
   Sender-only unless a moderation permission is added. Deleting an
   already-deleted message is idempotent (`200`), not `409` — the multi-select
   flow can repeat an id.
3. Reactions: implement `replace` (default `true` if omitted, matching the web
   client's one-reaction-per-user model, and harmless for mobile's `{ emoji }`).
   Return the message with the full `reactions` map so the client does not have to
   reconcile. Emit `message:reaction`.
4. Deleting a message must also delete or orphan its stored attachments, so a
   previously shared file stops resolving.

### Error cases

| Condition | HTTP | Code |
|-----------|------|------|
| Caller is not the sender | 403 | `FORBIDDEN` |
| Message already deleted (edit) | 409 | `CHAT_MESSAGE_DELETED` |
| Message already deleted (delete) | 200 | Idempotent |
| Empty `text` on edit | 400 | `VALIDATION_ERROR` |
| Unsupported emoji | 400 | `VALIDATION_ERROR` |
| Route not implemented | 404/405/501 | Client hides the feature for the session — see [CH3](#ch3-attachment-error-statuses-must-not-soft-disable-the-feature) |

---

# 4. Client workarounds that become removable

| Requirement | Workaround to delete | File |
|-------------|----------------------|------|
| [C1](#c1-certificate-only-on-pass) | `keepEarnedCertificates()` / `isFailedEnrollment()` defensive filter | `src/utils/lmsEnrollmentOutcome.js` |
| [C2](#c2-certificate-list--detail-must-carry-display-fields) | ~15 field aliases, `isDisplayableCertNumber`, placeholder blanking, re-fetch in `resolveCertificate()` | `src/utils/courseCertificateFields.js`, mobile `src/utils/lmsCertificate.ts` |
| [C3](#c3-parent-scoping-for-my-learning-and-certificates) | 5-step parent fallback chain, `hydrateCertificatesWithChildren()` | `src/services/lmsService.js` |
| [C4](#c4-quiz-submit-response-must-be-self-describing) | Score/percentage reconstruction, 60 % pass-mark default, `attemptsRemaining` guess | `src/utils/lmsQuizScoring.js`, mobile `src/utils/lmsQuiz.ts` |
| [L1](#l1-any-accepted-ping-means-running) | `running` override on fresh coordinates; omitting `speed` below 0.5 km/h | mobile `normalizeFleetVehicle()`, `DriverLocationPublisher.buildPayload()` |
| [L2](#l2-do-not-reject-pings-for-stale-client-timestamps) | Client timestamp rewriting before ingest | mobile `DriverLocationPublisher.buildPayload()` |
| [L3](#l3-live-location-payload-fields) | 3–5 aliases per field in the live normalizers; straight-line `resolveRouteLine()` | `transportRouteGeo`, live snapshot normalizers |
| [L4](#l4-stop-roster-endpoint--assignment-fallback) | 5-path roster fan-out and client-side re-filtering of assignments | `trackingApi.js`, mobile `transportApi.ts` |
| [L5](#l5-student-home-derived-stops-must-resolve-their-student) | `studentIdFromStop()` `stu-` prefix parsing, `studentHomeStopRoster()` | `src/utils/transportRouteGeo.js` / `.ts` |
| [L9](#l9-driver-readable-student-lookup) | Stop label used as the student name; home-stop rows forced to `Pending` | driver stop sheet |
| [L10](#l10-parent-live-snapshot-needs-direction-and-assignedstopid) | Pickup-direction default; name-based stop matching | parent live screens |
| [L11](#l11-parent-scoped-stop-roster) | Client-side merge of live snapshot + per-child status + linked children; `academic.className` with `—` | parent transport list |
| [CH1](#ch1-attachment-upload-response-must-have-one-canonical-key) | URL/key alias tables, envelope flattening, `isServerStoredAttachment()` pre-send guard | `src/utils/chatAttachments.js`, mobile `src/utils/chatAttachments.ts` |
| [CH2](#ch2-attachment-serving-and-auth-model) | Authenticated-fetch to object URL, multi-base URL probing (`attachmentUrlCandidates()`), HTML/JSON content-type sniffing, `isApiHostedUrl()` download branch | `src/components/chat/ChatAttachmentView.jsx`, `src/utils/chatAttachments.js` |
| [CH4](#ch4-send-message-must-echo-attachments) | "Echo the attachments back myself" patch after send | `src/services/chatService.js`, mobile `src/api/chatApi.ts` |
| [CH5](#ch5-unread-counts) | Unread alias chain, last-sender heuristic, `Math.max` of three sources, four `/chat/unread-count` shapes, whole of `localChatRead.js` | `src/utils/chatUnread.js`, `src/hooks/useUnreadMessageCount.js`, `src/utils/localChatRead.js` |
| [CH7](#ch7-realtime-transport-and-event-payloads) | `transports: ['xhr-polling']` pin; 20 s sidebar unread poll | `src/services/chatRealtime.js`, `src/hooks/useUnreadMessageCount.js` |

---

# 5. Acceptance checklist

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
- [ ] A signed-in driver can resolve the student behind a `stu-{studentId}` stop and sees a real name and class, not the stop label ([L9](#l9-driver-readable-student-lookup))
- [ ] A driver's home-stop row shows the student's actual pickup status, not a forced `Pending` ([L9](#l9-driver-readable-student-lookup))
- [ ] `GET /parent/transport/live` returns `direction` and `assignedStopId`, and an evening trip is labelled as a drop-off ([L10](#l10-parent-live-snapshot-needs-direction-and-assignedstopid))
- [ ] Renaming a stop does not break the parent's "your stop" marker ([L10](#l10-parent-live-snapshot-needs-direction-and-assignedstopid))
- [ ] `GET /parent/transport/trips/{tripId}/stops/{stopId}/students` returns only the caller's children, with a real `className` ([L11](#l11-parent-scoped-stop-roster))
- [ ] `GET /admin/transport/assignments?studentId=&stopId=` returns only matching rows — the filters are applied in the query, not by the client ([L4](#l4-stop-roster-endpoint--assignment-fallback))

Chat:

- [ ] `POST /chat/conversations/{id}/attachments` returns `url` populated on every success, and `url` is never a `data:` or `blob:` value
- [ ] Uploading a 12 MB file returns `413`, and the paper-clip is still enabled afterwards
- [ ] Uploading a `.exe` renamed to `.pdf` returns `415` (signature checked, not just the extension)
- [ ] A conversation the caller is not a member of returns `403` on the attachment route, not `404`
- [ ] `url` is absolute, or a path that already includes the `/api/v1` prefix — never a bare path whose base has to be guessed
- [ ] A download route never returns `text/html` or a JSON error body with status `200`
- [ ] An image attachment renders inline on **mobile** without any client-side auth plumbing
- [ ] A file link still resolves after a page reload, and after the original signed URL has expired
- [ ] `POST /chat/conversations/{id}/messages` with `attachments` returns the persisted message with a fully populated `attachments[]`
- [ ] `GET /chat/conversations/{id}/messages` returns `attachments[]` for historical messages
- [ ] An attachment-only message (empty `text`) is accepted and its conversation preview is not blank
- [ ] An attachment id from another conversation is rejected with `409`
- [ ] `GET /chat/conversations` returns an explicit `unreadCount` (including `0`) and `lastReadAt` for the caller
- [ ] `GET /chat/unread-count` equals the sum of per-conversation `unreadCount` for the same caller
- [ ] A thread where the caller sent the last message reports `unreadCount: 0`
- [ ] Sending two messages to a user raises their badge by exactly `2`, not by conversation count
- [ ] `POST /chat/conversations/{id}/read` returns `unreadCount: 0` and the next `GET /chat/conversations` agrees
- [ ] `/app/chat/read` over STOMP clears unread identically to the REST call
- [ ] A support user with `VIEW_ALL_CHAT` does not get school-wide conversations counted in their badge
- [ ] Read ticks survive a page reload (`readAt` present on the sender's own messages)
- [ ] `conversation:read` frames carry `conversationId`, `userId` **and** `readAt`
- [ ] `/api/v1/ws/chat` completes a native WebSocket upgrade through the edge proxy without SockJS long-polling
- [ ] A STOMP CONNECT without a valid token is rejected rather than downgraded to an anonymous session
- [ ] Deleting an already-deleted message returns `200`, and a deleted message's attachments stop resolving
- [ ] Reacting twice with the same emoji clears the reaction; reacting with a second emoji replaces the first

---

*Written from client code on 13 August 2026. Sections 1 and 2 carry forward
`courseAndLocation.md`; section 3 was added from `chatService.js`,
`chatAttachments.js`, `chatUnread.js`, `chatRealtime.js`, `ChatPage.jsx` and the
mobile chat client. When an item ships, mark it `IMPLEMENTED` here and remove the
matching client fallback listed in section 4.*
