function toRad(value) {
  return (value * Math.PI) / 180;
}

/** Great-circle distance in meters (aligned with mobile transportRouteGeo). */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Stops built from a student's enrollment address use this id prefix. */
export const STUDENT_HOME_STOP_PREFIX = 'stu-';

/**
 * Student bound to a stop created from that student's home address.
 * Such a stop has no transport assignment row of its own, so the roster must be
 * resolved by `studentId` instead of `stopId`.
 */
export function studentIdFromStop(stop) {
  if (!stop || typeof stop !== 'object') return '';
  for (const value of [stop.studentId, stop.student_id]) {
    if (value == null || value === '') continue;
    const text = String(value).trim();
    if (text) return text;
  }
  const id = String(stop.id ?? stop.stopId ?? stop.stop_id ?? '').trim();
  if (id.startsWith(STUDENT_HOME_STOP_PREFIX)) {
    return id.slice(STUDENT_HOME_STOP_PREFIX.length).trim();
  }
  return '';
}

/**
 * Best available human label for a stop from mixed API shapes.
 */
export function resolveStopDisplayName(stop, index = 0) {
  if (!stop || typeof stop !== 'object') return `Stop ${index + 1}`;
  const candidates = [
    stop.name,
    stop.stopName,
    stop.stop_name,
    stop.title,
    stop.label,
    stop.addressLabel,
    stop.address_label,
    stop.address,
    stop.placeName,
    stop.place_name,
  ];
  for (const value of candidates) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return `Stop ${index + 1}`;
}

/**
 * Normalize and sort mapped stops that have valid coordinates.
 * Used by nearest-stop rotation (same rules as mobile).
 */
export function normalizeMappedStops(stops) {
  if (!Array.isArray(stops)) return [];
  return stops
    .map((stop, index) => {
      if (!stop || typeof stop !== 'object') return null;
      const lat = Number(stop.lat ?? stop.latitude);
      const lng = Number(stop.lng ?? stop.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const studentId = studentIdFromStop(stop);
      return {
        id: String(stop.id || `stop-${index + 1}`),
        name: resolveStopDisplayName(stop, index),
        lat,
        lng,
        sequence: Number(stop.sequence) || index + 1,
        stopType: String(
          stop.stopType || stop.stop_type || (index === stops.length - 1 ? 'school' : 'pickup'),
        ),
        radiusMeters: Number(stop.radiusMeters) > 0 ? Number(stop.radiusMeters) : 80,
        ...(studentId ? { studentId } : {}),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sequence - b.sequence);
}

/** Normalize route stops from API (array) or legacy comma-separated string. */
export function normalizeRouteStops(stops) {
  if (Array.isArray(stops)) {
    return stops
      .map((stop, index) => {
        if (!stop || typeof stop !== 'object') return null;
        const lat = Number(stop.lat ?? stop.latitude);
        const lng = Number(stop.lng ?? stop.longitude);
        return {
          id: String(stop.id || `stop-${index + 1}`),
          name: resolveStopDisplayName(stop, index),
          sequence: Number(stop.sequence) || index + 1,
          lat: Number.isFinite(lat) ? lat : null,
          lng: Number.isFinite(lng) ? lng : null,
          radiusMeters: Number(stop.radiusMeters) || 80,
          stopType: stop.stopType || stop.stop_type || (index === stops.length - 1 ? 'school' : 'pickup'),
          etaOffsetMin: stop.etaOffsetMin ?? null,
          ...(stop.studentId ? { studentId: String(stop.studentId) } : {}),
          ...(stop.applicationId ? { applicationId: String(stop.applicationId) } : {}),
          ...(stop.addressLabel ? { addressLabel: String(stop.addressLabel) } : {}),
          ...(stop.pinCode ? { pinCode: String(stop.pinCode) } : {}),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.sequence - b.sequence);
  }

  if (typeof stops === 'string' && stops.trim()) {
    return stops.split(',').map((name, index) => ({
      id: `legacy-${index + 1}`,
      name: name.trim() || `Stop ${index + 1}`,
      sequence: index + 1,
      lat: null,
      lng: null,
      radiusMeters: 80,
      stopType: 'pickup',
      etaOffsetMin: null,
    }));
  }

  return [];
}

export function routeHasMappedStops(route) {
  return normalizeRouteStops(route?.stops).some(
    (stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng),
  );
}

export function stopLabelSummary(stops) {
  const list = normalizeRouteStops(stops);
  if (!list.length) return '—';
  return list.map((stop) => stop.name).join(', ');
}

export function stopsToLineGeoJson(stops, properties = {}) {
  const list = normalizeRouteStops(stops).filter(
    (stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng),
  );
  if (list.length < 2) return null;
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'LineString',
      coordinates: list.map((stop) => [stop.lng, stop.lat]),
    },
  };
}

export function stopsToMapFeatures(stops, { idPrefix = '' } = {}) {
  return normalizeRouteStops(stops)
    .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng))
    .map((stop) => ({
      id: idPrefix ? `${idPrefix}-${stop.id}` : stop.id,
      name: stop.name,
      latitude: stop.lat,
      longitude: stop.lng,
      stop_type: stop.stopType,
      sequence: stop.sequence,
      ...(stop.studentId ? { studentId: stop.studentId } : {}),
    }));
}

/** One FeatureCollection of polylines for many routes (used on “All routes”). */
export function routesToGeoJsonCollection(routes = []) {
  const features = (routes || [])
    .map((route) => stopsToLineGeoJson(route.stops, {
      routeId: route.id,
      name: route.name,
    }))
    .filter(Boolean);
  if (!features.length) return null;
  return { type: 'FeatureCollection', features };
}

export function routesToStopFeatures(routes = []) {
  return (routes || []).flatMap((route) => (
    stopsToMapFeatures(route.stops, { idPrefix: String(route.id) }).map((stop) => ({
      ...stop,
      name: route.name ? `${stop.name} · ${route.name}` : stop.name,
      route_id: route.id,
    }))
  ));
}

/** Collect [lat, lng] pairs from stops, vehicles, and GeoJSON for map.fitBounds. */
export function collectMapLatLngs({ stops = [], vehicles = [], geoJson = null } = {}) {
  const points = [];

  stops.forEach((stop) => {
    const lat = Number(stop.latitude ?? stop.lat);
    const lng = Number(stop.longitude ?? stop.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) points.push([lat, lng]);
  });

  vehicles.forEach((vehicle) => {
    const lat = Number(vehicle.latitude ?? vehicle.lat);
    const lng = Number(vehicle.longitude ?? vehicle.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) points.push([lat, lng]);
  });

  const pushCoords = (coords, depth = 0) => {
    if (!Array.isArray(coords) || depth > 4) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) points.push([lat, lng]);
      return;
    }
    coords.forEach((item) => pushCoords(item, depth + 1));
  };

  const visitFeature = (feature) => {
    if (!feature?.geometry?.coordinates) return;
    pushCoords(feature.geometry.coordinates);
  };

  if (geoJson?.type === 'FeatureCollection') {
    (geoJson.features || []).forEach(visitFeature);
  } else if (geoJson?.type === 'Feature') {
    visitFeature(geoJson);
  }

  return points;
}

export function vehicleMatchesRoute(vehicle, route) {
  if (!vehicle || !route) return false;
  const routeId = String(route.id || route.routeId || '');
  const routeName = String(route.name || route.routeName || '').trim().toLowerCase();
  const vehicleRouteId = String(vehicle.route_id || vehicle.routeId || '');
  const vehicleRouteName = String(vehicle.route_name || vehicle.routeName || '').trim().toLowerCase();
  const vehicleId = String(vehicle.vehicle_id || vehicle.vehicleId || vehicle.id || '');
  const routeVehicleId = String(route.vehicleId || route.vehicle_id || route.vehicle?.id || '');
  if (routeId && vehicleRouteId && routeId === vehicleRouteId) return true;
  if (routeName && vehicleRouteName && routeName === vehicleRouteName) return true;
  // Driver GPS pings often omit route_id. Match the route's assigned vehicle.
  if (vehicleId && routeVehicleId && vehicleId === routeVehicleId) return true;
  return false;
}

/**
 * Fill route_id / vehicle_number from the vehicle catalog and route.vehicleId
 * when the live snapshot / WS event does not include them.
 */
export function attachRouteToLiveVehicle(vehicle, { routes = [], vehicles = [] } = {}) {
  if (!vehicle) return vehicle;
  const vid = String(vehicle.vehicle_id || vehicle.vehicleId || vehicle.id || '');
  const catalog = (vehicles || []).find((item) => (
    String(item.id || item.vehicleId) === vid
  ));
  const byRouteId = (routes || []).find((route) => {
    const id = String(route.id || route.routeId || '');
    const liveRouteId = String(vehicle.route_id || vehicle.routeId || catalog?.routeId || '');
    return id && liveRouteId && id === liveRouteId;
  });
  const byAssignedVehicle = (routes || []).find((route) => (
    vid && String(route.vehicleId || route.vehicle_id || route.vehicle?.id || '') === vid
  ));
  const route = byRouteId || byAssignedVehicle;
  const routeId = String(vehicle.route_id || vehicle.routeId || catalog?.routeId || route?.id || '');
  const routeName = vehicle.route_name || vehicle.routeName || catalog?.routeName || route?.name || '';
  const number = vehicle.vehicle_number || vehicle.vehicleNumber || catalog?.vehicleNumber || '';
  return {
    ...vehicle,
    route_id: routeId,
    routeId,
    route_name: routeName,
    routeName,
    vehicle_number: number,
    vehicleNumber: number,
  };
}

export function payloadStopsForApi(stops) {
  return normalizeRouteStops(stops).map((stop, index) => ({
    ...(stop.id && !String(stop.id).startsWith('tmp-') && !String(stop.id).startsWith('legacy-')
      ? { id: stop.id }
      : {}),
    name: stop.name,
    sequence: index + 1,
    lat: stop.lat,
    lng: stop.lng,
    radiusMeters: stop.radiusMeters || 80,
    stopType: stop.stopType || 'pickup',
    ...(stop.etaOffsetMin != null ? { etaOffsetMin: stop.etaOffsetMin } : {}),
    ...(stop.studentId ? { studentId: stop.studentId } : {}),
    ...(stop.applicationId ? { applicationId: stop.applicationId } : {}),
    ...(stop.addressLabel ? { addressLabel: stop.addressLabel } : {}),
    ...(stop.pinCode ? { pinCode: stop.pinCode } : {}),
  }));
}
