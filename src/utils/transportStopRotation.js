/**
 * One-time route stop rotation from first valid bus GPS (per trip).
 *
 * Example (original sequence 1→2→3→4, bus nearest stop 3):
 *   rotated display order: 3→4→1→2
 *   displaySequence labels:  #1→#2→#3→#4
 *   original `sequence` fields stay 3,4,1,2 respectively.
 *
 * Mirrors mobile `src/utils/transportStopRotation.ts` — do not invent different rules.
 */

import { haversineMeters, normalizeMappedStops } from './transportRouteGeo.js';

export function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  return haversineMeters(lat1, lng1, lat2, lng2) / 1000;
}

function toRotatedStop(stop, distanceFromBusKm, displaySequence) {
  return {
    stopId: stop.id,
    name: stop.name,
    sequence: stop.sequence,
    displaySequence,
    latitude: stop.lat,
    longitude: stop.lng,
    distanceFromBusKm,
    stopType: stop.stopType,
  };
}

/**
 * Compute distance to every stop, pick the single nearest (linear scan — no sort),
 * then rotate original order starting at that index.
 */
export function rotateStopsFromNearest(stops, busLat, busLng) {
  const ordered = normalizeMappedStops(stops);
  if (!ordered.length) {
    return { stopsWithDistance: [], nearestStopId: null, rotatedStops: [] };
  }

  const distances = ordered.map((stop) => calculateDistanceKm(busLat, busLng, stop.lat, stop.lng));

  let nearestIdx = 0;
  let nearestDist = Number.POSITIVE_INFINITY;
  ordered.forEach((_, index) => {
    const dist = distances[index];
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestIdx = index;
    }
  });

  const stopsWithDistance = ordered.map((stop, index) => toRotatedStop(
    stop,
    distances[index],
    stop.sequence,
  ));

  const rotatedOrdered = [
    ...ordered.slice(nearestIdx),
    ...ordered.slice(0, nearestIdx),
  ];
  const rotatedDistances = [
    ...distances.slice(nearestIdx),
    ...distances.slice(0, nearestIdx),
  ];

  const rotatedStops = rotatedOrdered.map((stop, index) => toRotatedStop(
    stop,
    rotatedDistances[index],
    index + 1,
  ));

  return {
    stopsWithDistance,
    nearestStopId: ordered[nearestIdx]?.id ?? null,
    rotatedStops,
  };
}

/** Offline self-check for scripts — throws when assertions fail. */
export function assertTransportStopRotationSelfCheck() {
  const mk = (seq, lat, lng) => ({
    id: `stop-${seq}`,
    name: `Stop ${seq}`,
    lat,
    lng,
    sequence: seq,
  });

  // Bus at (0,0); stop 3 at (0.001,0) is nearest among four corners.
  const stops = [
    mk(1, 0.01, 0),
    mk(2, 0.01, 0.01),
    mk(3, 0.001, 0),
    mk(4, 0, 0.01),
  ];
  const { rotatedStops, nearestStopId } = rotateStopsFromNearest(stops, 0, 0);

  if (nearestStopId !== 'stop-3') {
    throw new Error(`expected nearest stop-3, got ${nearestStopId}`);
  }
  const displaySeq = rotatedStops.map((s) => s.sequence);
  if (displaySeq.join(',') !== '3,4,1,2') {
    throw new Error(`expected rotated sequence 3,4,1,2 got ${displaySeq.join(',')}`);
  }
  const labels = rotatedStops.map((s) => s.displaySequence);
  if (labels.join(',') !== '1,2,3,4') {
    throw new Error(`expected displaySequence 1,2,3,4 got ${labels.join(',')}`);
  }
  if (rotatedStops[0].displaySequence !== 1 || rotatedStops[0].sequence !== 3) {
    throw new Error('first rotated stop must be original seq 3 labeled display 1');
  }
}
