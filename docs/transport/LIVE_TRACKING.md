# Live Bus Tracking — Web & Mobile Guide

Date: 11 August 2026  
Apps: Kids Activities **Web** + **Mobile** (Expo)  
API: `{API_BASE}/api/v1` (same Spring Boot backend for both clients)

This document explains **what live tracking is**, **how it works on web and mobile**, **what you need to set up**, and **how to track a bus / show live location on the map**.

For low-level Spring Boot schema/API requirements, also see:

- [`MASTER_LIVE_TRACKING_API.md`](./MASTER_LIVE_TRACKING_API.md) (**canonical** frontend ↔ backend API master — every endpoint, WS event, consumer, status)
- [`LIVE_BUS_TRACKING.md`](./LIVE_BUS_TRACKING.md) (backend package / entity guidance)
- [`DRIVER_ASSIGNMENT_LIVE_API.md`](./DRIVER_ASSIGNMENT_LIVE_API.md) (drivers + assignments)

---

## 1. What is Live Tracking?

Live tracking shows:

| Piece | Meaning |
|-------|---------|
| **Route path** | Ordered stops with map coordinates (blue line on OSM map) |
| **Bus marker** | Current GPS position of the assigned vehicle |
| **ETA / next stop** | Estimated minutes and next/last stop names |
| **Live badge** | WebSocket connection state (`connected` / `disconnected`) |
| **Status** | `running`, `stopped`, `warning`, `offline` |

Parents see **their child’s assigned bus only**.  
Admins / transport staff see the **fleet** (all live vehicles) and can pick a route.

There is **no fake GPS**. Markers move only when the backend accepts real location updates from:

1. A hardware GPS device (IMEI + device token), or  
2. A driver mobile app publishing location, or  
3. An admin-started trip that receives authenticated location posts.

---

## 2. End-to-end flow (how it works)

```text
┌─────────────────┐     POST location      ┌──────────────────────┐
│ GPS device or   │ ─────────────────────► │ Spring Boot API      │
│ Driver app      │   /tracking/...        │  - validate auth     │
└─────────────────┘                        │  - upsert current    │
                                           │  - publish WS event  │
                                           └──────────┬───────────┘
                                                      │
                      vehicle.location_updated        │
                                                      ▼
┌─────────────────┐     GET snapshot       ┌──────────────────────┐
│ Web / Mobile UI │ ◄───────────────────── │ REST                 │
│ Live map + ETA  │     WebSocket feed     │ /parent|admin/.../live│
└─────────────────┘ ◄───────────────────── │ WS /ws/tracking      │
                                           └──────────────────────┘
```

### Step-by-step

1. **School sets up transport data**  
   Vehicles → Routes (stops with lat/lng) → Student bus assignments.
2. **Trip / GPS starts**  
   Device or driver begins sending coordinates for that vehicle.
3. **Backend stores “current location”** and broadcasts `vehicle.location_updated`.
4. **Clients**  
   - Load a REST snapshot (route, vehicle, last lat/lng, ETA).  
   - Open WebSocket `/ws/tracking` for realtime updates.  
   - Draw OpenStreetMap (Leaflet) with route polyline + bus marker.

If REST has assignment but **no lat/lng yet**, the map should still show the **route path**; the bus marker appears after the first GPS fix.

---

## 3. What you need before tracking works

### 3.1 School / admin setup (required)

Do these in the **web portal** (admin):

| Order | Task | Where (typical) |
|------:|------|-----------------|
| 1 | Create **vehicles** (number, driver) | Transport → Vehicles |
| 2 | Create **routes** with **ordered stops** that have **lat/lng** | Transport → Manage routes |
| 3 | **Assign students** to route + stop + vehicle | Transport → Student Bus Assignments |
| 4 | Register **GPS device** (or use driver app) | GPS device setup modal |
| 5 | Start / allow an **active trip** for that vehicle | Trips / tracking start APIs |

Without mapped stops → map has no route line.  
Without assignment → parent sees “No active bus trip”.  
Without GPS ingest → badge may connect, but bus marker stays empty / “Waiting for GPS”.

### 3.2 GPS device registration (hardware)

Web UI: `GpsDeviceSetupModal` (`src/components/transport/GpsDeviceSetupModal.jsx`)

Fields:

- **Vehicle** — which bus this device belongs to  
- **IMEI** — device identifier  
- **Device token** — secret sent as `X-Device-Token` (shown once; store securely)  
- **Provider** — `generic` / `teltonika` / `queclink` / `driver_app`

API:

```http
POST /api/v1/admin/transport/gps-devices
Authorization: Bearer {adminJwt}
X-Tenant-Slug: {schoolSlug}
```

Device then posts locations (backend contract):

```http
POST /api/v1/tracking/location
X-Device-Token: {deviceToken}
```

### 3.3 Driver app location (optional)

Mobile: `src/services/transport/driverLocationPublisher.ts`

```http
POST /api/v1/tracking/update-location
Authorization: Bearer {driverJwt}
```

Body includes `vehicle_id`, `trip_id`, `latitude`, `longitude`, `speed`, `heading`, etc.

### 3.4 Environment

**Web** (`.env`):

```bash
VITE_API_URL=https://kidsbackend.snssystem.com/api/v1
```

**Mobile** (`.env` / Expo):

```bash
EXPO_PUBLIC_API_URL=https://kidsbackend.snssystem.com/api/v1
```

Rules:

- Same Spring Boot host for REST **and** tracking WebSocket.  
- **Do not** configure a separate tracking server URL.  
- Map tiles: free **OpenStreetMap** via Leaflet (no Mapbox token required for the live bus map).

---

## 4. Web app — how it works

### 4.1 Screens & routes

| Role | URL path | Page file |
|------|----------|-----------|
| Admin | `/{tenant}/admin/transport/live` | `src/pages/modules/TransportLiveTrackingPage.jsx` |
| Parent | `/{tenant}/parent/transport` | `src/pages/modules/ParentTransportTrackingPage.jsx` |
| Routes setup | Manage routes | `src/pages/modules/TransportRoutesManagePage.jsx` |
| Assignments | Student Bus Assignments | `src/pages/modules/TransportAssignmentsPage.jsx` |

### 4.2 Key web files

| File | Role |
|------|------|
| `src/components/transport/LiveBusMap.jsx` | Leaflet OSM map, bus + stops + road path |
| `src/services/transportTracking/trackingApi.js` | REST + WS URL helper |
| `src/services/transportTracking/trackingSocket.js` | WebSocket client + reconnect |
| `src/utils/transportRouteGeo.js` | Normalize stops, build polylines |
| `src/utils/transportTrackingState.js` | Parent UI state mapper |
| `src/utils/transportLocationSequence.js` | Stale GPS sequence guard |
| `src/types/transportModels.js` | Shared live-tracking models |
| `src/components/transport/GpsDeviceSetupModal.jsx` | Register + manage GPS hardware (token once on create/rotate) |
| `docs/transport/MASTER_LIVE_TRACKING_API.md` | Canonical API master |

### 4.3 Web data flow

**Parent**

1. `GET /parent/transport/live` → assignment snapshot.  
2. If `vehicleId` present → open WS with `?token=&vehicleId=`.  
3. On `vehicle.location_updated` → update lat/lng/ETA in UI.  
4. Map shows bus when lat/lng exist.

**Admin**

1. `GET /admin/transport/live?status=all` → fleet list.  
2. Load routes for stop paths.  
3. Open WS (fleet-wide or filtered).  
4. Selecting a route draws stop path; live vehicles overlay GPS.

### 4.4 WebSocket URL (web)

```text
wss://{api-host}/ws/tracking?token={accessToken}&vehicleId={optional}
```

Built in `getTrackingWebSocketUrl()` — host derived from `VITE_API_URL` by stripping `/api/v1`.

Live badge:

- `connected` — socket open  
- `connecting` / `disconnected` / `error` — reconnecting with backoff

---

## 5. Mobile app — how it works

### 5.1 Screens & entry

| Role | Screen | How to open |
|------|--------|-------------|
| Parent | `TransportLiveScreen` | More → **Transport** (`TransportLive`) |
| Admin/Teacher | Same screen (fleet mode) | More / drawer → Transport |

Files:

| File | Role |
|------|------|
| `src/screens/transport/TransportLiveScreen.tsx` | Parent + admin live UI |
| `src/components/transport/LiveBusMap.tsx` | WebView + Leaflet OSM |
| `src/api/transportApi.ts` | REST normalize (live, routes, assignments) |
| `src/services/transport/trackingSocket.ts` | WS client (refresh JWT before connect) |
| `src/services/transport/driverLocationPublisher.ts` | Driver GPS publisher |

### 5.2 Mobile data flow (parent)

1. `GET /parent/transport/live` via `getTransportLiveTracking()`.  
2. Normalize nested fields (`location`, `route.stops`, snake_case).  
3. Build **map stops** + **route line** even if GPS missing.  
4. Open WS with fresh access token:

```text
wss://{api-host}/ws/tracking?token=...&tenant=...&X-Tenant-Slug=...&vehicleId=...
```

5. On `vehicle.location_updated` → merge lat/lng/heading/ETA into state.  
6. `LiveBusMap` always shows the map; overlays “Waiting for GPS” until first fix.

### 5.3 Why mobile showed “Live disconnected”

Common causes:

| Cause | Fix |
|-------|-----|
| Access JWT expired; WS reused old token | `ensureFreshAccessToken()` before each connect |
| No assignment / no `vehicleId` | Assign child on web; socket won’t start |
| Backend WS rejects auth | Re-login; confirm tenant slug matches school |
| No GPS posts yet | Device/driver must publish; map still shows route |

### 5.4 Map behaviour (mobile)

- **Always show** OpenStreetMap WebView when assignment exists.  
- Draw **blue polyline** from ordered stops.  
- Draw **stop markers** (school stop highlighted).  
- Draw **bus marker** only when lat/lng are finite.  
- Fit bounds to stops + bus when data changes.

---

## 6. APIs used by clients

Base: `{API_BASE}/api/v1`

### REST

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | `/parent/transport/live?studentId=` | Parent | Child-scoped bus snapshot |
| GET | `/admin/transport/live?status=` | Admin | Fleet snapshot (not teachers) |
| GET/POST/PATCH | `/admin/transport/drivers` | Admin | Driver user CRUD (`role=driver`) |
| GET | `/admin/transport/routes` | Admin | Routes + stops (path on map) |
| GET | `/admin/transport/vehicles` | Admin | Vehicle catalog (`driverUserId`) |
| GET/POST/PATCH/DELETE | `/admin/transport/assignments` | Admin | Student ↔ route/stop/vehicle + direction |
| POST | `/admin/transport/gps-devices` | Admin | Register tracker (token shown once) |
| GET | `/driver/transport/current-trip` | Driver | Assigned vehicle + active trip |
| POST | `/tracking/location` | Device | Hardware GPS ingest |
| POST | `/tracking/update-location` | Driver | App GPS ingest |
| POST | `/tracking/trips/start` | Driver/Admin | Start tracking trip (idempotent) |
| POST | `/tracking/trips/{id}/complete` | Driver/Admin | Complete trip |

Full driver/assignment/trip contract: [`DRIVER_ASSIGNMENT_LIVE_API.md`](./DRIVER_ASSIGNMENT_LIVE_API.md).

Dev-only GPS simulator: `tools/gps-simulator/simulate.mjs` (never ships fake GPS in the UI).

Headers (user JWT calls):

```http
Authorization: Bearer {accessToken}
X-Tenant-Slug: {schoolSlug}
Accept: application/json
```

### WebSocket

```text
GET/WS  /ws/tracking?token={jwt}&vehicleId={optional}&tenant={slug}
```

Typical event:

```json
{
  "type": "vehicle.location_updated",
  "data": {
    "vehicleId": "uuid",
    "latitude": 23.2599,
    "longitude": 77.4126,
    "heading": 90,
    "speedKmh": 32,
    "trackingStatus": "running",
    "updatedAt": "2026-08-11T11:40:00Z",
    "eta": {
      "etaMinutes": 8,
      "nextStopName": "Gate 2",
      "lastStopName": "Sector 9"
    }
  }
}
```

Other event types (when backend emits them):

- `vehicle.tracking_warning`  
- `vehicle.tracking_offline`  
- `transport.trip_started` / `transport.trip_completed`  
- `transport.stop_entered` / `transport.stop_left` / `transport.school_reached`

---

## 7. How to track a bus (operator checklist)

### A. First-time school setup

1. Log in as **school admin** on web.  
2. **Transport → Drivers** → create driver account (`role=driver`), save temp password.  
3. Create **vehicle(s)** and assign `driverUserId` + route.  
4. **Manage routes** → add stops in order → each stop must have map lat/lng.  
5. **Student Bus Assignments** → class → student → route → stop → vehicle → direction.  
6. Open **GPS device setup** → register IMEI + token for that vehicle **or** use driver app.  
7. Driver signs in on mobile → **Start trip & share location** (auto GPS).  
8. Parent opens Bus Tracking (select child if multiple) → same vehicle marker.  
6. Confirm device/driver can post locations successfully.

### B. Daily / live trip

1. Start the trip (driver app or admin trip API).  
2. Confirm GPS points arrive (`updatedAt` changing on Live page).  
3. Open **Admin → Transport → Live tracking** → select route → see path + bus.  
4. Parent opens **Bus Track / Transport** → should see same vehicle, route, ETA.

### C. Parent verification

1. Parent account linked to the assigned child.  
2. Web: Parent → Bus Track.  
3. Mobile: More → Transport.  
4. Expect:  
   - Route name + vehicle number  
   - Map with route path  
   - Live badge → **connected** when WS works  
   - Bus marker after first GPS fix  
   - ETA card updating

---

## 8. Map details

| Item | Implementation |
|------|----------------|
| Tiles | OpenStreetMap (`tile.openstreetmap.org`) |
| Library | Leaflet 1.9.x |
| Web | Native Leaflet in React page |
| Mobile | Leaflet inside `react-native-webview` HTML |
| Route line | Polyline from ordered stop coordinates |
| Bus icon | Circular “B” marker; color by status |
| Stop icon | Numbered dots; school stop in brand blue |
| Fit bounds | Stops + bus (and route line) |

Status colors (approx.):

- `running` — green  
- `stopped` — amber  
- `warning` — orange/red  
- `offline` — grey  

---

## 9. Authorization rules

| Role | Can see |
|------|---------|
| Parent / student | Only vehicle linked via **their** child’s assignment |
| Driver | Only assigned active vehicle/trip |
| School admin / transport | Own tenant fleet |
| Super admin | Per platform policy |

Never trust client-sent `vehicleId` / `studentId` without server-side relationship checks.

---

## 10. Offline / warning behaviour (backend)

| Condition | Status |
|-----------|--------|
| No accepted GPS for ~5 minutes | `warning` |
| No accepted GPS for ~15 minutes | `offline` |

Clients should still show last known position + route path when available.

---

## 11. Troubleshooting

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| “No active bus trip” | No assignment | Assign student on web |
| Map empty / waiting for GPS | No lat/lng yet | Check device/driver posts; confirm trip active |
| Route line missing | Stops without coordinates | Edit route; set lat/lng on every stop |
| Live **disconnected** (mobile) | Expired JWT / WS auth | Re-login; app refreshes token before connect |
| Live connected but bus not moving | No new GPS events | Check device token, IMEI, network, trip |
| Parent sees wrong bus | Wrong assignment | Fix Student Bus Assignments |
| Admin map has fleet but parent empty | Parent not linked / wrong child | Check parent–child enrollment link |
| WS fails only on phone | Cleartext / wrong host | Use `https`/`wss` production API URL |

### Quick API checks

```bash
# Parent snapshot (replace token + tenant)
curl -s -H "Authorization: Bearer TOKEN" \
  -H "X-Tenant-Slug: SCHOOL" \
  https://kidsbackend.snssystem.com/api/v1/parent/transport/live

# Admin fleet
curl -s -H "Authorization: Bearer TOKEN" \
  -H "X-Tenant-Slug: SCHOOL" \
  "https://kidsbackend.snssystem.com/api/v1/admin/transport/live?status=all"
```

Response should include `vehicleId` and ideally `lat`/`lng` (or nested `location`) plus route/stops when available.

---

## 12. Client source map (quick reference)

### Web (`KidsActivities2.0`)

```text
src/pages/modules/TransportLiveTrackingPage.jsx
src/pages/modules/ParentTransportTrackingPage.jsx
src/pages/modules/TransportRoutesManagePage.jsx
src/pages/modules/TransportAssignmentsPage.jsx
src/components/transport/LiveBusMap.jsx
src/components/transport/GpsDeviceSetupModal.jsx
src/services/transportTracking/trackingApi.js
src/services/transportTracking/trackingSocket.js
src/utils/transportRouteGeo.js
docs/transport/LIVE_BUS_TRACKING.md   ← backend requirements
docs/transport/LIVE_TRACKING.md       ← this guide
```

### Mobile (`mobile`)

```text
src/screens/transport/TransportLiveScreen.tsx
src/screens/transport/TransportAssignmentsScreen.tsx
src/components/transport/LiveBusMap.tsx
src/api/transportApi.ts
src/services/transport/trackingSocket.ts
src/services/transport/driverLocationPublisher.ts
LIVE_TRACKING.md                      ← copy of this guide
```

---

## 13. Summary

**Live tracking = mapped route + authenticated GPS + REST snapshot + WebSocket updates + OSM map.**

To make it work:

1. Build routes with real stop coordinates.  
2. Assign each child to route/stop/vehicle.  
3. Register GPS (device or driver app) and start sending locations.  
4. Open Live Tracking on web or Transport on mobile.  
5. Confirm Live badge **connected** and bus marker updates.

Web and mobile share the **same backend APIs and WebSocket**; only the UI shells differ.
