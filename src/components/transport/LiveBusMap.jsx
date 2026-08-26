import { useEffect, useRef, useState } from 'react';
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
/**
 * Hard zoom cap = free tile depth only.
 * Past this, Carto used to show “basemaps API key required” placeholders —
 * we no longer use Carto, and zoom cannot go past this limit.
 */
const MAP_MAX_ZOOM = 18;
const MAP_MIN_ZOOM = 3;
const MAP_TYPE_STORAGE_KEY = 'transport-live-map-type';

/**
 * Free basemaps with clear road + place labels (schools, hospitals, shops).
 * No Carto — avoids “API key required” tiles at deep zoom.
 */
const MAP_TILES = {
  default: {
    // Esri World Street Map: readable road names + POI labels (school/hospital/shop).
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '',
    maxZoom: MAP_MAX_ZOOM,
    maxNativeZoom: 18,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '',
    maxZoom: MAP_MAX_ZOOM,
    maxNativeZoom: 17,
  },
};

/** Street underlay when satellite imagery thins out at high zoom. */
const STREET_UNDERLAY = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  attribution: '',
  maxZoom: MAP_MAX_ZOOM,
  maxNativeZoom: 18,
};

/** Place names (schools, hospitals, towns) on satellite. */
const PLACE_LABELS = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  attribution: '',
  maxZoom: MAP_MAX_ZOOM,
  maxNativeZoom: 18,
};

/** Road / street names on satellite. */
const ROAD_LABELS = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
  attribution: '',
  maxZoom: MAP_MAX_ZOOM,
  maxNativeZoom: 18,
};

function tileLayerOptions(tiles) {
  return {
    attribution: tiles.attribution,
    minZoom: MAP_MIN_ZOOM,
    maxZoom: tiles.maxZoom ?? MAP_MAX_ZOOM,
    maxNativeZoom: tiles.maxNativeZoom ?? tiles.maxZoom ?? MAP_MAX_ZOOM,
    subdomains: tiles.subdomains || 'abc',
    keepBuffer: 2,
    updateWhenIdle: true,
    updateWhenZooming: false,
    detectRetina: false,
  };
}

function readStoredMapType() {
  try {
    const stored = window.localStorage?.getItem(MAP_TYPE_STORAGE_KEY);
    if (stored === 'satellite' || stored === 'default') return stored;
  } catch {
    // ignore private-mode / storage errors
  }
  return 'default';
}

function writeStoredMapType(nextType) {
  try {
    window.localStorage?.setItem(MAP_TYPE_STORAGE_KEY, nextType);
  } catch {
    // ignore private-mode / storage errors
  }
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function canRequestFullscreen(el) {
  return Boolean(el && (el.requestFullscreen || el.webkitRequestFullscreen));
}

function requestElementFullscreen(el) {
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  return Promise.reject(new Error('Fullscreen API unavailable'));
}

function exitElementFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  return Promise.resolve();
}

const BUS_MARKER_SIZE = 54;

const BUS_BODY_PATH = 'M16 6 H62 Q72 6 78 13 Q84 20 84 29 V32 Q84 38 78 38 H14 Q7 38 7 31 V14 Q7 6 16 6 Z';

/**
 * Cartoon sticker school bus, side view facing east.
 * Layer order builds the sticker look: white die-cut halo, dark-outlined body,
 * painted details, then wheels on top. Heading rotates with heading - 90.
 */
function busGlyphSvg() {
  return `<svg class="live-bus-glyph" viewBox="0 0 92 52" width="48" height="27" aria-hidden="true" focusable="false">
    <g fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8" stroke-linejoin="round">
      <circle cx="25" cy="40" r="6.8"/>
      <circle cx="67" cy="40" r="6.8"/>
      <path d="${BUS_BODY_PATH}"/>
    </g>
    <path d="${BUS_BODY_PATH}" fill="#FFC42E" stroke="#1D2233" stroke-width="3.2" stroke-linejoin="round"/>
    <rect x="24" y="8.2" width="30" height="2.6" rx="1.3" fill="#FFFFFF" opacity=".42"/>
    <g fill="#BCE3FF" stroke="#1D2233" stroke-width="2.2" stroke-linejoin="round">
      <rect x="12.5" y="11.6" width="13.5" height="12.4" rx="4"/>
      <rect x="29.5" y="11.6" width="13.5" height="12.4" rx="4"/>
      <rect x="46.5" y="11.6" width="11" height="12.4" rx="4"/>
      <path d="M62 11.6 H64.6 Q70.6 11.6 74.6 15.6 Q78.3 19.3 78.7 22.6 Q78.9 24 77.4 24 H62 Q60.6 24 60.6 22.6 V13 Q60.6 11.6 62 11.6 Z"/>
    </g>
    <g fill="#FFFFFF" opacity=".6">
      <rect x="14.6" y="13.6" width="5.4" height="2.3" rx="1.15"/>
      <rect x="31.6" y="13.6" width="5.4" height="2.3" rx="1.15"/>
      <rect x="48.6" y="13.6" width="4.6" height="2.3" rx="1.15"/>
      <rect x="62.8" y="13.6" width="5.4" height="2.3" rx="1.15"/>
    </g>
    <rect x="12.5" y="27" width="57" height="3.2" rx="1.6" fill="#1D2233" opacity=".82"/>
    <rect x="7.8" y="27" width="3.6" height="6" rx="1.4" fill="#F04438" stroke="#1D2233" stroke-width="1.1"/>
    <rect x="72.6" y="31.4" width="7.6" height="4.2" rx="2.1" fill="#3A4255" stroke="#1D2233" stroke-width="1.1"/>
    <circle cx="79.4" cy="27.6" r="3.2" fill="#FFF3B8" stroke="#1D2233" stroke-width="1.6"/>
    <g fill="#2C3242" stroke="#1D2233" stroke-width="3.2">
      <circle cx="25" cy="40" r="6.8"/>
      <circle cx="67" cy="40" r="6.8"/>
    </g>
    <g fill="#F5F7FC" stroke="#1D2233" stroke-width="1.8">
      <circle cx="25" cy="40" r="3.1"/>
      <circle cx="67" cy="40" r="3.1"/>
    </g>
    <g fill="#8891A6">
      <circle cx="25" cy="40" r="1"/>
      <circle cx="67" cy="40" r="1"/>
    </g>
  </svg>`;
}

/**
 * The sticker is drawn facing east, so it rotates by heading - 90. Westward
 * headings are mirrored instead of rotated past vertical to keep it upright.
 */
function busHeadingTransform(heading) {
  const degrees = ((Number(heading) % 360) + 360) % 360;
  const mirrored = degrees > 180 && degrees < 360;
  return `rotate(${degrees - 90}deg)${mirrored ? ' scaleY(-1)' : ''}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncateLabel(value, max = 32) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function resolveStopName(stop) {
  const candidates = [
    stop?.name,
    stop?.stopName,
    stop?.stop_name,
    stop?.addressLabel,
    stop?.address,
  ];
  for (const value of candidates) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  const stopType = stop?.stop_type || stop?.stopType;
  return stopType === 'school' ? 'School' : 'Stop';
}

function resolveVehicleLabel(vehicle) {
  const candidates = [
    vehicle?.vehicle_number,
    vehicle?.vehicleNumber,
    vehicle?.name,
    vehicle?.label,
    vehicle?.vehicle_id,
    vehicle?.vehicleId,
    vehicle?.id,
  ];
  for (const value of candidates) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return 'Bus';
}

function createBusIcon(status = 'running', selected = false, vehicleLabel = '') {
  const color = STATUS_COLORS[status] || STATUS_COLORS.running;
  const label = truncateLabel(vehicleLabel, 18);
  const labelHtml = label
    ? `<span class="live-bus-name-chip">${escapeHtml(label)}</span>`
    : '';
  return L.divIcon({
    className: 'live-bus-marker',
    html: `<div class="live-bus-marker-wrap">
      <div class="live-bus-marker-body${selected ? ' is-selected' : ''}" style="--bus-ring:${color}">${busGlyphSvg()}<span class="live-bus-status"></span></div>
      ${labelHtml}
    </div>`,
    iconSize: [120, 70],
    iconAnchor: [60, 27],
  });
}

function createStopIcon(stopType, sequence, studentCount, stopName) {
  const color = stopType === 'school' ? '#0058be' : '#111827';
  const seq = sequence != null ? String(sequence) : '';
  const name = truncateLabel(stopName || (stopType === 'school' ? 'School' : 'Stop'), 34);
  const count = Number(studentCount);
  const badge = Number.isFinite(count) && count > 0
    ? `<span class="live-stop-count">${count > 9 ? '9+' : count}</span>`
    : '';
  return L.divIcon({
    className: 'live-stop-marker',
    html: `<div class="live-stop-pin">
      <div class="live-stop-dot" style="background:${color}">
        ${seq ? `<span class="live-stop-seq">${escapeHtml(seq)}</span>` : ''}
        ${badge}
      </div>
      <div class="live-stop-label" title="${escapeHtml(stopName || name)}">
        <span class="live-stop-name">${escapeHtml(name)}</span>
      </div>
    </div>`,
    iconSize: [168, 36],
    iconAnchor: [14, 18],
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
  const [mapType, setMapType] = useState(readStoredMapType);
  const [apiFullscreen, setApiFullscreen] = useState(false);
  const [cssFullscreen, setCssFullscreen] = useState(false);
  const shellRef = useRef(null);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const isFullscreen = apiFullscreen || cssFullscreen;
  const layerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const underlayTileLayerRef = useRef(null);
  const labelsTileLayerRef = useRef(null);
  const markersRef = useRef(new Map());
  const routeLayerRef = useRef(null);
  const lastFitTokenRef = useRef('');
  const defaultCenterRef = useRef(defaultCenter);
  defaultCenterRef.current = defaultCenter;

  const applyMapType = (nextType) => {
    if (nextType !== 'default' && nextType !== 'satellite') return;
    if (nextType === mapType) return;
    setMapType(nextType);
    writeStoredMapType(nextType);
  };

  const invalidateMapSoon = () => {
    const resize = () => mapRef.current?.invalidateSize({ animate: false });
    requestAnimationFrame(resize);
    setTimeout(resize, 80);
    setTimeout(resize, 280);
  };

  const exitFullscreen = async () => {
    setCssFullscreen(false);
    if (getFullscreenElement()) {
      try {
        await exitElementFullscreen();
      } catch {
        // browser may already have exited
      }
    }
  };

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await exitFullscreen();
      return;
    }
    const shell = shellRef.current;
    if (canRequestFullscreen(shell)) {
      try {
        await requestElementFullscreen(shell);
        return;
      } catch {
        // iOS Safari / denied permission — CSS overlay fallback
      }
    }
    setCssFullscreen(true);
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = L.map(containerRef.current, {
      center: FALLBACK_CENTER,
      zoom: FALLBACK_ZOOM,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      zoomControl: false,
      attributionControl: false,
      // Integer zoom keeps tiles aligned to native resolution (no soft scaling).
      zoomSnap: 1,
      zoomDelta: 1,
      wheelPxPerZoomLevel: 100,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

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
      tileLayerRef.current = null;
      underlayTileLayerRef.current = null;
      labelsTileLayerRef.current = null;
      routeLayerRef.current = null;
      lastFitTokenRef.current = '';
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const removeTileRefs = () => {
      [tileLayerRef, underlayTileLayerRef, labelsTileLayerRef].forEach((ref) => {
        if (ref.current) {
          map.removeLayer(ref.current);
          ref.current = null;
        }
      });
    };

    removeTileRefs();

    const tiles = MAP_TILES[mapType] || MAP_TILES.default;

    if (mapType === 'satellite') {
      const underlay = L.tileLayer(STREET_UNDERLAY.url, tileLayerOptions(STREET_UNDERLAY)).addTo(map);
      underlay.setZIndex(100);
      underlayTileLayerRef.current = underlay;
    }

    const nextLayer = L.tileLayer(tiles.url, tileLayerOptions(tiles)).addTo(map);
    nextLayer.setZIndex(mapType === 'satellite' ? 200 : 100);
    tileLayerRef.current = nextLayer;

    // Satellite: overlay clear road names + place names (schools/hospitals/towns).
    if (mapType === 'satellite') {
      const overlays = L.layerGroup();
      const roads = L.tileLayer(ROAD_LABELS.url, {
        ...tileLayerOptions(ROAD_LABELS),
        opacity: 0.95,
      });
      const places = L.tileLayer(PLACE_LABELS.url, {
        ...tileLayerOptions(PLACE_LABELS),
        opacity: 0.98,
      });
      roads.addTo(overlays);
      places.addTo(overlays);
      overlays.addTo(map);
      labelsTileLayerRef.current = overlays;
    }

    // Snap to integer zoom so tiles stay crisp after type switch.
    const zoom = map.getZoom();
    if (Number.isFinite(zoom)) {
      map.setZoom(Math.round(Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, zoom))), {
        animate: false,
      });
    }

    return () => {
      if (!mapRef.current) return;
      [tileLayerRef, underlayTileLayerRef, labelsTileLayerRef].forEach((ref) => {
        if (ref.current) {
          mapRef.current.removeLayer(ref.current);
          ref.current = null;
        }
      });
    };
  }, [mapType]);

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
      const vehicleLabel = resolveVehicleLabel(vehicle);
      const icon = createBusIcon(status, selected, vehicleLabel);

      let marker = markersRef.current.get(id);
      if (!marker) {
        marker = L.marker([lat, lng], { icon, zIndexOffset: 600 })
          .bindTooltip(vehicleLabel, {
            direction: 'top',
            offset: [0, -28],
            opacity: 0.95,
            className: 'live-map-tooltip',
          })
          .addTo(layer)
          .on('click', () => onSelectVehicle?.(vehicle));
        markersRef.current.set(id, marker);
      } else {
        marker.setLatLng([lat, lng]);
        marker.setIcon(icon);
        marker.setTooltipContent(vehicleLabel);
      }

      if (vehicle.heading != null && Number.isFinite(Number(vehicle.heading))) {
        const el = marker.getElement()?.querySelector('.live-bus-glyph');
        if (el) el.style.transform = busHeadingTransform(vehicle.heading);
      }
    });

    stopFeatures.forEach((stop) => {
      const id = `stop-${stop.id}`;
      if (!Number.isFinite(stop.latitude) || !Number.isFinite(stop.longitude)) return;
      seen.add(id);

      const markerSeq = stop.displaySequence != null ? stop.displaySequence : stop.sequence;
      const stopType = stop.stop_type || stop.stopType;
      const studentCount = stop.assignedStudentCount ?? stop.studentCount;
      const stopName = resolveStopName(stop);
      const kmLabel = Number.isFinite(Number(stop.distanceFromBusKm))
        ? ` · ${Number(stop.distanceFromBusKm).toFixed(2)} km`
        : '';
      const countLabel = Number.isFinite(Number(studentCount)) && Number(studentCount) > 0
        ? ` · ${Number(studentCount)} student${Number(studentCount) === 1 ? '' : 's'}`
        : '';
      const popup = `${stopName}${markerSeq != null ? ` (#${markerSeq})` : ''}${kmLabel}${countLabel}`;
      const stopIcon = createStopIcon(stopType, markerSeq, studentCount, stopName);

      let marker = markersRef.current.get(id);
      if (!marker) {
        marker = L.marker([stop.latitude, stop.longitude], {
          icon: stopIcon,
          zIndexOffset: 400,
        })
          .bindPopup(popup)
          .bindTooltip(stopName, {
            direction: 'right',
            offset: [18, 0],
            opacity: 0.95,
            className: 'live-map-tooltip',
          })
          .on('click', () => onSelectStop?.(stop))
          .addTo(layer);
        markersRef.current.set(id, marker);
      } else {
        marker.setLatLng([stop.latitude, stop.longitude]);
        marker.setIcon(stopIcon);
        marker.setPopupContent(popup);
        marker.setTooltipContent(stopName);
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

  useEffect(() => {
    const onFullscreenChange = () => {
      setApiFullscreen(getFullscreenElement() === shellRef.current);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!cssFullscreen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setCssFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cssFullscreen]);

  useEffect(() => {
    invalidateMapSoon();
  }, [isFullscreen]);

  const hasPoints = collectMapLatLngs({
    stops: stopFeatures,
    vehicles,
    geoJson: routeGeoJson,
  }).length > 0;

  return (
    <div
      ref={shellRef}
      className={`live-bus-map-shell relative z-0 isolate h-full w-full min-h-0 overflow-hidden rounded-xl ${
        cssFullscreen ? 'fixed inset-0 z-[2000] !h-[100dvh] !w-screen !rounded-none bg-[#0b1c30]' : ''
      } ${className}`}
    >
      <style>{`
        .live-bus-map-shell:fullscreen,
        .live-bus-map-shell:-webkit-full-screen {
          width: 100%;
          height: 100%;
          border-radius: 0;
          background: #0b1c30;
        }
        .live-bus-marker {
          background: transparent !important;
          border: none !important;
          overflow: visible !important;
        }
        .live-stop-marker {
          background: transparent !important;
          border: none !important;
          overflow: visible !important;
        }
        .live-bus-marker-wrap {
          position: relative;
          width: 120px;
          height: 70px;
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: auto;
        }
        .live-bus-marker-body {
          position: relative;
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          filter: drop-shadow(0 3px 4px rgba(11, 18, 32, 0.45));
          transition: transform 0.2s ease;
        }
        .live-bus-marker-body::before {
          content: '';
          position: absolute;
          inset: 2px;
          border-radius: 999px;
          border: 3px solid transparent;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .live-bus-marker-body.is-selected {
          transform: scale(1.12);
        }
        .live-bus-marker-body.is-selected::before {
          border-color: #0058be;
          background: rgba(0, 88, 190, 0.16);
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92);
        }
        .live-bus-name-chip {
          margin-top: 2px;
          max-width: 110px;
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #d0d5dd;
          box-shadow: 0 1px 3px rgba(11, 18, 32, 0.18);
          color: #0b1c30;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
        }
        .live-bus-glyph {
          position: relative;
          z-index: 1;
          display: block;
          transform-origin: center center;
          transition: transform 0.35s ease;
        }
        .live-bus-status {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 2;
          width: 11px;
          height: 11px;
          border-radius: 999px;
          background: var(--bus-ring, #0B6E4F);
          border: 2.5px solid #fff;
        }
        .live-stop-pin {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 36px;
          pointer-events: auto;
        }
        .live-stop-dot {
          position: relative;
          flex: 0 0 auto;
          min-width: 22px;
          height: 22px;
          padding: 0 5px;
          border-radius: 999px;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          display: grid;
          place-items: center;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
        }
        .live-stop-seq {
          line-height: 1;
        }
        .live-stop-count {
          position: absolute;
          top: -7px;
          right: -9px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 999px;
          background: #0B6E4F;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          display: grid;
          place-items: center;
          border: 1px solid #fff;
        }
        .live-stop-label {
          max-width: 140px;
          padding: 3px 8px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #d0d5dd;
          box-shadow: 0 1px 4px rgba(11, 18, 32, 0.16);
        }
        .live-stop-name {
          display: block;
          color: #0b1c30;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .live-map-tooltip {
          background: #0b1c30 !important;
          color: #fff !important;
          border: none !important;
          border-radius: 8px !important;
          padding: 4px 8px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          box-shadow: 0 2px 8px rgba(11, 18, 32, 0.28) !important;
        }
        .live-map-tooltip::before {
          border-top-color: #0b1c30 !important;
          border-right-color: #0b1c30 !important;
        }
        .live-bus-map-shell .leaflet-container {
          background: #e8eef5;
          font: inherit;
        }
        .live-bus-map-shell .leaflet-control-attribution {
          display: none !important;
        }
        .live-bus-map-shell .leaflet-tile {
          image-rendering: auto;
          filter: none !important;
        }
        .live-bus-map-shell .leaflet-zoom-anim .leaflet-zoom-animated {
          will-change: transform;
        }
      `}</style>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col gap-1.5 p-1.5 sm:flex-row sm:items-start sm:justify-between sm:p-2">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 self-start rounded-lg border border-[#d0d5dd] bg-white/95 p-1 shadow-md backdrop-blur">
          <div className="flex overflow-hidden rounded-md border border-[#d0d5dd]" role="group" aria-label="Map type">
            {[
              { id: 'default', label: 'Default' },
              { id: 'satellite', label: 'Satellite' },
            ].map((option) => {
              const active = mapType === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyMapType(option.id)}
                  className={`min-h-8 px-2 text-[11px] font-semibold leading-none ${
                    active
                      ? 'bg-[#0058be] text-white'
                      : 'bg-white text-[#475467] hover:bg-[#f8f9ff]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-pressed={isFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onClick={() => void toggleFullscreen()}
            className={`inline-flex min-h-8 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold leading-none ${
              isFullscreen
                ? 'border-[#0058be] bg-[#0058be] text-white'
                : 'border-[#d0d5dd] bg-white text-[#475467] hover:bg-[#f8f9ff]'
            }`}
          >
            {isFullscreen ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8 3H4a1 1 0 0 0-1 1v4M16 3h4a1 1 0 0 1 1 1v4M8 21H4a1 1 0 0 1-1-1v-4M16 21h4a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            )}
            {isFullscreen ? 'Exit' : 'Full'}
          </button>
        </div>

        {showSearch && !isFullscreen ? (
          <div className="pointer-events-auto w-full max-w-none rounded-lg border border-[#d0d5dd] bg-white/95 p-1.5 shadow-md backdrop-blur sm:max-w-sm lg:max-w-md">
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
        ) : null}
      </div>

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
