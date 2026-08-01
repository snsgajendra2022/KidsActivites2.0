/**
 * Free place search via Photon (Komoot / OSM). No API key required.
 * Prefer biasing results near the school / route area when lat/lon are known.
 */
export async function searchPlaces(query, { limit = 8, signal, latitude, longitude } = {}) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];

  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('lang', 'en');
  if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
  }

  const res = await fetch(url.toString(), { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error('Place search failed. Try again in a moment.');
  }

  const json = await res.json();
  const features = Array.isArray(json?.features) ? json.features : [];

  return features
    .map((feature, index) => {
      const coords = feature?.geometry?.coordinates;
      const props = feature?.properties || {};
      const lng = Number(coords?.[0]);
      const lat = Number(coords?.[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const parts = [props.name, props.street, props.city || props.county, props.state, props.country]
        .filter(Boolean);
      const label = parts.filter((part, i, arr) => arr.indexOf(part) === i).join(', ');

      return {
        id: `${props.osm_type || 'p'}-${props.osm_id || index}-${lat}-${lng}`,
        label: label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        name: props.name || label || 'Selected place',
        latitude: lat,
        longitude: lng,
      };
    })
    .filter(Boolean);
}

/** Resolve a street address to lat/lng (first Photon hit). */
export async function geocodeAddress(address, options = {}) {
  const q = String(address || '').trim();
  if (!q) return null;
  const places = await searchPlaces(q, { ...options, limit: 1 });
  return places[0] || null;
}
