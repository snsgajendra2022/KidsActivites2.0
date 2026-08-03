import { geocodeAddress } from '../services/geocoding/placeSearch.js';

/** Normalize enrollment or API student address into one shape. */
export function normalizeTransportAddress(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};

  // Kidzee / printable forms often store address across line1/2/3.
  const kidzeeLines = [source.addressLine1, source.addressLine2, source.addressLine3]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');

  const child = source.child && typeof source.child === 'object' ? source.child : null;
  const childLines = child
    ? [child.addressLine1, child.addressLine2, child.addressLine3]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(', ')
    : '';

  return {
    currentAddress: String(
      source.currentAddress
      || source.line1
      || source.addressLine1
      || kidzeeLines
      || childLines
      || source.address
      || '',
    ).trim(),
    permanentAddress: String(source.permanentAddress || source.line2 || source.addressLine2 || '').trim(),
    city: String(source.city || child?.city || '').trim(),
    state: String(source.state || child?.state || '').trim(),
    pinCode: String(
      source.pinCode
      || source.postalCode
      || source.pin
      || child?.pin
      || child?.pinCode
      || '',
    ).trim(),
    country: String(source.country || child?.country || 'India').trim(),
  };
}

/** Pull address object from an enrollment application / student payload. */
export function extractAddressFromApplication(app) {
  if (!app || typeof app !== 'object') return normalizeTransportAddress({});

  // Kidzee / printable apps often split the same home across address + formData.child.
  // Merge sources so line1/pin from one and city/state from another still resolve.
  const sources = [
    app.address,
    app.formData?.address,
    app.printableEnrollment?.address,
    app.formData?.child,
    app.student,
    app,
  ].filter((item) => item && typeof item === 'object');

  const merged = {
    currentAddress: '',
    permanentAddress: '',
    city: '',
    state: '',
    pinCode: '',
    country: '',
  };

  for (const source of sources) {
    const part = normalizeTransportAddress(source);
    if (!merged.currentAddress && part.currentAddress) merged.currentAddress = part.currentAddress;
    if (!merged.permanentAddress && part.permanentAddress) merged.permanentAddress = part.permanentAddress;
    if (!merged.city && part.city) merged.city = part.city;
    if (!merged.state && part.state) merged.state = part.state;
    if (!merged.pinCode && part.pinCode) merged.pinCode = part.pinCode;
    if (!merged.country && part.country) merged.country = part.country;
  }

  return {
    ...merged,
    country: merged.country || 'India',
  };
}

export function formatTransportAddress(address) {
  const normalized = normalizeTransportAddress(address);
  return [
    normalized.currentAddress,
    normalized.city,
    normalized.state,
    normalized.pinCode,
    normalized.country,
  ].filter(Boolean).join(', ');
}

/**
 * Usable for geocoding / route stops.
 * Kidzee forms often leave city blank and put locality in line1 with a PIN —
 * street + (city OR PIN OR state) is enough.
 */
export function isTransportAddressComplete(address) {
  const normalized = normalizeTransportAddress(address);
  return Boolean(
    normalized.currentAddress
    && (normalized.city || normalized.pinCode || normalized.state),
  );
}

export function toApiAddressPayload(address) {
  const normalized = normalizeTransportAddress(address);
  return {
    currentAddress: normalized.currentAddress,
    permanentAddress: normalized.permanentAddress || normalized.currentAddress,
    city: normalized.city,
    state: normalized.state,
    pinCode: normalized.pinCode,
    country: normalized.country || 'India',
    // Backend student profile shape (also accepted by many Spring DTOs)
    line1: normalized.currentAddress,
    line2: normalized.permanentAddress || '',
    postalCode: normalized.pinCode,
  };
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Geocode student address and pick the nearest mapped route stop.
 */
export async function suggestNearestStop(address, stops = []) {
  const mapped = (stops || []).filter(
    (stop) => Number.isFinite(Number(stop.lat ?? stop.latitude))
      && Number.isFinite(Number(stop.lng ?? stop.longitude)),
  );
  if (!mapped.length) {
    return { stop: null, place: null, distanceMeters: null, error: 'Route has no mapped stops.' };
  }

  const query = formatTransportAddress(address);
  if (!query) {
    return { stop: null, place: null, distanceMeters: null, error: 'Student address is incomplete.' };
  }

  const place = await geocodeAddress(normalizeTransportAddress(address), {
    latitude: Number(mapped[0].lat ?? mapped[0].latitude),
    longitude: Number(mapped[0].lng ?? mapped[0].longitude),
  });
  if (!place) {
    return { stop: null, place: null, distanceMeters: null, error: 'Could not locate this address / PIN on the map.' };
  }

  let best = null;
  let bestDistance = Infinity;
  mapped.forEach((stop) => {
    const lat = Number(stop.lat ?? stop.latitude);
    const lng = Number(stop.lng ?? stop.longitude);
    const distance = haversineMeters(place.latitude, place.longitude, lat, lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = stop;
    }
  });

  return {
    stop: best,
    place,
    distanceMeters: Number.isFinite(bestDistance) ? bestDistance : null,
    error: '',
  };
}
