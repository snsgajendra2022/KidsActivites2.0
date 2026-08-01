import { useEffect, useRef, useState } from 'react';
import { normalizeRouteStops } from '../utils/transportRouteGeo.js';
import { fetchRoadRoute } from '../services/geocoding/roadRouting.js';

function stopsSignature(stops) {
  return normalizeRouteStops(stops)
    .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng))
    .map((stop) => `${stop.id}:${stop.lat.toFixed(5)},${stop.lng.toFixed(5)}`)
    .join('|');
}

/**
 * Resolves an on-road driving polyline for ordered stops (OSRM).
 */
export default function useRoadRoute(stops, { enabled = true } = {}) {
  const [state, setState] = useState({
    geoJson: null,
    distanceMeters: 0,
    durationSeconds: 0,
    source: 'none',
    loading: false,
    error: '',
  });
  const stopsRef = useRef(stops);
  stopsRef.current = stops;

  const signature = stopsSignature(stops);

  useEffect(() => {
    if (!enabled || !signature) {
      setState({
        geoJson: null,
        distanceMeters: 0,
        durationSeconds: 0,
        source: 'none',
        loading: false,
        error: '',
      });
      return undefined;
    }

    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: '' }));

    const timer = setTimeout(() => {
      fetchRoadRoute(stopsRef.current, { signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted) return;
          setState({
            geoJson: result.geoJson,
            distanceMeters: result.distanceMeters,
            durationSeconds: result.durationSeconds,
            source: result.source,
            loading: false,
            error: result.error || '',
          });
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          setState({
            geoJson: null,
            distanceMeters: 0,
            durationSeconds: 0,
            source: 'none',
            loading: false,
            error: err?.message || 'Unable to build road route',
          });
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [signature, enabled]);

  return state;
}
