import { useEffect, useMemo, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import PlaceSearchInput from './PlaceSearchInput.jsx';
import StudentApplicationStopPicker from './StudentApplicationStopPicker.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import { normalizeRouteStops } from '../../utils/transportRouteGeo.js';
import {
  bearingDegrees,
  formatRouteDistance,
  formatRouteDuration,
  geoJsonToLatLngs,
} from '../../services/geocoding/roadRouting.js';
import useRoadRoute from '../../hooks/useRoadRoute.js';

const FALLBACK_CENTER = [22.9734, 78.6569];
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_MAX_ZOOM = 22;
const MAP_MIN_ZOOM = 3;
const OSM_MAX_NATIVE_ZOOM = 19;

function makeStopId() {
  return `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function stopIcon(sequence, stopType) {
  const color = stopType === 'school' ? '#0058be' : '#0b1c30';
  return L.divIcon({
    className: 'route-stop-marker',
    html: `<div style="
      min-width:22px;height:22px;padding:0 5px;border-radius:999px;background:${color};
      color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25);
    ">${sequence}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function arrowIcon(bearing) {
  return L.divIcon({
    className: 'route-dir-arrow',
    html: `<div style="width:16px;height:16px;display:grid;place-items:center;transform:rotate(${bearing}deg);">
      <svg width="12" height="12" viewBox="0 0 14 14"><path d="M7 1 L12 11 L7 8.5 L2 11 Z" fill="#0058be" stroke="#fff" stroke-width="1"/></svg>
    </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/**
 * Map + place search editor for ordered route stops with real coordinates.
 */
export default function RouteStopsEditor({
  value = [],
  onChange,
  initialCenter = null,
  searchBias = null,
}) {
  const stops = useMemo(() => normalizeRouteStops(value), [value]);
  const roadRoute = useRoadRoute(stops);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const lineRef = useRef(null);
  const stopsRef = useRef(stops);
  const onChangeRef = useRef(onChange);
  stopsRef.current = stops;
  onChangeRef.current = onChange;

  const bias = searchBias || (
    Array.isArray(initialCenter)
      ? { lat: initialCenter[0], lng: initialCenter[1] }
      : { lat: FALLBACK_CENTER[0], lng: FALLBACK_CENTER[1] }
  );

  const commit = (next) => {
    onChangeRef.current?.(normalizeRouteStops(next).map((stop, index) => ({
      ...stop,
      sequence: index + 1,
    })));
  };

  const addStop = (payload) => {
    const lat = Number(payload?.lat);
    const lng = Number(payload?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const current = stopsRef.current;
    const alreadyStudent = payload.studentId
      && current.some((stop) => String(stop.studentId) === String(payload.studentId));
    if (alreadyStudent) return;

    commit([
      ...current,
      {
        id: payload.id || makeStopId(),
        name: payload.name || `Stop ${current.length + 1}`,
        lat,
        lng,
        radiusMeters: payload.radiusMeters || 80,
        stopType: payload.stopType || 'pickup',
        sequence: current.length + 1,
        ...(payload.studentId ? { studentId: payload.studentId } : {}),
        ...(payload.applicationId ? { applicationId: payload.applicationId } : {}),
        ...(payload.addressLabel ? { addressLabel: payload.addressLabel } : {}),
        ...(payload.pinCode ? { pinCode: payload.pinCode } : {}),
      },
    ]);
  };

  const addStopsBatch = (batch = []) => {
    if (!Array.isArray(batch) || !batch.length) return;
    const current = [...stopsRef.current];
    const seenStudents = new Set(
      current.filter((stop) => stop.studentId).map((stop) => String(stop.studentId)),
    );

    batch.forEach((payload) => {
      const lat = Number(payload?.lat);
      const lng = Number(payload?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (payload.studentId && seenStudents.has(String(payload.studentId))) return;

      current.push({
        id: payload.id || makeStopId(),
        name: payload.name || `Stop ${current.length + 1}`,
        lat,
        lng,
        radiusMeters: payload.radiusMeters || 80,
        stopType: payload.stopType || 'pickup',
        sequence: current.length + 1,
        ...(payload.studentId ? { studentId: payload.studentId } : {}),
        ...(payload.applicationId ? { applicationId: payload.applicationId } : {}),
        ...(payload.addressLabel ? { addressLabel: payload.addressLabel } : {}),
        ...(payload.pinCode ? { pinCode: payload.pinCode } : {}),
      });
      if (payload.studentId) seenStudents.add(String(payload.studentId));
    });

    commit(current);
  };

  const updateStop = (id, patch) => {
    commit(stops.map((stop) => (stop.id === id ? { ...stop, ...patch } : stop)));
  };

  const removeStop = (id) => {
    commit(stops.filter((stop) => stop.id !== id));
  };

  const moveStop = (id, direction) => {
    const index = stops.findIndex((stop) => stop.id === id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= stops.length) return;
    const next = [...stops];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    commit(next);
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const start = Array.isArray(initialCenter) && Number.isFinite(initialCenter[0])
      ? initialCenter
      : FALLBACK_CENTER;

    const map = L.map(containerRef.current, {
      center: start,
      zoom: Array.isArray(initialCenter) ? 13 : 5,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer(OSM_TILE_URL, {
      attribution: '',
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      maxNativeZoom: OSM_MAX_NATIVE_ZOOM,
      keepBuffer: 2,
      updateWhenZooming: true,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on('click', (event) => {
      const current = stopsRef.current;
      onChangeRef.current?.(normalizeRouteStops([
        ...current,
        {
          id: makeStopId(),
          name: `Stop ${current.length + 1}`,
          lat: event.latlng.lat,
          lng: event.latlng.lng,
          radiusMeters: 80,
          stopType: 'pickup',
          sequence: current.length + 1,
        },
      ]).map((stop, index) => ({ ...stop, sequence: index + 1 })));
    });

    const resize = () => map.invalidateSize({ animate: false });
    requestAnimationFrame(resize);
    const timer = setTimeout(resize, 250);
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => resize());
      observer.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      observer?.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      lineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map boots once per editor mount
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!Array.isArray(initialCenter)) return;
    const withCoords = stops.filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
    if (withCoords.length) return;
    map.setView(initialCenter, 13);
  }, [initialCenter, stops]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (lineRef.current) {
      map.removeLayer(lineRef.current);
      lineRef.current = null;
    }

    const withCoords = stops.filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
    withCoords.forEach((stop, index) => {
      L.marker([stop.lat, stop.lng], { icon: stopIcon(index + 1, stop.stopType) })
        .bindPopup(stop.name)
        .addTo(layer);
    });

    const latlngs = geoJsonToLatLngs(roadRoute.geoJson);
    if (latlngs.length >= 2) {
      const group = L.layerGroup();
      L.polyline(latlngs, {
        color: '#0b1c30',
        weight: 7,
        opacity: 0.3,
        lineJoin: 'round',
        lineCap: 'round',
        interactive: false,
      }).addTo(group);
      L.polyline(latlngs, {
        color: '#0058be',
        weight: 4,
        opacity: 0.95,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(group);
      const step = Math.max(6, Math.floor(latlngs.length / 8));
      for (let i = 0; i < latlngs.length - 1; i += step) {
        const [lat1, lng1] = latlngs[i];
        const [lat2, lng2] = latlngs[Math.min(i + 1, latlngs.length - 1)];
        L.marker([(lat1 + lat2) / 2, (lng1 + lng2) / 2], {
          icon: arrowIcon(bearingDegrees(lat1, lng1, lat2, lng2)),
          interactive: false,
          keyboard: false,
        }).addTo(group);
      }
      lineRef.current = group.addTo(map);
    } else if (withCoords.length >= 2) {
      lineRef.current = L.polyline(
        withCoords.map((stop) => [stop.lat, stop.lng]),
        { color: '#0058be', weight: 4, opacity: 0.7, dashArray: '6 8' },
      ).addTo(map);
    }

    if (withCoords.length === 1) {
      map.setView([withCoords[0].lat, withCoords[0].lng], 14);
    } else if (withCoords.length > 1) {
      map.fitBounds(withCoords.map((stop) => [stop.lat, stop.lng]), { padding: [40, 40] });
    }

    map.invalidateSize();
  }, [stops, roadRoute.geoJson]);

  const routeMeta = [
    roadRoute.loading ? 'Building on-road path…' : null,
    roadRoute.source === 'osrm' ? formatRouteDistance(roadRoute.distanceMeters) : null,
    roadRoute.source === 'osrm' ? formatRouteDuration(roadRoute.durationSeconds) : null,
    roadRoute.source === 'straight' ? 'Straight fallback' : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="space-y-3">
      <StudentApplicationStopPicker
        existingStops={stops}
        searchBias={bias}
        onAddStops={(batch) => {
          addStopsBatch(batch);
          const last = batch?.[batch.length - 1];
          if (last && Number.isFinite(last.lat) && Number.isFinite(last.lng)) {
            mapRef.current?.setView([last.lat, last.lng], 13);
          }
        }}
      />

      <PlaceSearchInput
        label="Or search a place / landmark"
        placeholder="Type area, school, landmark, or full address…"
        latitude={bias.lat}
        longitude={bias.lng}
        onSelect={(place) => {
          mapRef.current?.setView([place.latitude, place.longitude], 16);
          addStop({
            name: place.name,
            lat: place.latitude,
            lng: place.longitude,
          });
        }}
      />

      <p className="text-xs text-[#667085]">
        Prefer selecting students so stops come from enrollment application addresses. You can also search or click the map.
        Stop order builds an on-road driving path.
        {routeMeta ? ` ${routeMeta}.` : ''}
      </p>

      <div
        ref={containerRef}
        className="h-[min(45vh,300px)] w-full overflow-hidden rounded-xl border border-[#d0d5dd] sm:h-[340px] lg:h-[380px]"
      />

      <div className="space-y-2">
        {stops.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#c5c6cd] bg-[#f8f9ff] px-3 py-4 text-sm text-[#667085]">
            No stops yet. Search your area (city / landmark) first, then click the map for exact pickup points.
          </p>
        ) : stops.map((stop, index) => (
          <div key={stop.id} className="rounded-lg border border-[#d0d5dd] bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">
                Stop {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" className="rounded p-1 text-[#667085] hover:bg-[#eef2ff]" onClick={() => moveStop(stop.id, -1)} aria-label="Move up">
                  <ArrowUp size={14} />
                </button>
                <button type="button" className="rounded p-1 text-[#667085] hover:bg-[#eef2ff]" onClick={() => moveStop(stop.id, 1)} aria-label="Move down">
                  <ArrowDown size={14} />
                </button>
                <button type="button" className="rounded p-1 text-[#b42318] hover:bg-[#fee4e2]" onClick={() => removeStop(stop.id)} aria-label="Remove stop">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_140px]">
              <Input
                label="Stop name"
                value={stop.name}
                onChange={(event) => updateStop(stop.id, { name: event.target.value })}
              />
              <Select
                label="Type"
                value={stop.stopType || 'pickup'}
                options={[
                  { value: 'pickup', label: 'Pickup' },
                  { value: 'drop', label: 'Drop' },
                  { value: 'school', label: 'School' },
                ]}
                onChange={(event) => updateStop(stop.id, { stopType: event.target.value })}
              />
            </div>
            <p className="mt-2 text-xs text-[#667085]">
              {Number.isFinite(stop.lat) && Number.isFinite(stop.lng)
                ? `${Number(stop.lat).toFixed(5)}, ${Number(stop.lng).toFixed(5)}`
                : 'Location missing — search again or click the map.'}
              {stop.pinCode ? ` · PIN ${stop.pinCode}` : ''}
              {stop.addressLabel ? ` · ${stop.addressLabel}` : ''}
              {stop.studentId ? ' · from application' : ''}
            </p>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => addStop({
          name: `Stop ${stops.length + 1}`,
          lat: mapRef.current?.getCenter()?.lat ?? bias.lat,
          lng: mapRef.current?.getCenter()?.lng ?? bias.lng,
        })}
      >
        <Plus size={14} /> Add stop at map center
      </Button>
    </div>
  );
}
