import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const STATUS_COLORS = {
  running: '#0B6E4F',
  stopped: '#B54708',
  warning: '#B42318',
  offline: '#667085',
};

function createBusElement(status = 'running') {
  const el = document.createElement('div');
  el.className = 'live-bus-marker';
  el.style.width = '28px';
  el.style.height = '28px';
  el.style.borderRadius = '999px';
  el.style.border = '2px solid #fff';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
  el.style.background = STATUS_COLORS[status] || STATUS_COLORS.running;
  el.style.display = 'grid';
  el.style.placeItems = 'center';
  el.style.color = '#fff';
  el.style.fontSize = '12px';
  el.style.fontWeight = '700';
  el.textContent = 'B';
  return el;
}

/**
 * Production Mapbox live fleet map.
 * Requires VITE_MAPBOX_TOKEN. Does not invent coordinates.
 */
export default function LiveBusMap({
  vehicles = [],
  selectedVehicleId,
  routeGeoJson = null,
  stopFeatures = [],
  onSelectVehicle,
  className = '',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return undefined;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [77.4126, 23.2599],
      zoom: 11,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');
    mapRef.current = map;
    const markers = markersRef.current;

    map.on('load', () => {
      if (routeGeoJson) {
        map.addSource('bus-route', { type: 'geojson', data: routeGeoJson });
        map.addLayer({
          id: 'bus-route-line',
          type: 'line',
          source: 'bus-route',
          paint: {
            'line-color': '#0058be',
            'line-width': 4,
            'line-opacity': 0.85,
          },
        });
      }
    });

    return () => {
      markers.forEach((marker) => marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [token, routeGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !token) return;

    const seen = new Set();
    const bounds = new mapboxgl.LngLatBounds();
    let hasPoint = false;

    vehicles.forEach((vehicle) => {
      const id = String(vehicle.vehicle_id || vehicle.vehicleId || vehicle.id);
      const lat = Number(vehicle.latitude ?? vehicle.lat);
      const lng = Number(vehicle.longitude ?? vehicle.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      seen.add(id);
      hasPoint = true;
      bounds.extend([lng, lat]);

      let marker = markersRef.current.get(id);
      if (!marker) {
        const el = createBusElement(vehicle.tracking_status || vehicle.status);
        el.addEventListener('click', () => onSelectVehicle?.(vehicle));
        marker = new mapboxgl.Marker({ element: el, rotationAlignment: 'map' })
          .setLngLat([lng, lat])
          .addTo(map);
        markersRef.current.set(id, marker);
      } else {
        const el = marker.getElement();
        el.style.background = STATUS_COLORS[vehicle.tracking_status || vehicle.status] || STATUS_COLORS.running;
        el.style.outline = selectedVehicleId && String(selectedVehicleId) === id
          ? '3px solid #0058be'
          : 'none';
        const current = marker.getLngLat();
        // Smooth ease to latest GPS point (real updates only)
        marker.setLngLat([lng, lat]);
        if (vehicle.heading != null) {
          el.style.transform += ''; // rotation handled via CSS if needed
          marker.setRotation(Number(vehicle.heading) || 0);
        }
        void current;
      }
    });

    stopFeatures.forEach((stop) => {
      const id = `stop-${stop.id}`;
      if (markersRef.current.has(id)) return;
      if (!Number.isFinite(stop.longitude) || !Number.isFinite(stop.latitude)) return;
      const el = document.createElement('div');
      el.style.width = '10px';
      el.style.height = '10px';
      el.style.borderRadius = '999px';
      el.style.background = stop.stop_type === 'school' ? '#0058be' : '#111827';
      el.style.border = '2px solid #fff';
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([stop.longitude, stop.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(stop.name || 'Stop'))
        .addTo(map);
      markersRef.current.set(id, marker);
      bounds.extend([stop.longitude, stop.latitude]);
      hasPoint = true;
    });

    // Remove stale vehicle markers
    markersRef.current.forEach((marker, id) => {
      if (id.startsWith('stop-')) return;
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    if (hasPoint && !map.__didFit) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
      map.__didFit = true;
    }
  }, [vehicles, selectedVehicleId, stopFeatures, onSelectVehicle, token]);

  if (!token) {
    return (
      <div className={`grid place-items-center rounded-xl border border-dashed border-[#c5d0e0] bg-[#f7f9fc] p-8 text-center text-sm text-[#667085] ${className}`}>
        <p className="font-semibold text-[#0b1c30]">Mapbox token required</p>
        <p className="mt-2 max-w-md">
          Set <code>VITE_MAPBOX_TOKEN</code> to render the live fleet map. Tracking APIs and WebSocket updates still work without the map canvas.
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className={`min-h-[420px] w-full overflow-hidden rounded-xl ${className}`} />;
}
