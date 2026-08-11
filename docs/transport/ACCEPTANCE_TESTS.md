# Live Bus Tracking — Acceptance Tests (Frontend + Backend)

Date: 11 August 2026  
API: `https://kidsbackend.snssystem.com/api/v1`  
Contract: [`DRIVER_ASSIGNMENT_LIVE_API.md`](./DRIVER_ASSIGNMENT_LIVE_API.md)

## Preconditions

- Tenant slug + admin JWT work against production/staging Spring Boot.
- No UI fake GPS; markers move only after real ingest.

## A. Admin driver → vehicle → assignment

| # | Step | Expected |
|---|------|----------|
| A1 | Web → Transport Drivers → Add driver | Account created; temp password shown once; `role=driver` |
| A2 | Transport Vehicles → assign `driverUserId` + `routeId` | Vehicle stores IDs only; driver name resolved on read |
| A3 | Transport Routes → ordered stops with lat/lng | Map path available |
| A4 | Student Bus Assignments → class/student/route/stop/vehicle/direction | Saves `classId`,`studentId`,`routeId`,`stopId`,`vehicleId`,`direction` |

## B. Driver trip auto-track

| # | Step | Expected |
|---|------|----------|
| B1 | Driver mobile login | Lands on Driver Tabs → Trip |
| B2 | `GET /driver/transport/current-trip` | Returns assigned vehicle (no hard-coded IDs) |
| B3 | Start trip & share location | `POST /tracking/trips/start` then GPS → `/tracking/update-location` |
| B4 | Airplane mode briefly then online | Offline queue flushes; no null-island posts |

## C. Parent multi-child live

| # | Step | Expected |
|---|------|----------|
| C1 | Parent with 2 children | Child selector visible (web + mobile) |
| C2 | Select assigned child | `GET /parent/transport/live?studentId=` scoped correctly |
| C3 | During active trip + GPS | State `LIVE` / `WAITING_FOR_GPS` then bus marker matches driver coords |
| C4 | Unassigned child | `NO_ASSIGNMENT` empty state — no other child's bus |

## D. Admin fleet + security

| # | Step | Expected |
|---|------|----------|
| D1 | Admin Live Bus Tracking | Fleet shows vehicle with same location |
| D2 | Teacher JWT | No automatic fleet live access |
| D3 | Driver JWT calling another vehicle ingest | 403 |
| D4 | Parent JWT requesting non-linked studentId | 403 / empty |

## E. GPS device path (optional hardware)

| # | Step | Expected |
|---|------|----------|
| E1 | GpsDeviceSetupModal register | Token shown once |
| E2 | `tools/gps-simulator/simulate.mjs` with token | Points accepted; parent/admin maps move |
| E3 | Re-open modal | Token not recoverable (hash only) |

## F. Blocked without Spring

If any of A1–C3 fail with 404 on contract paths, treat as **backend not deployed** — do not add client-side fake movement.
