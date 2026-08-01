import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { searchPlaces } from '../../services/geocoding/placeSearch.js';

/**
 * Debounced place search for picking stop / route locations (free Photon API).
 */
export default function PlaceSearchInput({
  label = 'Search location',
  placeholder = 'Search area, landmark, or address…',
  onSelect,
  disabled = false,
  latitude,
  longitude,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const abortRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError('');
      try {
        const places = await searchPlaces(q, {
          signal: controller.signal,
          latitude,
          longitude,
        });
        if (!controller.signal.aborted) {
          setResults(places);
          setOpen(true);
        }
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setResults([]);
        setError(err?.message || 'Search failed.');
        setOpen(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, latitude, longitude]);

  return (
    <div ref={wrapRef} className="relative">
      {label ? <label className="form-label mb-1.5 block">{label}</label> : null}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
        <input
          className="input-premium h-11 w-full rounded-lg border border-[#c5c6cd] bg-[#f8f9ff] pl-10 pr-10 text-sm outline-none focus:border-[#0058be]"
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (results.length || error) setOpen(true);
          }}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#667085] hover:bg-[#eef2ff]"
            onClick={() => {
              setQuery('');
              setResults([]);
              setError('');
              setOpen(false);
            }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (loading || results.length > 0 || error) && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[#d0d5dd] bg-white shadow-lg">
          {loading && (
            <p className="px-3 py-2 text-sm text-[#667085]">Searching…</p>
          )}
          {!loading && error && (
            <p className="px-3 py-2 text-sm text-[#b42318]">{error}</p>
          )}
          {!loading && !error && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-[#667085]">No places found.</p>
          )}
          {!loading && results.map((place) => (
            <button
              key={place.id}
              type="button"
              className="flex w-full items-start gap-2 border-b border-[#f2f4f7] px-3 py-2 text-left text-sm last:border-0 hover:bg-[#eef4ff]"
              onClick={() => {
                onSelect?.(place);
                setQuery(place.name);
                setOpen(false);
              }}
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-[#0058be]" />
              <span className="text-[#0b1c30]">{place.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
