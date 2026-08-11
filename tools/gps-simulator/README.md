# GPS ingest simulator (dev/staging only)

Posts authenticated hardware GPS points to Spring Boot:

`POST {API}/tracking/location` with header `X-Device-Token`.

## Setup

1. In web admin: **Live Bus Tracking → GPS device setup** (or Transport tools).
2. Register IMEI against a vehicle; **copy the one-time device token**.
3. Ensure an active trip exists for that vehicle (driver app start or admin trip API).

```bash
cd KidsActivities2.0   # or mobile/
export GPS_API_BASE=https://kidsbackend.snssystem.com/api/v1
export GPS_DEVICE_TOKEN='paste-token'
export GPS_IMEI='353342622051695'
export GPS_LAT=18.5204
export GPS_LNG=73.8567
# Required if pointing at production host:
export GPS_ALLOW_PROD=1
node tools/gps-simulator/simulate.mjs
```

## Safety

- Not imported by production web/mobile bundles.
- Refuses `NODE_ENV=production` unless `GPS_ALLOW_PROD=1`.
- Does not invent GPS inside React/Expo UI.

See `docs/transport/DRIVER_ASSIGNMENT_LIVE_API.md`.
