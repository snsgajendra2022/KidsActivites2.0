# Live Bus Tracking — Spring Boot Backend Requirements

> Implement these requirements in the **existing Java Spring Boot backend and
> existing school ERP database**. Do not create another backend service or a
> second database.

The frontend is already prepared to consume real tracking data:

| Client integration | File |
|--------------------|------|
| Admin live fleet page | `src/pages/modules/TransportLiveTrackingPage.jsx` |
| Parent assigned-bus page | `src/pages/modules/ParentTransportTrackingPage.jsx` |
| Free OSM live map (Leaflet) | `src/components/transport/LiveBusMap.jsx` |
| Tracking HTTP client | `src/services/transportTracking/trackingApi.js` |
| Tracking WebSocket client | `src/services/transportTracking/trackingSocket.js` |
| Driver Expo location publisher | `mobile/src/services/transport/driverLocationPublisher.ts` |

## Required Spring Boot modules

Add these packages to the existing backend using its current base package:

```text
transport.tracking.controller
transport.tracking.service
transport.tracking.repository
transport.tracking.entity
transport.tracking.dto
transport.tracking.websocket
transport.tracking.security
transport.tracking.jobs
```

Recommended Spring components:

| Component | Responsibility |
|-----------|----------------|
| `TrackingLocationController` | Hardware and driver GPS ingest |
| `TrackingQueryController` | Admin fleet and parent-scoped snapshots |
| `TransportTripController` | Start, complete, cancel, and history |
| `GpsDeviceService` | Device registration, token verification, revocation |
| `LocationIngestService` | Validation, current-location upsert, history append |
| `TrackingAuthorizationService` | Tenant, driver vehicle, parent child checks |
| `GeofenceService` | Stop/school entry and exit detection |
| `EtaService` | Route-aware ETA calculation |
| `TrackingWebSocketPublisher` | STOMP location/trip/geofence events |
| `OfflineVehicleJob` | Five-minute warning and 15-minute offline transition |
| `TransportNotificationService` | Existing push/SMS/WhatsApp notification integration |

## Existing database changes

Create a normal Flyway/Liquibase migration **inside the existing backend**. Add
tables or map equivalent existing tables; do not create a new database.

### Required entities

#### Vehicle

Reuse the existing vehicle table when present. It must expose:

```text
id
tenant_id / school_id
vehicle_number
capacity
driver_user_id
attendant_user_id
route_id
status
created_at / updated_at
created_by / updated_by
```

#### GPS device

```text
id
tenant_id / school_id
vehicle_id (FK vehicle)
imei (unique per tenant)
device_token_hash
provider
status (active, revoked, lost)
last_seen_at
created_at / updated_at
```

Never store the raw device token.

#### Current vehicle location

One row per vehicle:

```text
vehicle_id (PK/FK)
tenant_id
trip_id
latitude
longitude
speed_kmh
heading
accuracy_m
battery_pct
source (device, driver_app)
tracking_status (running, stopped, warning, offline)
updated_at
```

#### Location history

Append-only:

```text
id
tenant_id
vehicle_id
trip_id
latitude
longitude
speed_kmh
heading
accuracy_m
battery_pct
source
recorded_at
```

Index `(vehicle_id, recorded_at DESC)` and apply retention/partitioning based
on production volume.

#### Trip

```text
id
tenant_id / school_id
vehicle_id
driver_user_id
route_id
direction (morning, evening)
status (started, en_route, completed, cancelled)
started_at
ended_at
created_at / updated_at
```

Enforce one active trip per vehicle.

#### Route, stop, and assignment

Routes and stops require coordinates and ordered stop sequence. Student
transport assignments must reference `student_id`, `route_id`, `stop_id`, and
`vehicle_id`; never store student/route names as relationship keys.

#### Geofence event and notification outbox

Persist unique trip/stop events so repeated GPS updates do not send duplicate
notifications. Reuse the backend's existing notification outbox where
available.

## Required REST APIs

All paths are under the existing `/api/v1`.

### Dedicated GPS hardware

```http
POST /tracking/location
X-Device-Token: one-time-provisioned-secret
```

```json
{
  "device_id": "uuid",
  "imei": "123456789012345",
  "latitude": 23.2599,
  "longitude": 77.4126,
  "speed": 35,
  "direction": 92,
  "accuracy": 8,
  "timestamp": "2026-07-30T10:20:00Z",
  "battery": 82
}
```

### Driver mobile application

```http
POST /tracking/update-location
Authorization: Bearer {driverJwt}
```

```json
{
  "vehicle_id": "uuid",
  "trip_id": "uuid",
  "latitude": 23.2599,
  "longitude": 77.4126,
  "speed": 35,
  "heading": 92,
  "accuracy": 8,
  "timestamp": "2026-07-30T10:20:00Z"
}
```

### Trip and query endpoints

```text
POST /tracking/trips/start
POST /tracking/trips/{tripId}/complete
GET  /admin/transport/live?status=all|running|stopped|warning|offline
GET  /admin/transport/trips?vehicleId=&from=&to=
GET  /parent/transport/live
POST /admin/transport/gps-devices
```

## Ingest transaction

For every accepted point:

1. Authenticate device/driver.
2. Confirm tenant, active vehicle, assigned driver, and active trip.
3. Validate coordinate range, timestamp, speed, accuracy, and rate.
4. Reject `(0,0)`, stale, future, impossible-speed, and unauthorized points.
5. Deduplicate by device event ID or vehicle/timestamp/proximity.
6. Upsert the single current-location row.
7. Append the history row.
8. Update device `last_seen_at`.
9. Evaluate geofences and ETA.
10. Commit transaction.
11. Publish realtime event after commit.

## Existing WebSocket/STOMP integration

Extend the current Spring WebSocket/STOMP configuration used by chat and
notifications. Do not introduce another WebSocket server unless the existing
backend cannot support it.

Recommended destinations:

```text
/topic/tenant/{tenantSlug}/transport/fleet
/topic/tenant/{tenantSlug}/transport/vehicle/{vehicleId}
/topic/tenant/{tenantSlug}/transport/trip/{tripId}
```

Events:

```text
vehicle.location_updated
vehicle.tracking_warning
vehicle.tracking_offline
transport.trip_started
transport.trip_completed
transport.stop_entered
transport.stop_left
transport.school_reached
```

When the Spring backend runs on multiple instances, use its existing Redis
infrastructure for cross-node fan-out if available. Redis is infrastructure,
not a second application database.

## Authorization

| Role | Access |
|------|--------|
| `super_admin` | Authorized schools according to platform policy |
| `school_admin` / `transport_manager` | Own tenant fleet |
| `driver` | Assigned active vehicle/trip only |
| `parent` / `student` | Vehicle linked through own child transport assignment |

Do not trust `vehicleId`, `studentId`, or tenant identifiers from a client
without resolving authorization from persisted relationships.

## Offline and geofence behavior

- No accepted update for 5 minutes: `warning`.
- No accepted update for 15 minutes: `offline`.
- Run a Spring `@Scheduled` job every minute.
- Stop/school events must be idempotent per trip and stop.
- Notifications: bus started, near stop, delayed/offline, reached stop/school.
- Use existing FCM/SMS/WhatsApp provider services.

## Frontend environment

Tracking uses the same Spring Boot host as the rest of the app:

```bash
VITE_API_URL=https://your-spring-boot-host/api/v1
```

The live map uses free OpenStreetMap tiles via Leaflet. No Mapbox token is required.

Do **not** configure a separate tracking API URL. The frontend calls:

- `GET /api/v1/admin/transport/live`
- `GET /api/v1/parent/transport/live`
- `POST /api/v1/tracking/update-location`
- `ws://{same-host}/ws/tracking`

## Acceptance tests

1. Real device point updates current location and appends history.
2. Committed point emits one realtime event and moves the map marker.
3. Driver cannot publish for another vehicle.
4. Parent cannot access another child's bus.
5. Five/15-minute scheduled transitions emit warning/offline events.
6. Geofence crossing emits one event and one parent notification.
7. Duplicate/stale/invalid coordinates do not modify current location.
8. Multiple backend instances deliver the same event through shared fan-out.
