#!/usr/bin/env node
/**
 * DEV/STAGING ONLY — Hardware GPS ingest simulator.
 *
 * Posts real coordinate sequences to POST /api/v1/tracking/location
 * using X-Device-Token. Does NOT invent production bus movement inside the apps.
 *
 * Usage:
 *   export GPS_API_BASE=https://kidsbackend.snssystem.com/api/v1
 *   export GPS_DEVICE_TOKEN=...   # shown once after GpsDeviceSetupModal register
 *   export GPS_IMEI=353342622051695
 *   export GPS_LAT=18.5204
 *   export GPS_LNG=73.8567
 *   node tools/gps-simulator/simulate.mjs
 *
 * Optional:
 *   GPS_INTERVAL_MS=5000
 *   GPS_STEPS=40
 *   GPS_DELTA_LAT=0.00025
 *   GPS_DELTA_LNG=0.0002
 */

const API_BASE = (process.env.GPS_API_BASE || process.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN = process.env.GPS_DEVICE_TOKEN || '';
const IMEI = process.env.GPS_IMEI || '';
const INTERVAL_MS = Number(process.env.GPS_INTERVAL_MS || 5000);
const STEPS = Number(process.env.GPS_STEPS || 40);
const START_LAT = Number(process.env.GPS_LAT || 18.5204);
const START_LNG = Number(process.env.GPS_LNG || 73.8567);
const DELTA_LAT = Number(process.env.GPS_DELTA_LAT || 0.00025);
const DELTA_LNG = Number(process.env.GPS_DELTA_LNG || 0.0002);

function fail(message) {
  console.error(`[gps-simulator] ${message}`);
  process.exit(1);
}

if (!API_BASE) fail('Set GPS_API_BASE (e.g. https://kidsbackend.snssystem.com/api/v1)');
if (!TOKEN) fail('Set GPS_DEVICE_TOKEN from GPS device registration (shown once).');
if (!/^\d{15}$/.test(IMEI)) fail('Set GPS_IMEI to a 15-digit IMEI.');

if (process.env.NODE_ENV === 'production' && process.env.GPS_ALLOW_PROD !== '1') {
  fail('Refusing to run against production without GPS_ALLOW_PROD=1');
}

async function postLocation(payload) {
  const res = await fetch(`${API_BASE}/tracking/location`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Device-Token': TOKEN,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    // Legacy hard rate-limit — soft-continue so burst runs do not abort.
    if (res.status === 429 || json?.error?.code === 'RATE_LIMITED') {
      return { accepted: false, reason: 'throttled', legacyStatus: res.status };
    }
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  const data = json && typeof json.success === 'boolean' ? json.data : json;
  return data || { accepted: true };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log(`[gps-simulator] posting ${STEPS} points to ${API_BASE}/tracking/location every ${INTERVAL_MS}ms`);
console.log(`[gps-simulator] imei=${IMEI} start=${START_LAT},${START_LNG}`);

for (let i = 0; i < STEPS; i += 1) {
  const latitude = START_LAT + DELTA_LAT * i;
  const longitude = START_LNG + DELTA_LNG * i;
  const payload = {
    imei: IMEI,
    latitude,
    longitude,
    speed: 28,
    direction: 90,
    accuracy: 8,
    timestamp: new Date().toISOString(),
    battery: Math.max(20, 95 - i),
  };

  try {
    const result = await postLocation(payload);
    if (result && result.accepted === false) {
      console.log(
        `[throttled] step ${i + 1}/${STEPS} ${latitude.toFixed(6)},${longitude.toFixed(6)}` +
          (result.retryAfterMs != null ? ` retryAfterMs=${result.retryAfterMs}` : ''),
      );
    } else {
      console.log(`[ok] step ${i + 1}/${STEPS} ${latitude.toFixed(6)},${longitude.toFixed(6)}`);
    }
  } catch (err) {
    console.error(`[fail] step ${i + 1}: ${err.message}`);
    if (String(err.message).startsWith('401') || String(err.message).startsWith('403')) {
      fail('Auth failed — check GPS_DEVICE_TOKEN / IMEI registration on the tenant.');
    }
  }

  if (i < STEPS - 1) await sleep(INTERVAL_MS);
}

console.log('[gps-simulator] done. Open Live Bus Tracking / parent Transport to verify the marker.');
