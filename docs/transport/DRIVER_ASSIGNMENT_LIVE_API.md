# Transport Drivers, Assignments & Live Tracking — Backend API Contract

Date: 11 August 2026  
API base: `{API_BASE}/api/v1` (production: `https://kidsbackend.snssystem.com/api/v1`)  
Consumers: Kids Activities **Web** + **Mobile (Expo)**  
Related: [`LIVE_BUS_TRACKING.md`](./LIVE_BUS_TRACKING.md), [`LIVE_TRACKING.md`](./LIVE_TRACKING.md), [`../FULL_BACKEND_API_CONTRACT.md`](../FULL_BACKEND_API_CONTRACT.md)

This document is the **authoritative relationship + endpoint contract** for Spring Boot.  
Frontends already call these paths and soft-fail on 404 where endpoints are not yet deployed.

---

## 1. Entity relationship model

```text
Tenant (school)
  │
  ├── User (role=driver) ─────────────────────────────┐
  │     id = driverUserId                             │
  │                                                   ▼
  ├── Vehicle ────────────────────────────────────────────
  │     id, vehicleNumber, capacity, status
  │     driverUserId  (FK → User.id, unique active)
  │     routeId       (FK → Route.id)
  │
  ├── Route
  │     id, name, morningStart, eveningStart, status
  │     stops[] { id, name, sequence, lat, lng, radiusMeters, stopType }
  │     geometry? (GeoJSON LineString — preferred over straight stop lines)
  │
  ├── StudentTransportAssignment
  │     id
  │     classId, studentId   ← reuse Class/Student; NEVER free-text catalogs
  │     routeId, stopId, vehicleId
  │     direction: morning | evening | both
  │     status: active | inactive
  │
  ├── GpsDevice
  │     id, vehicleId, imei
  │     deviceTokenHash (+ pepper), provider, status
  │
  ├── Trip
  │     id, vehicleId, routeId, driverUserId
  │     direction: morning | evening
  │     status: active | completed | cancelled
  │     startedAt, completedAt
  │     CONSTRAINT: at most ONE active trip per vehicle
  │
  ├── VehicleCurrentLocation
  │     vehicleId (PK), tripId?, lat, lng, speedKmh, heading
  │     sequence, recordedAt, trackingStatus, updatedAt
  │     RULE: never rewind current when incoming sequence/timestamp is older
  │
  └── VehicleLocationHistory
        append-only points for audit / replay
```

### Parent view scope

```text
Parent User
  └── linked Children (studentId via /parent/children)
        └── StudentTransportAssignment (active)
              └── Vehicle (+ active Trip + VehicleCurrentLocation)
                    └── Parent GET /parent/transport/live?studentId=
```

### Auth roles matrix

| Role | Drivers CRUD | Vehicles/Routes/Assignments | Fleet live | Start trip | Publish GPS | Parent live |
|------|--------------|-----------------------------|------------|------------|-------------|-------------|
| `school_admin` / `super_admin` / `transport_manager` | Yes | Yes | Yes (tenant) | Yes | No (unless also driver) | No |
| `driver` | No | No | No | Assigned vehicle only | Assigned vehicle + active trip | No |
| `parent` | No | No | No | No | No | Own children only |
| `teacher` | No | No | **No** (not automatic) | No | No | No |
| Device (`X-Device-Token`) | No | No | No | No | Hardware ingest only | No |

Headers for authenticated calls:

- `Authorization: Bearer {jwt}`
- `X-Tenant-Slug: {schoolSlug}` (or tenant resolution from JWT)

---

## 2. Driver CRUD (admin)

### List drivers

```http
GET /admin/transport/drivers?status=active&search=
Authorization: Bearer {adminJwt}
X-Tenant-Slug: {schoolSlug}
```

Response `data[]`:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Ravi Kumar",
  "email": "ravi.driver@school.example",
  "mobile": "9876543210",
  "licenseNumber": "MH1420110001234",
  "status": "active",
  "vehicleId": "uuid-or-null",
  "vehicleNumber": "MH-12-AB-1234"
}
```

Fallback (if dedicated resource not ready): `GET /admin/users?role=driver`.

### Create driver

```http
POST /admin/transport/drivers
```

```json
{
  "name": "Ravi Kumar",
  "email": "ravi.driver@school.example",
  "mobile": "9876543210",
  "licenseNumber": "MH1420110001234",
  "role": "driver",
  "status": "active"
}
```

Response:

```json
{
  "driver": { "id": "uuid", "userId": "uuid", "name": "Ravi Kumar", "email": "..." },
  "tempPassword": "one-time-password"
}
```

Fallback: `POST /admin/users` with `"role": "driver"`.

### Update / deactivate

```http
PATCH /admin/transport/drivers/{driverUserId}
PATCH /admin/transport/drivers/{driverUserId}/deactivate
```

---

## 3. Assign driver ↔ vehicle

Authoritative field: **`vehicle.driverUserId`**.

### Vehicle create/update

```http
POST /admin/transport/vehicles
PATCH /admin/transport/vehicles/{vehicleId}
```

```json
{
  "vehicleNumber": "MH-12-AB-1234",
  "capacity": 40,
  "driverUserId": "uuid",
  "attendantUserId": null,
  "routeId": "uuid",
  "status": "active"
}
```

Rules:

- `driverUserId` must reference a user with role `driver` in the same tenant.
- At most one **active** vehicle per driver (clear previous assignment or reject).
- Display names (`driverName`, `driverPhone`, `routeName`) are **response-only**; do not treat as write authority.

Optional convenience:

```http
PUT /admin/transport/vehicles/{vehicleId}/driver
{ "driverUserId": "uuid" }
```

```http
PATCH /admin/transport/vehicles/{vehicleId}
{ "driverUserId": null }
```

---

## 4. Student bus assignment (IDs only)

```http
GET|POST /admin/transport/assignments
PATCH|DELETE /admin/transport/assignments/{id}
```

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

`direction`: `morning` | `evening` | `both`.

**Forbidden on write:** free-text `studentName` / `className` as source of truth.  
Names may be returned for display via joins.

Reuse Class + Student catalogs; clear `studentId` when `classId` changes on clients.

---

## 5. Trip lifecycle → auto tracking ingest

### Start trip (idempotent)

```http
POST /tracking/trips/start
Authorization: Bearer {driverOrAdminJwt}
```

```json
{
  "vehicle_id": "uuid",
  "route_id": "uuid",
  "direction": "morning"
}
```

Behavior:

1. Resolve vehicle; for `driver` role, `vehicle.driverUserId` **must** equal JWT user id.
2. If an active trip already exists for that vehicle with same direction → return existing trip (idempotent).
3. Else complete/cancel conflicting active trip per product policy, or reject with `409 CONFLICT`.
4. Create trip `status=active`, set tracking status to `stopped` until first GPS.
5. Publish WS `transport.trip_started`.

Response:

```json
{
  "id": "trip-uuid",
  "vehicleId": "uuid",
  "routeId": "uuid",
  "direction": "morning",
  "status": "active",
  "startedAt": "2026-08-11T02:30:00Z"
}
```

### Complete trip

```http
POST /tracking/trips/{tripId}/complete
{ "status": "completed" }
```

### Driver current trip (mobile must not guess IDs)

```http
GET /driver/transport/current-trip
Authorization: Bearer {driverJwt}
```

```json
{
  "vehicleId": "uuid",
  "vehicleNumber": "MH-12-AB-1234",
  "routeId": "uuid",
  "routeName": "North Route",
  "driverName": "Ravi Kumar",
  "activeTripId": "trip-uuid-or-null",
  "direction": "morning",
  "status": "active",
  "stops": [ { "id": "uuid", "name": "Stop A", "sequence": 1, "lat": 18.52, "lng": 73.85, "stopType": "pickup" } ]
}
```

Aliases accepted by clients for soft migration: `/driver/transport/assignment`, `/driver/transport/me`.

---

## 6. GPS ingest

### Hardware

```http
POST /tracking/location
X-Device-Token: {plaintextToken}
Content-Type: application/json
```

```json
{
  "imei": "353342622051695",
  "latitude": 18.5204,
  "longitude": 73.8567,
  "speed": 28,
  "direction": 90,
  "accuracy": 8,
  "timestamp": "2026-08-11T02:35:00Z",
  "battery": 80
}
```

### Driver app

```http
POST /tracking/update-location
Authorization: Bearer {driverJwt}
```

```json
{
  "vehicle_id": "uuid",
  "trip_id": "uuid",
  "latitude": 18.5204,
  "longitude": 73.8567,
  "speed": 28.5,
  "heading": 92,
  "accuracy": 8,
  "timestamp": "2026-08-11T02:35:00Z"
}
```

Ingest rules (mandatory):

- Authenticate device token (hashed + pepper) **or** driver JWT.
- Driver may publish only for `vehicle.driverUserId == jwt.sub` and an active trip (or auto-bind if trip_id omitted and exactly one active trip exists).
- Reject `(0,0)`, out-of-range lat/lng, stale (>2 min), far-future timestamps.
- Rate-limit ≥3s per vehicle (configurable).
- Transaction: upsert `VehicleCurrentLocation` + append history.
- Never rewind current location when `sequence`/`recordedAt` is older.
- Recompute ETA to next/assigned stop (backend-authoritative).
- Geofence enter/leave with hysteresis when stop `radiusMeters` set.
- Set `trackingStatus`: `running` | `stopped` | `warning` | `offline`.
- Broadcast STOMP `vehicle.location_updated`.

### GPS device admin

```http
POST   /admin/transport/gps-devices          { vehicleId, imei, deviceToken, provider? }
GET    /admin/transport/gps-devices
PATCH  /admin/transport/gps-devices/{id}     { status: "active"|"disabled" }
POST   /admin/transport/gps-devices/{id}/rotate-token
```

Store **hash only**. Plaintext token returned **once** on register/rotate.

---

## 7. Parent live (child-scoped)

```http
GET /parent/transport/live?studentId={uuid}
Authorization: Bearer {parentJwt}
```

Rules:

- `studentId` optional if parent has exactly one child; required / preferred with multiple children.
- Parent may only request linked children.
- Return assignment + vehicle + stops + optional current location + ETA.
- Prefer `route.geometry` for map path; else ordered stop coordinates.
- Include explicit UI state when possible:

| `stateCode` | Meaning |
|-------------|---------|
| `NO_ASSIGNMENT` | No active assignment for child |
| `ASSIGNED_NO_ACTIVE_TRIP` | Assignment exists, no active trip |
| `WAITING_FOR_GPS` | Trip active, no lat/lng yet |
| `LIVE` | Fresh GPS |
| `WARNING` | No fix ~5 min |
| `OFFLINE` | No fix ~15 min |
| `COMPLETED` | Trip completed |

Example:

```json
{
  "stateCode": "LIVE",
  "studentId": "uuid",
  "vehicleId": "uuid",
  "vehicleNumber": "MH-12-AB-1234",
  "routeId": "uuid",
  "routeName": "North Route",
  "assignedStop": "Stop B",
  "status": "running",
  "tripStatus": "active",
  "activeTripId": "uuid",
  "etaMinutes": 7,
  "lastStop": "Stop A",
  "nextStop": "Stop B",
  "lat": 18.5204,
  "lng": 73.8567,
  "speedKmh": 28.5,
  "heading": 92,
  "updatedAt": "2026-08-11T02:35:00Z",
  "stops": [],
  "geometry": null
}
```

Soft empty: `404` / `null` / empty body → clients treat as `NO_ASSIGNMENT`.

---

## 8. Admin fleet live

```http
GET /admin/transport/live?status=all|running|stopped|warning|offline
```

Tenant-scoped array of vehicles with last location, ETA, studentCount, tripStatus.  
**Teachers must not receive this by default.**

---

## 9. WebSocket contract

```text
ws(s)://{API_HOST}/ws/tracking?token={JWT}&vehicleId={optional}
```

Optional hardening (non-breaking):

```http
POST /tracking/ws-ticket
→ { "ticket": "short-lived", "expiresIn": 60 }
```

Clients may pass `ticket=` instead of long-lived JWT once backend supports it; keep JWT query param working.

Events:

- `vehicle.location_updated`
- `vehicle.tracking_warning`
- `vehicle.tracking_offline`
- `entered_stop` / `left_stop` / `reached_school`
- `transport.trip_started` / `transport.trip_completed`

Parent subscriptions: assigned vehicle only.  
Admin: tenant fleet.  
On reconnect: REST resync snapshot to recover missed events.

---

## 10. Acceptance criteria

1. Admin creates driver (`role=driver`) and receives one-time password.
2. Admin assigns `driverUserId` on vehicle linked to a mapped route.
3. Admin assigns student via `classId` + `studentId` + route/stop/vehicle + direction.
4. Driver mobile `GET /driver/transport/current-trip` returns that vehicle without hard-coded IDs.
5. Driver starts trip → GPS posts accepted → `VehicleCurrentLocation` updates.
6. Parent `GET /parent/transport/live?studentId=` shows same lat/lng; multi-child selector works.
7. Admin fleet live shows the vehicle; teacher JWT cannot list fleet.
8. Device token never returned again after register; rotate issues a new one-time token.
9. Stale GPS does not rewind current location.
10. Completing trip stops parent LIVE state and emits `transport.trip_completed`.

---

## 11. Suggested DB changes (Spring)

```sql
-- users.role includes 'driver'

ALTER TABLE transport_vehicles
  ADD COLUMN driver_user_id UUID NULL REFERENCES users(id),
  ADD COLUMN route_id UUID NULL REFERENCES transport_routes(id);

CREATE UNIQUE INDEX ux_vehicle_active_driver
  ON transport_vehicles(driver_user_id)
  WHERE driver_user_id IS NOT NULL AND status = 'active';

ALTER TABLE student_transport_assignments
  ADD COLUMN direction VARCHAR(16) NOT NULL DEFAULT 'both';

CREATE TABLE transport_trips (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  route_id UUID NULL,
  driver_user_id UUID NULL,
  direction VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX ux_one_active_trip_per_vehicle
  ON transport_trips(vehicle_id)
  WHERE status = 'active';

CREATE TABLE vehicle_current_locations (
  vehicle_id UUID PRIMARY KEY,
  trip_id UUID NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed_kmh DOUBLE PRECISION NULL,
  heading DOUBLE PRECISION NULL,
  sequence BIGINT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  tracking_status VARCHAR(16) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE gps_devices (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  imei VARCHAR(15) NOT NULL,
  token_hash VARCHAR(128) NOT NULL,
  provider VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL,
  UNIQUE (tenant_id, imei)
);
```

---

## 12. Frontend call sites (already wired)

| Client | Path |
|--------|------|
| Web Drivers page | `/admin/transport/drivers` (+ users fallback) |
| Web Vehicles | `driverUserId` on vehicle CRUD |
| Web Assignments | `direction` + ID relationships |
| Web/Mobile parent live | `/parent/transport/live?studentId=` |
| Mobile driver | `/driver/transport/current-trip`, `/tracking/trips/start`, `/tracking/update-location` |
| GPS modal | `/admin/transport/gps-devices` |
| Dev simulator | `tools/gps-simulator` → `/tracking/location` |

---

## 13. Blocked without Spring deploy

Until the backend implements this contract against `kidsbackend.snssystem.com`:

- Driver create may 404 (UI soft-fails with message).
- Trip start / GPS ingest / WS fan-out will not move parent markers.
- Do **not** invent fake GPS, fake IDs, or client-side bus animation.
