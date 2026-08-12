# MASTER Live Bus Tracking API — Frontend Integration Contract

Date: 11 August 2026  
Scope: Kids Activities **Web** + **Mobile (Expo)** frontends  
API base: `{API_BASE}/api/v1`  
Auth headers (JWT calls): `Authorization: Bearer {jwt}`, `X-Tenant-Slug: {schoolSlug}`  
Device ingest: `X-Device-Token: {plaintext}` (no JWT)

Related docs:

- [`LIVE_BUS_TRACKING.md`](./LIVE_BUS_TRACKING.md) — Spring Boot entity / package guidance
- [`DRIVER_ASSIGNMENT_LIVE_API.md`](./DRIVER_ASSIGNMENT_LIVE_API.md) — relationship + acceptance criteria
- [`LIVE_TRACKING.md`](./LIVE_TRACKING.md) — operator / parent how-to
- Mobile mirror: `mobile/LIVE_TRACKING.md`

**Status legend**

| Status | Meaning |
|--------|---------|
| `EXISTING` | Backend already serves this in production for some tenants (soft-fail on 404 where noted) |
| `FRONTEND READY` | Web/Mobile clients call this path; integrate without redesign |
| `BACKEND REQUIRED` | Frontend ready; Spring Boot must implement / finish |

Frontend fixture mode (DEV ONLY):

- Web: `VITE_TRANSPORT_API_MODE=fixture` (ignored in production builds)
- Mobile: `EXPO_PUBLIC_TRANSPORT_API_MODE=fixture` (ignored when not `__DEV__`)

---

## 1. Shared models

| Model | Key fields | Frontend |
|-------|------------|----------|
| Student | `id` (never free-text name as key) | Class→student pickers |
| Vehicle | `id`, `vehicleNumber`, `capacity`, `driverUserId`, `routeId`, `status` | Web vehicles / drivers pages; mobile list |
| Route | `id`, `name`, `stops[]`, `geometry?`, `morningStart`, `eveningStart` | Route manage + live maps |
| Stop | `id`, `name`, `sequence`, `lat`, `lng`, `radiusMeters`, `stopType` (`pickup`/`school`/`dropoff`) | Route editor + assignments |
| Assignment | `id`, `classId`, `studentId`, `routeId`, `stopId`, `vehicleId`, `direction` (`morning`/`evening`/`both`), `status` | Assignments UI (IDs only on write) |
| Trip | `id`, `vehicleId`, `routeId`, `driverUserId`, `direction`, `status`, `startedAt`, `completedAt` | Driver trip + live |
| GPSDevice | `id`, `vehicleId`, `imei`, `provider`, `status`, one-time `deviceToken` | GpsDeviceSetupModal |
| Location | `lat`/`lng`, `speedKmh`, `heading`, `sequence`, `updatedAt`, `trackingStatus` | Maps + WS merge |
| ETA | `etaMinutes`, `nextStopName`, `lastStopName` | Parent/admin panels |
| ParentLive | snapshot + `stateCode` | Parent pages |
| AdminFleet | vehicle array | Admin live |
| TrackingStatus | `running` \| `stopped` \| `warning` \| `offline` \| `completed` | Filters + badges |
| TrackingUiState | `NO_ASSIGNMENT` … `COMPLETED` / `TRIP_COMPLETED` | `transportTrackingState` |
| StopAssignedStudent | `studentId`, names, class IDs, `pickup`/`dropoff` action blocks | Stop details + driver marks |
| StudentTripAttendance | separate pickup/dropoff + `parentApprovalStatus` | Parent approval + admin table |
| WS events | see §3 | sockets |

Web types: `src/types/transportModels.js` + `src/utils/transportStudentAttendance.js`  
Mobile types: `src/types/erp.ts` + `src/api/transportApi.ts` + `src/utils/transportStudentAttendance.ts`

---

## 2. REST APIs

### 2.1 Parent live

| Field | Value |
|-------|-------|
| Method / path | `GET /parent/transport/live?studentId={uuid}` |
| Role | `parent` |
| Auth | JWT + tenant |
| Request | Query `studentId` preferred when multiple children |
| Response | ParentLive snapshot (or soft empty) |
| Errors | `401`/`403` unauthorized; soft `404`/`null` → `NO_ASSIGNMENT` |
| Frontend fn | Web `fetchParentTransportLive`; Mobile `getTransportLiveTracking` |
| Consumers | `ParentTransportTrackingPage`; `TransportLiveScreen` (parent) |
| Status | **FRONTEND READY** / **BACKEND REQUIRED** (production path) |

`stateCode` values: `NO_ASSIGNMENT`, `ASSIGNED_NO_ACTIVE_TRIP`, `WAITING_FOR_GPS`, `LIVE`, `WARNING`, `OFFLINE`, `COMPLETED` (alias `TRIP_COMPLETED`).

### 2.2 Admin fleet live

| Field | Value |
|-------|-------|
| Method / path | `GET /admin/transport/live?status=all\|running\|stopped\|warning\|offline` |
| Role | `school_admin` / `super_admin` / `transport_manager` (not teacher by default) |
| Auth | JWT + tenant |
| Response | `AdminFleetVehicle[]` |
| Frontend fn | Web `fetchAdminFleetLive`; Mobile `getAdminTransportLive` |
| Consumers | `TransportLiveTrackingPage`; `TransportLiveScreen` (admin) |
| Status | **FRONTEND READY** / **BACKEND REQUIRED** |

### 2.3 Routes CRUD

| Method | Path | Frontend |
|--------|------|----------|
| GET | `/admin/transport/routes` | Web `transportRouteService.list`; Mobile `listTransportRoutes` |
| POST | `/admin/transport/routes` | Web create (stops with lat/lng/sequence/stopType) |
| PATCH | `/admin/transport/routes/{id}` | Web update + reorder |
| DELETE | `/admin/transport/routes/{id}` | Web delete |

Role: admin / transport_manager.  
Write body uses stop IDs + coords; no free-text student catalogs.  
Consumers: `TransportRoutesManagePage`, live maps.  
Status: **FRONTEND READY** (web full UI) / mobile **list-only** / **BACKEND REQUIRED** if not deployed.

### 2.4 Vehicles CRUD + driverUserId

| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/admin/transport/vehicles` | Includes `driverUserId`, `routeId` |
| PATCH | `/admin/transport/vehicles/{id}` | Set/clear `driverUserId` |
| PUT | `/admin/transport/vehicles/{id}/driver` | Optional convenience |

Frontend: Web `transportVehicleService` + `assignDriverToVehicle` / `clearVehicleDriver`.  
Mobile: `listTransportVehicles`.  
Consumers: `TransportPages` (vehicles), `TransportDriversPage`.  
Status: **FRONTEND READY** / **BACKEND REQUIRED**.

### 2.5 Student assignments CRUD (IDs only)

| Method | Path |
|--------|------|
| GET/POST | `/admin/transport/assignments` |
| PATCH/DELETE | `/admin/transport/assignments/{id}` |

Write body:

```json
{
  "classId": "uuid",
  "studentId": "uuid",
  "routeId": "uuid",
  "stopId": "uuid",
  "vehicleId": "uuid",
  "direction": "both",
  "status": "active"
}
```

`direction`: `morning` (PICKUP) | `evening` (DROPOFF) | `both`.  
**Forbidden on write:** `studentName` / `className` as relationship keys.

Frontend: Web `transportAssignmentService`; Mobile create/update/delete.  
Consumers: `TransportAssignmentsPage`; `TransportAssignmentsScreen`.  
Status: **FRONTEND READY** / **BACKEND REQUIRED**.

### 2.6 Drivers CRUD

| Method | Path | Frontend |
|--------|------|----------|
| GET | `/admin/transport/drivers` | `listDrivers` (fallback `/admin/users?role=driver`) |
| POST | `/admin/transport/drivers` | `createDriver` → may return `tempPassword` |
| PATCH | `/admin/transport/drivers/{id}` | `updateDriver` |
| PATCH | `/admin/transport/drivers/{id}/deactivate` | `deactivateDriver` |

Consumers: `TransportDriversPage`.  
Status: **FRONTEND READY** / **BACKEND REQUIRED** (fallback EXISTS via users API).

### 2.7 GPS devices

| Method | Path | Notes |
|--------|------|-------|
| GET | `/admin/transport/gps-devices` | List |
| POST | `/admin/transport/gps-devices` | Register; return plaintext `deviceToken` **once** |
| PATCH | `/admin/transport/gps-devices/{id}` | `{ status: "active" \| "disabled" }` |
| POST | `/admin/transport/gps-devices/{id}/rotate-token` | New plaintext token **once** |

Frontend: Web `listGpsDevices`, `registerGpsDevice`, `rotateGpsDeviceToken`, `enableGpsDevice`, `disableGpsDevice`; Mobile same names in `transportApi.ts`.  
Consumers: `GpsDeviceSetupModal` (register + manage).  
Status: **FRONTEND READY** / **BACKEND REQUIRED**.

### 2.8 Hardware GPS ingest

| Field | Value |
|-------|-------|
| Method / path | `POST /tracking/location` |
| Auth | `X-Device-Token` |
| Body | `imei`, `latitude`, `longitude`, `speed`, `direction`, `accuracy`, `timestamp`, `battery` |
| Frontend | Not called by app UI; documented curl in modal + `tools/gps-simulator` |
| Status | **FRONTEND READY** (client tooling) / **BACKEND REQUIRED** |

### 2.9 Driver publish location

| Field | Value |
|-------|-------|
| Method / path | `POST /tracking/update-location` |
| Role | `driver` (assigned vehicle + active trip) |
| Body | `vehicle_id`, `trip_id?`, `latitude`, `longitude`, `speed`, `heading`, `accuracy`, `timestamp` |
| Frontend fn | Web `publishDriverLocation` / `updateDriverLocation`; Mobile `publishDriverLocation` + `DriverLocationPublisher` |
| Consumers | Driver mobile publisher |
| Status | **FRONTEND READY** / **BACKEND REQUIRED** |

### 2.10 Trip lifecycle

| Method | Path | Frontend |
|--------|------|----------|
| POST | `/tracking/trips/start` | Web `startTransportTrip`; Mobile `startDriverTrip` / `startTransportTrip` |
| POST | `/tracking/trips/{tripId}/complete` | Web `completeTransportTrip`; Mobile `completeDriverTrip` / `completeTransportTrip` |
| GET | `/driver/transport/current-trip` | Web `fetchDriverCurrentTrip`; Mobile `getDriverCurrentTrip` (aliases: `/assignment`, `/me`) |
| GET | `/admin/transport/trips` | Web `fetchTripHistory`; Mobile `getTripHistory` |

Start body: `{ vehicle_id, route_id?, direction }`.  
Status: **FRONTEND READY** / **BACKEND REQUIRED**.

### 2.11 Trip stop students (Admin / Driver)

| Field | Value |
|-------|-------|
| Method / path | `GET /transport/trips/{tripId}/stops/{stopId}/students` |
| Role | `school_admin` / `transport_manager` / `driver` (own trip) |
| Auth | JWT + tenant |
| Path params | `tripId`, `stopId` (students keyed by **stopId**, never displaySequence) |
| Response | `{ tripId, stop: { stopId, stopName, displaySequence? }, students: StopAssignedStudent[] }` |
| Errors | `401`/`403`; soft `404` → empty students list |
| Frontend fn | Web/Mobile `getTripStopStudents(tripId, stopId)` |
| Consumers | Admin live stop modal; Driver stop sheet; **not** Parent (privacy) |
| Status | **FRONTEND READY** / **BACKEND REQUIRED** |

`StopAssignedStudent` includes `studentId`, `studentName`, optional `classId`/`className`, and separate `pickup` / `dropoff` action blocks (`status`, `markedAt`, `markedByDriverId`, `parentApprovalStatus`, `parentApprovedAt`).

### 2.12 Driver mark pickup

| Field | Value |
|-------|-------|
| Method / path | `POST /tracking/trips/{tripId}/students/{studentId}/pickup` |
| Role | `driver` (assigned trip) |
| Auth | JWT + tenant |
| Body | `{ stopId, status: "PICKED_UP"\|"NOT_PRESENT"\|"SKIPPED", deviceTimestamp }` |
| Response | `{ studentId, tripId, pickup: { status, stopId, markedAt, markedByDriverId, parentApprovalStatus } }` |
| Errors | see §7 transport codes (`TRANSPORT_PICKUP_ALREADY_MARKED`, …) |
| Frontend fn | Web/Mobile `markStudentPickup` |
| Consumers | Driver mobile stop sheet |
| Status | **FRONTEND READY** / **BACKEND REQUIRED** |

On `PICKED_UP`, backend should set `parentApprovalStatus: PENDING` and emit `transport.student_picked_up`.

### 2.13 Driver mark dropoff

| Field | Value |
|-------|-------|
| Method / path | `POST /tracking/trips/{tripId}/students/{studentId}/dropoff` |
| Role | `driver` |
| Auth | JWT + tenant |
| Body | `{ stopId, status: "DROPPED_OFF"\|"SKIPPED"?, deviceTimestamp }` |
| Response | `{ studentId, tripId, dropoff: { … } }` |
| Frontend fn | Web/Mobile `markStudentDropoff` |
| Consumers | Driver mobile stop sheet (evening / DROPOFF direction only) |
| Status | **FRONTEND READY** / **BACKEND REQUIRED** |

### 2.14 Parent student trip status

| Field | Value |
|-------|-------|
| Method / path | `GET /parent/transport/trips/{tripId}/students/{studentId}/status` |
| Role | `parent` (linked child only) |
| Auth | JWT + tenant |
| Response | `{ studentId, studentName, tripId, pickup?, dropoff?, timeline? }` |
| Errors | `403 TRANSPORT_PARENT_NOT_AUTHORIZED`; soft `404` → null |
| Frontend fn | Web/Mobile `getParentStudentTripStatus` |
| Consumers | Parent web/mobile live + approval card |
| Status | **FRONTEND READY** / **BACKEND REQUIRED** |

### 2.15 Parent pickup / dropoff approval

| Method | Path | Body |
|--------|------|------|
| POST | `/parent/transport/trips/{tripId}/students/{studentId}/pickup/approval` | `{ approved: true }` or `{ approved: false, reason?, comment? }` |
| POST | `/parent/transport/trips/{tripId}/students/{studentId}/dropoff/approval` | same |

Role: `parent` (linked child).  
Response keeps driver status intact and sets `parentApprovalStatus` to `APPROVED` / `REJECTED` + `parentApprovedAt`.  
Frontend: `approveStudentPickup` / `approveStudentDropoff`.  
WS: `transport.pickup_parent_approved|rejected`, `transport.dropoff_parent_approved|rejected`.  
Status: **FRONTEND READY** / **BACKEND REQUIRED**.

### 2.16 Admin trip student transport statuses (optional)

| Field | Value |
|-------|-------|
| Method / path | `GET /admin/transport/trips/{tripId}/student-transport-statuses` |
| Role | admin / transport_manager |
| Response | `StopAssignedStudent[]` (all students on trip) |
| Soft 404 | empty array |
| Frontend fn | Web/Mobile `getTripStudentTransportStatuses` |
| Consumers | Admin live status table |
| Status | **FRONTEND READY** / **BACKEND REQUIRED** |

Future correction (not implemented in UI):  
`PATCH /tracking/trips/{tripId}/students/{studentId}/transport-status` with audit — **BACKEND REQUIRED** later.

---

## 3. WebSocket

| Field | Value |
|-------|-------|
| URL | `ws(s)://{API_HOST}/ws/tracking?token={JWT}&vehicleId={optional}&tenant={slug}` |
| Frontend | Web `createTrackingSocket` / `getTrackingWebSocketUrl`; Mobile `createTrackingSocket` |
| Events | `vehicle.location_updated`, `vehicle.tracking_warning`, `vehicle.tracking_offline`, `transport.trip_started`, `transport.trip_completed`, geofence enter/leave, **`transport.student_picked_up`**, **`transport.student_dropped_off`**, **`transport.pickup_parent_approved`**, **`transport.pickup_parent_rejected`**, **`transport.dropoff_parent_approved`**, **`transport.dropoff_parent_rejected`** |
| Client rules | Ignore stale `sequence`/`updatedAt`; on reconnect (`connected` + `reconnect:true`) REST-resync snapshot; cleanup on unmount; **ignore unknown event types without crashing** |
| Status | **FRONTEND READY** / **BACKEND REQUIRED** |

Student event `data` includes: `tripId`, `studentId`, `studentName?`, `stopId`, `stopName?`, `status`, `parentApprovalStatus`, `markedAt`.

Optional future: `POST /tracking/ws-ticket` — **BACKEND REQUIRED** (clients keep JWT query today).

---

## 4. Frontend function map

| Capability | Web | Mobile |
|------------|-----|--------|
| Parent live | `fetchParentTransportLive` | `getTransportLiveTracking` |
| Admin live | `fetchAdminFleetLive` | `getAdminTransportLive` |
| Routes CRUD | `transportRouteService` | `listTransportRoutes` (list) |
| Vehicles CRUD | `transportVehicleService` | `listTransportVehicles` (list) |
| Assignments CRUD | `transportAssignmentService` | `list/create/update/deleteTransportAssignment` |
| Drivers | `driverService.js` | (admin web primary) |
| GPS devices | `trackingApi.js` | `transportApi.ts` GPS helpers |
| Trip start/complete | `startTransportTrip` / `completeTransportTrip` | `startDriverTrip` / `completeDriverTrip` |
| Current trip | `fetchDriverCurrentTrip` | `getDriverCurrentTrip` |
| Trip history | `fetchTripHistory` | `getTripHistory` |
| Publish GPS | `publishDriverLocation` | `DriverLocationPublisher` / `publishDriverLocation` |
| Stop students | `getTripStopStudents` | `getTripStopStudents` |
| Mark pickup/dropoff | `markStudentPickup` / `markStudentDropoff` | same |
| Parent child status | `getParentStudentTripStatus` | same |
| Parent approval | `approveStudentPickup` / `approveStudentDropoff` | same |
| Admin trip statuses | `getTripStudentTransportStatuses` | same |
| UI state | `transportTrackingState.js` | `transportTrackingState.ts` |
| Stale guard | `transportLocationSequence.js` | `transportLocationSequence.ts` |
| Attendance helpers | `utils/transportStudentAttendance.js` | `utils/transportStudentAttendance.ts` |

---

## 5. Screen readiness

| Screen | Platform | Status | Notes |
|--------|----------|--------|-------|
| Parent live tracking | Web | **COMPLETE** | Multi-child, states, road path, WS, stop tap (own children), pickup/dropoff approval |
| Admin live fleet | Web | **COMPLETE** | Filters, fleet map, stop students modal, trip status table, GPS modal |
| Route manage | Web | **COMPLETE** | Stops reorder, coords, school stop, preview |
| Vehicles + driverUserId | Web | **COMPLETE** | |
| Drivers page | Web | **COMPLETE** | |
| Student assignments | Web | **COMPLETE** | IDs-only write; PICKUP/DROPOFF labels |
| GPS device modal | Web | **COMPLETE** | Create + list/rotate/enable/disable; token once |
| Parent live | Mobile | **COMPLETE** | Child selector, states, WS, stop tap privacy, approval card |
| Admin fleet | Mobile | **COMPLETE** | Status filters, stop students sheet, stale+resync |
| Driver trip | Mobile | **COMPLETE** | GPS publisher + stop students pickup/dropoff marks + parent approval display |
| Driver tabs | Mobile | **COMPLETE** | |
| Transport assignments | Mobile | **COMPLETE** | Stop + direction; menu enabled |
| Trip history UI | Web/Mobile | **COMPLETE** | Web `/admin/transport/trips`; mobile admin live screen history section; soft-empty on 404 |
| Driver web landing | Web | **COMPLETE** | `/driver/trip` guides drivers to mobile GPS (no blank login redirect) |
| Fixture mode | Both | **COMPLETE** | DEV only (includes student attendance fixtures) |

Frontend is **ready for backend integration** using this document without redesign.

**Privacy (frontend enforced; backend must enforce):**

- Admin: all students on tenant trip/stop
- Driver: students on own active trip
- Parent: own linked children only — parent UI does **not** call stop-students admin/driver API

**Stop rotation:** `displaySequence` is display-only; student lists always load by `stopId`.

---

## 6. Backend-required API checklist

Implement / verify in Spring Boot:

1. `GET /parent/transport/live`
2. `GET /admin/transport/live`
3. Routes / vehicles / assignments CRUD under `/admin/transport/*`
4. Drivers CRUD `/admin/transport/drivers*` (or keep users fallback)
5. GPS devices register/list/patch/rotate + hashed token storage
6. `POST /tracking/location` (device token)
7. `POST /tracking/update-location` (driver JWT)
8. `POST /tracking/trips/start` + `.../complete`
9. `GET /driver/transport/current-trip`
10. WebSocket `/ws/tracking` with listed events + sequence monotonicity
11. ETA + trackingStatus transitions (`warning` ~5m, `offline` ~15m)
12. Tenant/role authorization (parent child scope; driver vehicle scope; no teacher fleet)
13. `GET /transport/trips/{tripId}/stops/{stopId}/students`
14. `POST /tracking/trips/{tripId}/students/{studentId}/pickup`
15. `POST /tracking/trips/{tripId}/students/{studentId}/dropoff`
16. `GET /parent/transport/trips/{tripId}/students/{studentId}/status`
17. `POST .../pickup/approval` + `POST .../dropoff/approval`
18. `GET /admin/transport/trips/{tripId}/student-transport-statuses`
19. WS student pickup/dropoff + parent approval events
20. Keep driver action + parent approval as separate facts (rejection must not erase driver mark)
21 also fixed this {
    "success": false,
    "error": {
        "code": "FORBIDDEN",
        "message": "Access denied",
        "timestamp": "2026-08-12T12:34:37.751508394Z",
        "path": "/api/v1/tracking/update-location",
        "requestId": "req_48eb9cd1"
    }
}
---

## 7. Error contract (clients already handle)

| HTTP / code | Client behavior |
|-------------|-----------------|
| 401 / 403 | Unauthorized message on live pages |
| 404 parent live | Soft empty → `NO_ASSIGNMENT` |
| 404 driver current-trip | Try aliases → empty assignment UI |
| 404 stop students / trip statuses / parent status | Soft empty list / null |
| 409 trip conflict | Surface API message |
| `TRANSPORT_STUDENT_NOT_ON_TRIP` | Friendly error toast |
| `TRANSPORT_STUDENT_NOT_AT_STOP` | Friendly error toast |
| `TRANSPORT_PICKUP_ALREADY_MARKED` | Friendly; UI already disables duplicate taps |
| `TRANSPORT_DROPOFF_ALREADY_MARKED` | Friendly; UI disables duplicate taps |
| `TRANSPORT_PICKUP_NOT_MARKED` | Friendly (approval before mark) |
| `TRANSPORT_DROPOFF_NOT_MARKED` | Friendly |
| `TRANSPORT_PARENT_NOT_AUTHORIZED` | Friendly |
| `TRANSPORT_DRIVER_NOT_AUTHORIZED` | Friendly |
| `TRANSPORT_PARENT_APPROVAL_ALREADY_SUBMITTED` | Friendly |
| Network offline | Driver queues GPS; live pages keep last snapshot + reconnect |

---

*Canonical frontend master contract. Prefer updating this file when adding endpoints; keep `LIVE_BUS_TRACKING.md` for Spring package detail.*
