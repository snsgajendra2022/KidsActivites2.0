import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PlaceSearchInput from './PlaceSearchInput.jsx';
import { collectMapLatLngs } from '../../utils/transportRouteGeo.js';
import {
  bearingDegrees,
  geoJsonToLatLngs,
} from '../../services/geocoding/roadRouting.js';

const STATUS_COLORS = {
  running: '#0B6E4F',
  stopped: '#B54708',
  warning: '#B42318',
  offline: '#667085',
};

const FALLBACK_CENTER = [22.9734, 78.6569];
const FALLBACK_ZOOM = 5;
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function createBusIcon(status = 'running', selected = false) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.running;
  return L.divIcon({
    className: 'live-bus-marker',
    html: `<div style="
      width:28px;height:28px;border-radius:999px;border:2px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);background:${color};
      display:grid;place-items:center;color:#fff;font-size:12px;font-weight:700;
      outline:${selected ? '3px solid #0058be' : 'none'};
    ">B</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createStopIcon(stopType, sequence, studentCount) {
  const color = stopType === 'school' ? '#0058be' : '#111827';
  const label = sequence != null ? String(sequence) : '';
  const count = Number(studentCount);
  const badge = Number.isFinite(count) && count > 0
    ? `<span style="
        position:absolute;top:-6px;right:-8px;min-width:16px;height:16px;padding:0 4px;
        border-radius:999px;background:#0B6E4F;color:#fff;font-size:9px;font-weight:700;
        display:grid;place-items:center;border:1px solid #fff;
      ">${count > 9 ? '9+' : count}</span>`
    : '';
  return L.divIcon({
    className: 'live-stop-marker',
    html: `<div style="
      position:relative;min-width:${label ? 22 : 12}px;height:${label ? 22 : 12}px;padding:0 ${label ? 5 : 0}px;
      border-radius:999px;background:${color};color:#fff;font-size:11px;font-weight:700;
      display:grid;place-items:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25);
      cursor:pointer;
    ">${label}${badge}</div>`,
    iconSize: [label ? 22 : 12, label ? 22 : 12],
    iconAnchor: [label ? 11 : 6, label ? 11 : 6],
  });
}

function createArrowIcon(bearing) {
  return L.divIcon({
    className: 'route-dir-arrow',
    html: `<div style="
      width:18px;height:18px;display:grid;place-items:center;
      transform:rotate(${bearing}deg);
      filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));
    "><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 1 L12 11 L7 8.5 L2 11 Z" fill="#0058be" stroke="#fff" stroke-width="1"/>
    </svg></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function fitMapToPoints(map, points, { maxZoom = 15 } = {}) {
  if (!map || !points?.length) return false;
  if (points.length === 1) {
    map.setView(points[0], Math.min(14, maxZoom));
    return true;
  }
  map.fitBounds(points, { padding: [48, 48], maxZoom });
  return true;
}

function addRoadRouteLayers(map, geoJson) {
  const group = L.layerGroup();
  const latlngs = geoJsonToLatLngs(geoJson);
  if (latlngs.length < 2) {
    if (geoJson) {
      L.geoJSON(geoJson, {
        style: { color: '#0058be', weight: 5, opacity: 0.9 },
      }).addTo(group);
    }
    return group;
  }

  // Road casing + fill so the path reads like a road line on the map.
  L.polyline(latlngs, {
    color: '#0b1c30',
    weight: 8,
    opacity: 0.35,
    lineJoin: 'round',
    lineCap: 'round',
    interactive: false,
  }).addTo(group);

  L.polyline(latlngs, {
    color: '#0058be',
    weight: 5,
    opacity: 0.95,
    lineJoin: 'round',
    lineCap: 'round',
  }).addTo(group);

  // Direction arrows along the driving path.
  const step = Math.max(8, Math.floor(latlngs.length / 10));
  for (let i = 0; i < latlngs.length - 1; i += step) {
    const [lat1, lng1] = latlngs[i];
    const [lat2, lng2] = latlngs[Math.min(i + 1, latlngs.length - 1)];
    const mid = [(lat1 + lat2) / 2, (lng1 + lng2) / 2];
    const bearing = bearingDegrees(lat1, lng1, lat2, lng2);
    L.marker(mid, {
      icon: createArrowIcon(bearing),
      interactive: false,
      keyboard: false,
    }).addTo(group);
  }

  return group;
}

/**
 * Free live fleet map (Leaflet + OSM).
 * Route lines prefer on-road driving geometry with travel direction.
 */
export default function LiveBusMap({
  vehicles = [],
  selectedVehicleId,
  routeGeoJson = null,
  stopFeatures = [],
  onSelectVehicle,
  onSelectStop,
  className = '',
  fitToken = '',
  defaultCenter = null,
  searchBias = null,
  emptyTitle = 'No map locations yet',
  emptyHint = 'Select a route with mapped stops, or wait for live GPS from a bus.',
  showSearch = true,
  routingLabel = '',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markersRef = useRef(new Map());
  const routeLayerRef = useRef(null);
  const lastFitTokenRef = useRef('');
  const defaultCenterRef = useRef(defaultCenter);
  defaultCenterRef.current = defaultCenter;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = L.map(containerRef.current, {
      center: FALLBACK_CENTER,
      zoom: FALLBACK_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resize = () => {
      map.invalidateSize({ animate: false });
    };
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
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      routeLayerRef.current = null;
      lastFitTokenRef.current = '';
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (routeGeoJson) {
      routeLayerRef.current = addRoadRouteLayers(map, routeGeoJson).addTo(map);
    }
  }, [routeGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    const seen = new Set();

    vehicles.forEach((vehicle) => {
      const id = String(vehicle.vehicle_id || vehicle.vehicleId || vehicle.id);
      const lat = Number(vehicle.latitude ?? vehicle.lat);
      const lng = Number(vehicle.longitude ?? vehicle.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      seen.add(id);
      const selected = selectedVehicleId && String(selectedVehicleId) === id;
      const status = vehicle.tracking_status || vehicle.status;
      const icon = createBusIcon(status, selected);

      let marker = markersRef.current.get(id);
      if (!marker) {
        marker = L.marker([lat, lng], { icon })
          .addTo(layer)
          .on('click', () => onSelectVehicle?.(vehicle));
        markersRef.current.set(id, marker);
      } else {
        marker.setLatLng([lat, lng]);
        marker.setIcon(icon);
      }

      if (vehicle.heading != null && Number.isFinite(Number(vehicle.heading))) {
        const el = marker.getElement()?.querySelector('div');
        if (el) el.style.transform = `rotate(${Number(vehicle.heading)}deg)`;
      }
    });

    stopFeatures.forEach((stop) => {
      const id = `stop-${stop.id}`;
      if (!Number.isFinite(stop.latitude) || !Number.isFinite(stop.longitude)) return;
      seen.add(id);

      const markerSeq = stop.displaySequence != null ? stop.displaySequence : stop.sequence;
      const stopType = stop.stop_type || stop.stopType;
      const studentCount = stop.assignedStudentCount ?? stop.studentCount;
      const kmLabel = Number.isFinite(Number(stop.distanceFromBusKm))
        ? ` · ${Number(stop.distanceFromBusKm).toFixed(2)} km`
        : '';
      const countLabel = Number.isFinite(Number(studentCount)) && Number(studentCount) > 0
        ? ` · ${Number(studentCount)} student${Number(studentCount) === 1 ? '' : 's'}`
        : '';
      const popup = `${stop.name || 'Stop'}${markerSeq != null ? ` #${markerSeq}` : ''}${kmLabel}${countLabel}`;

      let marker = markersRef.current.get(id);
      if (!marker) {
        marker = L.marker([stop.latitude, stop.longitude], {
          icon: createStopIcon(stopType, markerSeq, studentCount),
        })
          .bindPopup(popup)
          .on('click', () => onSelectStop?.(stop))
          .addTo(layer);
        markersRef.current.set(id, marker);
      } else {
        marker.setLatLng([stop.latitude, stop.longitude]);
        marker.setIcon(createStopIcon(stopType, markerSeq, studentCount));
        marker.setPopupContent(popup);
        marker.off('click');
        marker.on('click', () => onSelectStop?.(stop));
      }
    });

    markersRef.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        layer.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    const points = collectMapLatLngs({
      stops: stopFeatures,
      vehicles,
      geoJson: routeGeoJson,
    });

    const token = String(fitToken || '');
    const shouldRefit = token !== lastFitTokenRef.current;
    if (shouldRefit) {
      lastFitTokenRef.current = token;
      if (points.length) {
        fitMapToPoints(map, points);
      } else {
        const center = defaultCenterRef.current;
        if (Array.isArray(center) && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
          map.setView(center, 12);
        } else {
          map.setView(FALLBACK_CENTER, FALLBACK_ZOOM);
        }
      }
    } else if (selectedVehicleId) {
      const selected = vehicles.find(
        (vehicle) => String(vehicle.vehicle_id || vehicle.vehicleId) === String(selectedVehicleId),
      );
      const lat = Number(selected?.latitude ?? selected?.lat);
      const lng = Number(selected?.longitude ?? selected?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        map.panTo([lat, lng], { animate: true });
      }
    }

    requestAnimationFrame(() => map.invalidateSize());
  }, [
    vehicles,
    selectedVehicleId,
    stopFeatures,
    routeGeoJson,
    onSelectVehicle,
    onSelectStop,
    fitToken,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !Array.isArray(defaultCenter)) return;
    const points = collectMapLatLngs({
      stops: stopFeatures,
      vehicles,
      geoJson: routeGeoJson,
    });
    if (points.length) return;
    map.setView(defaultCenter, 12);
  }, [defaultCenter, stopFeatures, vehicles, routeGeoJson]);

  const hasPoints = collectMapLatLngs({
    stops: stopFeatures,
    vehicles,
    geoJson: routeGeoJson,
  }).length > 0;

  return (
    <div className={`relative z-0 isolate h-full w-full min-h-0 overflow-hidden rounded-xl ${className}`}>
      {showSearch && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex justify-stretch p-2 sm:justify-end sm:p-3">
          <div className="pointer-events-auto w-full max-w-none rounded-xl border border-[#d0d5dd] bg-white/95 p-2 shadow-md backdrop-blur sm:max-w-sm lg:max-w-md">
            <PlaceSearchInput
              label=""
              placeholder="Search area to move the map…"
              latitude={searchBias?.lat}
              longitude={searchBias?.lng}
              onSelect={(place) => {
                const map = mapRef.current;
                if (!map) return;
                map.setView([place.latitude, place.longitude], 15);
              }}
            />
          </div>
        </div>
      )}

      {routingLabel ? (
        <div className="pointer-events-none absolute bottom-14 left-2 z-[450] max-w-[min(100%-1rem,220px)] rounded-lg border border-[#d0d5dd] bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-[#0b1c30] shadow-md sm:bottom-3 sm:left-3 sm:max-w-xs sm:px-3 sm:text-xs">
          {routingLabel}
        </div>
      ) : null}

      <div ref={containerRef} className="live-bus-map-canvas relative z-0 h-full w-full min-h-[280px]" />

      {!hasPoints && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[400] p-3 sm:p-4">
          <div className="rounded-xl border border-[#d0d5dd] bg-white/95 px-3 py-3 shadow-md sm:px-4">
            <p className="text-sm font-semibold text-[#0b1c30]">{emptyTitle}</p>
            <p className="mt-1 text-xs text-[#667085]">{emptyHint}</p>
          </div>
        </div>
      )}
    </div>
  );
}
