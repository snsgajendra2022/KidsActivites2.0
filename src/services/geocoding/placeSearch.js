/**
 * Free place search via Photon (Komoot / OSM) + Nominatim postal fallback.
 * No API key required. Prefer Indian PIN / locality matches over random POIs.
 */

const NOMINATIM_UA = 'KidsActivities-Transport/1.0 (school-bus-routing)';

function featureToPlace(feature, index = 0) {
  const coords = feature?.geometry?.coordinates;
  const props = feature?.properties || {};
  const lng = Number(coords?.[0]);
  const lat = Number(coords?.[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const parts = [props.name, props.street, props.city || props.county, props.state, props.postcode, props.country]
    .filter(Boolean);
  const label = parts.filter((part, i, arr) => arr.indexOf(part) === i).join(', ');

  return {
    id: `${props.osm_type || 'p'}-${props.osm_id || index}-${lat}-${lng}`,
    label: label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    name: props.name || label || 'Selected place',
    latitude: lat,
    longitude: lng,
    postcode: String(props.postcode || (props.osm_value === 'postcode' ? props.name : '') || '').trim(),
    countryCode: String(props.countrycode || '').toUpperCase(),
    osmKey: props.osm_key || '',
    osmValue: props.osm_value || '',
    placeType: props.type || '',
    _props: props,
  };
}

function extractIndianPin(...values) {
  for (const value of values) {
    const match = String(value || '').match(/\b([1-9]\d{5})\b/);
    if (match) return match[1];
  }
  return '';
}

function addressTokens(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => (
      part.length > 2
      && !['india', 'the', 'and', 'near', 'home', 'house', 'addr', 'address', 'stop', 'pickup'].includes(part)
    ));
}

function scorePlace(place, { pin = '', tokens = [] } = {}) {
  let score = 0;
  const props = place._props || {};
  const hay = [
    place.name,
    place.label,
    props.city,
    props.district,
    props.county,
    props.state,
    props.postcode,
    props.name,
  ].filter(Boolean).join(' ').toLowerCase();
  const placeName = String(place.name || props.name || '').toLowerCase();

  const placePin = String(place.postcode || '').trim();
  const nameMatchesLocality = tokens.some((token) => placeName === token || placeName.includes(token));

  if (pin) {
    if (placePin === pin || String(props.name || '') === pin) score += 100;
    else if (hay.includes(pin)) score += 40;
    else if (!nameMatchesLocality) score -= 15;
  }

  if (place.countryCode === 'IN' || /india/i.test(String(props.country || ''))) score += 30;
  else if (place.countryCode && place.countryCode !== 'IN') score -= 80;

  if (props.osm_value === 'postcode' || place.placeType === 'postcode') {
    // Strong when we only have a PIN; softer when address names a locality.
    score += tokens.length ? 20 : 55;
  }
  if (['city', 'district', 'locality', 'suburb', 'neighbourhood', 'village', 'town', 'city_district'].includes(place.placeType)) {
    score += 25;
  }
  if (props.osm_key === 'boundary' && props.osm_value === 'administrative') score += 20;

  // Avoid stadiums / tourist POIs when resolving a home address.
  if (
    props.osm_key === 'leisure'
    || props.osm_key === 'tourism'
    || props.osm_key === 'amenity'
    || props.osm_key === 'aeroway'
    || props.osm_key === 'military'
    || ['stadium', 'attraction', 'museum', 'hotel', 'restaurant', 'aerodrome', 'airfield'].includes(props.osm_value)
  ) {
    score -= 60;
  }

  tokens.forEach((token) => {
    if (hay.includes(token)) score += 35;
    if (placeName === token || placeName.includes(token)) {
      score += 45;
      if (
        ['city', 'district', 'locality', 'suburb', 'neighbourhood', 'village', 'town', 'city_district']
          .includes(place.placeType)
        || (props.osm_key === 'boundary' && props.osm_value === 'administrative')
      ) {
        score += 70;
      }
    }
  });

  return score;
}

function pickBestPlace(places, context) {
  if (!places?.length) return null;
  const ranked = places
    .map((place) => ({ place, score: scorePlace(place, context) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score > -20 ? ranked[0].place : null;
}

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
  return features.map((feature, index) => featureToPlace(feature, index)).filter(Boolean);
}

async function searchNominatimPostal(pin, { signal, country = 'India' } = {}) {
  if (!pin) return [];
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('postalcode', pin);
  url.searchParams.set('country', country);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');

  const res = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/json',
      'User-Agent': NOMINATIM_UA,
    },
  });
  if (!res.ok) return [];

  const json = await res.json();
  if (!Array.isArray(json)) return [];

  return json
    .map((item, index) => {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const display = String(item.display_name || item.name || pin);
      return {
        id: `nom-${item.place_id || index}-${lat}-${lng}`,
        label: display,
        name: item.name || pin,
        latitude: lat,
        longitude: lng,
        postcode: String(item.address?.postcode || pin).trim(),
        countryCode: String(item.address?.country_code || 'in').toUpperCase(),
        osmKey: item.class || 'place',
        osmValue: item.type || 'postcode',
        placeType: item.addresstype || item.type || 'postcode',
        _props: {
          name: item.name || pin,
          postcode: pin,
          country: item.address?.country || 'India',
          countrycode: item.address?.country_code || 'IN',
          city: item.address?.city || item.address?.town || item.address?.county || '',
          state: item.address?.state || '',
          district: item.address?.suburb || item.address?.city_district || '',
          osm_key: item.class || 'place',
          osm_value: item.type || 'postcode',
          type: item.addresstype || 'postcode',
        },
      };
    })
    .filter(Boolean);
}

async function searchNominatimFreeText(query, { signal, countrycodes = 'in' } = {}) {
  const q = String(query || '').trim();
  if (q.length < 3) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');
  url.searchParams.set('countrycodes', countrycodes);

  const res = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/json',
      'User-Agent': NOMINATIM_UA,
    },
  });
  if (!res.ok) return [];

  const json = await res.json();
  if (!Array.isArray(json)) return [];

  return json
    .map((item, index) => {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const display = String(item.display_name || item.name || q);
      return {
        id: `nom-q-${item.place_id || index}-${lat}-${lng}`,
        label: display,
        name: item.name || display.split(',')[0] || 'Place',
        latitude: lat,
        longitude: lng,
        postcode: String(item.address?.postcode || '').trim(),
        countryCode: String(item.address?.country_code || 'in').toUpperCase(),
        osmKey: item.class || '',
        osmValue: item.type || '',
        placeType: item.addresstype || item.type || '',
        _props: {
          name: item.name || '',
          postcode: item.address?.postcode || '',
          country: item.address?.country || 'India',
          countrycode: item.address?.country_code || 'IN',
          city: item.address?.city || item.address?.town || item.address?.village || '',
          state: item.address?.state || '',
          district: item.address?.suburb || item.address?.city_district || '',
          osm_key: item.class || '',
          osm_value: item.type || '',
          type: item.addresstype || item.type || '',
        },
      };
    })
    .filter(Boolean);
}

function buildTransportQueries(address = {}) {
  const line = String(address.currentAddress || address.line1 || '').trim();
  const city = String(address.city || '').trim();
  const state = String(address.state || '').trim();
  const pin = extractIndianPin(address.pinCode, address.postalCode, line);
  const country = String(address.country || 'India').trim() || 'India';
  const tokens = addressTokens([line, city, state].filter(Boolean).join(' '));
  const meaningfulLine = tokens.length > 0 ? line : '';

  const queries = [];
  const push = (q) => {
    const value = String(q || '').trim();
    if (value && !queries.includes(value)) queries.push(value);
  };

  if (pin) {
    push(`${pin} ${country}`);
    push(pin);
  }
  if (meaningfulLine && pin) push(`${meaningfulLine} ${pin} ${country}`);
  if (meaningfulLine && city) push(`${meaningfulLine}, ${city}, ${country}`);
  if (meaningfulLine) {
    push(`${meaningfulLine}, ${state || ''} ${pin || ''} ${country}`.replace(/\s+/g, ' ').trim());
  }
  if (city && pin) push(`${city} ${pin} ${country}`);

  return { queries, pin, tokens };
}

/**
 * Resolve a street address to lat/lng.
 * Accepts a plain string or a transport address object ({ currentAddress, city, pinCode, ... }).
 * Prefers Indian PIN / locality matches instead of the first POI hit.
 */
export async function geocodeAddress(address, options = {}) {
  const isObject = address && typeof address === 'object';
  if (isObject) {
    return geocodeTransportAddress(address, options);
  }

  const q = String(address || '').trim();
  if (!q) return null;

  const pin = extractIndianPin(q);
  const tokens = addressTokens(q);
  const places = await searchPlaces(q, { ...options, limit: 8 });
  const best = pickBestPlace(places, { pin, tokens });
  if (best) return best;

  if (pin) {
    const postal = await searchNominatimPostal(pin, { signal: options.signal });
    const postalBest = pickBestPlace(postal, { pin, tokens });
    if (postalBest) return postalBest;
  }

  const nominatim = await searchNominatimFreeText(q, { signal: options.signal });
  return pickBestPlace(nominatim, { pin, tokens }) || nominatim[0] || places[0] || null;
}

/**
 * Geocode a structured Users / transport address using PIN-first strategy.
 */
export async function geocodeTransportAddress(address = {}, options = {}) {
  const { queries, pin, tokens } = buildTransportQueries(address);
  if (!queries.length) return null;

  const collected = [];

  // 1) Nominatim postalcode is the most reliable for Indian PIN centroids.
  if (pin) {
    try {
      const postal = await searchNominatimPostal(pin, { signal: options.signal });
      collected.push(...postal);
    } catch {
      /* ignore and continue */
    }
  }

  // 2) Photon text search for locality + PIN variants.
  for (const query of queries.slice(0, 4)) {
    try {
      const places = await searchPlaces(query, { ...options, limit: 8 });
      collected.push(...places);
    } catch {
      /* try next */
    }
  }

  let best = pickBestPlace(collected, { pin, tokens });
  if (best) return best;

  // 3) Nominatim free-text fallback (e.g. "Jalalpur Gwalior 474010").
  const freeQuery = [
    address.currentAddress || address.line1,
    address.city,
    pin,
    address.state,
    address.country || 'India',
  ].filter(Boolean).join(' ');

  try {
    const nominatim = await searchNominatimFreeText(freeQuery, { signal: options.signal });
    best = pickBestPlace(nominatim, { pin, tokens });
    if (best) return best;
    if (nominatim[0]) return nominatim[0];
  } catch {
    /* ignore */
  }

  return collected[0] || null;
}
