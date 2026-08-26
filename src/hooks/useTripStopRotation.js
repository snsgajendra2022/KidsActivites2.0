import { useEffect, useMemo, useRef, useState } from 'react';
import { rotateStopsFromNearest } from '../utils/transportStopRotation.js';
import { normalizeMappedStops } from '../utils/transportRouteGeo.js';

function toLiveMapStop(stop) {
  return {
    id: stop.stopId,
    name: stop.name || stop.stopName || stop.stop_name || 'Stop',
    latitude: stop.latitude,
    longitude: stop.longitude,
    sequence: stop.sequence,
    displaySequence: stop.displaySequence,
    distanceFromBusKm: stop.distanceFromBusKm,
    stopType: stop.stopType,
    stop_type: stop.stopType,
    ...(stop.studentId ? { studentId: stop.studentId } : {}),
  };
}

function defaultDisplayStops(stops) {
  return normalizeMappedStops(stops).map((stop) => ({
    id: stop.id,
    name: stop.name,
    latitude: stop.lat,
    longitude: stop.lng,
    sequence: stop.sequence,
    stopType: stop.stopType,
    stop_type: stop.stopType,
    ...(stop.studentId ? { studentId: stop.studentId } : {}),
  }));
}

/**
 * Locks stop display order on first valid GPS for a tripKey.
 * Subsequent GPS fixes do not re-pick nearest or re-number.
 *
 * Mirrors mobile `src/hooks/useTripStopRotation.ts`.
 */
export function useTripStopRotation({
  tripKey,
  stops,
  busLat,
  busLng,
  tripActive = true,
  resetToken,
}) {
  const lockRef = useRef(null);
  const [lockVersion, setLockVersion] = useState(0);

  useEffect(() => {
    lockRef.current = null;
    setLockVersion((v) => v + 1);
  }, [resetToken]);

  useEffect(() => {
    if (!tripActive || !tripKey) {
      if (lockRef.current) {
        lockRef.current = null;
        setLockVersion((v) => v + 1);
      }
      return;
    }

    if (lockRef.current && lockRef.current.tripKey !== tripKey) {
      lockRef.current = null;
      setLockVersion((v) => v + 1);
    }
  }, [tripKey, tripActive]);

  useEffect(() => {
    if (!tripActive || !tripKey) return;
    if (lockRef.current?.tripKey === tripKey) return;

    const lat = Number(busLat);
    const lng = Number(busLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (!normalizeMappedStops(stops).length) return;

    const { rotatedStops, nearestStopId } = rotateStopsFromNearest(stops, lat, lng);
    lockRef.current = { tripKey, nearestStopId, rotatedStops };
    setLockVersion((v) => v + 1);
  }, [tripKey, tripActive, busLat, busLng, stops]);

  return useMemo(() => {
    void lockVersion;
    const lock = lockRef.current;
    if (lock && tripKey && lock.tripKey === tripKey) {
      return {
        displayStops: lock.rotatedStops.map(toLiveMapStop),
        nearestStopId: lock.nearestStopId,
        isRotationLocked: true,
      };
    }
    return {
      displayStops: defaultDisplayStops(stops),
      nearestStopId: null,
      isRotationLocked: false,
    };
  }, [lockVersion, tripKey, stops]);
}

export default useTripStopRotation;
