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
          name: String(stop.name || `Stop ${index + 1}`).trim() || `Stop ${index + 1}`,
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
  const routeName = String(route.name || route.routeName || '').toLowerCase();
  const vehicleRouteId = String(vehicle.route_id || vehicle.routeId || '');
  const vehicleRouteName = String(vehicle.route_name || vehicle.routeName || '').toLowerCase();
  if (routeId && vehicleRouteId && routeId === vehicleRouteId) return true;
  if (routeName && vehicleRouteName && routeName === vehicleRouteName) return true;
  return false;
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
