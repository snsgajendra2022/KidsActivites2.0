import { normalizeRouteStops, stopsToLineGeoJson } from '../../utils/transportRouteGeo.js';

const DEFAULT_OSRM = 'https://router.project-osrm.org';

function osrmBase() {
  const configured = import.meta.env.VITE_OSRM_URL;
  return String(configured || DEFAULT_OSRM).replace(/\/$/, '');
}

function mappedStops(stops) {
  return normalizeRouteStops(stops).filter(
    (stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng),
  );
}

function buildOsrmUrl(stops) {
  const coords = mappedStops(stops)
    .map((stop) => `${stop.lng},${stop.lat}`)
    .join(';');
  return `${osrmBase()}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
}

/**
 * Fetch a driving path that follows real roads between ordered stops (OSRM).
 * Falls back to a straight stop-to-stop line if routing is unavailable.
 */
export async function fetchRoadRoute(stops, { signal } = {}) {
  const list = mappedStops(stops);
  if (list.length < 2) {
    return {
      geoJson: null,
      distanceMeters: 0,
      durationSeconds: 0,
      source: 'none',
    };
  }

  const straight = stopsToLineGeoJson(list, {
    name: 'fallback-straight',
    routing: 'straight',
  });

  try {
    const res = await fetch(buildOsrmUrl(list), {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return {
        geoJson: straight,
        distanceMeters: 0,
        durationSeconds: 0,
        source: 'straight',
        error: `Routing HTTP ${res.status}`,
      };
    }

    const json = await res.json();
    const route = json?.routes?.[0];
    const coordinates = route?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return {
        geoJson: straight,
        distanceMeters: 0,
        durationSeconds: 0,
        source: 'straight',
        error: 'Empty road geometry',
      };
    }

    return {
      geoJson: {
        type: 'Feature',
        properties: {
          routing: 'osrm',
          distanceMeters: route.distance,
          durationSeconds: route.duration,
        },
        geometry: {
          type: 'LineString',
          coordinates,
        },
      },
      distanceMeters: Number(route.distance) || 0,
      durationSeconds: Number(route.duration) || 0,
      source: 'osrm',
    };
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    return {
      geoJson: straight,
      distanceMeters: 0,
      durationSeconds: 0,
      source: 'straight',
      error: err?.message || 'Routing failed',
    };
  }
}

export function formatRouteDistance(meters) {
  const value = Number(meters) || 0;
  if (value <= 0) return '';
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} km`;
}

export function formatRouteDuration(seconds) {
  const value = Number(seconds) || 0;
  if (value <= 0) return '';
  const mins = Math.round(value / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours} h ${rem} min` : `${hours} h`;
}

/** Sample [lat, lng] points from GeoJSON LineString for map arrows / fit. */
export function geoJsonToLatLngs(geoJson) {
  const coords = geoJson?.type === 'FeatureCollection'
    ? geoJson.features?.[0]?.geometry?.coordinates
    : geoJson?.geometry?.coordinates;
  if (!Array.isArray(coords)) return [];
  return coords
    .map((pair) => {
      const lng = Number(pair?.[0]);
      const lat = Number(pair?.[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return [lat, lng];
    })
    .filter(Boolean);
}

export function bearingDegrees(lat1, lng1, lat2, lng2) {
  const toRad = Math.PI / 180;
  const φ1 = lat1 * toRad;
  const φ2 = lat2 * toRad;
  const Δλ = (lng2 - lng1) * toRad;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
