import { Flag, School } from 'lucide-react';
import { normalizeRouteStops } from '../../utils/transportRouteGeo.js';

const TYPE_LABEL = {
  pickup: 'Pickup',
  drop: 'Drop',
  school: 'School',
};

/**
 * Ordered stop path so admins can read a route at a glance: 1 → 2 → School.
 */
export default function RouteStopTimeline({
  stops = [],
  compact = false,
  title = 'Stop order',
  emptyText = 'No stops on this route yet.',
}) {
  const list = normalizeRouteStops(stops);

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
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#0b1c30]">{stop.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[#667085]">
                      <Icon size={12} />
                      {TYPE_LABEL[stop.stopType] || 'Stop'}
                      {' · '}
                      {mapped ? (
                        <span className="text-emerald-700">On map</span>
                      ) : (
                        <span className="text-amber-700">Needs location</span>
                      )}
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
