import { Flag, School } from 'lucide-react';
import { normalizeRouteStops, resolveStopDisplayName } from '../../utils/transportRouteGeo.js';

const TYPE_LABEL = {
  pickup: 'Pickup',
  drop: 'Drop',
  school: 'School',
};

function prepareTimelineStops(stops) {
  const raw = Array.isArray(stops) ? stops : [];
  const hasDisplayOrder = raw.some((stop) => stop?.displaySequence != null);
  if (!hasDisplayOrder) return normalizeRouteStops(raw);

  // Preserve rotated display order; do not re-sort by original sequence.
  return raw
    .map((stop, index) => {
      if (!stop || typeof stop !== 'object') return null;
      const lat = Number(stop.lat ?? stop.latitude);
      const lng = Number(stop.lng ?? stop.longitude);
      return {
        id: String(stop.id || stop.stopId || `stop-${index + 1}`),
        name: resolveStopDisplayName(stop, index),
        sequence: Number(stop.sequence) || index + 1,
        displaySequence: Number(stop.displaySequence) || index + 1,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        stopType: stop.stopType || stop.stop_type || 'pickup',
        distanceFromBusKm: Number.isFinite(Number(stop.distanceFromBusKm))
          ? Number(stop.distanceFromBusKm)
          : null,
      };
    })
    .filter(Boolean);
}

/**
 * Ordered stop path so admins can read a route at a glance: 1 → 2 → School.
 * When stops include displaySequence (trip rotation), that order/label is used.
 */
export default function RouteStopTimeline({
  stops = [],
  compact = false,
  title = 'Stop order',
  emptyText = 'No stops on this route yet.',
}) {
  const list = prepareTimelineStops(stops);

  if (!list.length) {
    return (
      <p className="rounded-lg border border-dashed border-[#c5c6cd] bg-[#f8f9ff] px-3 py-3 text-sm text-[#667085]">
        {emptyText}
      </p>
    );
  }

  if (compact) {
    return (
      <p className="text-xs leading-relaxed text-[#475467]">
        {list.map((stop, index) => (
          <span key={stop.id}>
            {index > 0 && <span className="mx-1 text-[#98a2b3]">→</span>}
            <span className="font-semibold text-[#0b1c30]">{stop.name}</span>
          </span>
        ))}
      </p>
    );
  }

  return (
    <div>
      {title ? (
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#667085]">{title}</h4>
      ) : null}
      <ol className="space-y-0">
        {list.map((stop, index) => {
          const mapped = Number.isFinite(stop.lat) && Number.isFinite(stop.lng);
          const isLast = index === list.length - 1;
          const Icon = stop.stopType === 'school' ? School : Flag;
          const label = stop.displaySequence != null ? stop.displaySequence : index + 1;
          const kmLabel = Number.isFinite(stop.distanceFromBusKm)
            ? `${stop.distanceFromBusKm.toFixed(2)} km`
            : null;
          return (
            <li key={stop.id} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast && (
                <span
                  className="absolute left-[13px] top-8 bottom-0 w-0.5 bg-[#d0d5dd]"
                  aria-hidden
                />
              )}
              <span
                className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                  stop.stopType === 'school' ? 'bg-[#0058be]' : 'bg-[#0b1c30]'
                }`}
              >
                {label}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#0b1c30]">{stop.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-[#667085]">
                      <Icon size={12} />
                      {TYPE_LABEL[stop.stopType] || 'Stop'}
                      {' · '}
                      {mapped ? (
                        <span className="text-emerald-700">On map</span>
                      ) : (
                        <span className="text-amber-700">Needs location</span>
                      )}
                      {kmLabel ? (
                        <>
                          {' · '}
                          <span className="font-medium text-[#344054]">{kmLabel}</span>
                        </>
                      ) : null}
                      {stop.displaySequence != null && stop.sequence !== stop.displaySequence ? (
                        <>
                          {' · '}
                          <span className="text-[#98a2b3]">route #{stop.sequence}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
