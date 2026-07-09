/** Extract iframe src from pasted embed code or return a bare maps URL. */
export function parseMapEmbedUrl(input) {
  const value = (input || '').trim();
  if (!value) return null;

  const srcMatch = value.match(/src=["']([^"']+)["']/i);
  if (srcMatch?.[1]) return srcMatch[1].trim();

  if (/^https?:\/\//i.test(value)) return value;

  return null;
}

/** Build a Google Maps embed URL from a street address. */
export function buildMapEmbedFromAddress(address) {
  const value = (address || '').trim();
  if (!value) return null;
  const query = encodeURIComponent(value);
  return `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

/** Prefer custom embed URL; otherwise derive from school address. */
export function resolveMapEmbedUrl(embedUrl, address) {
  return parseMapEmbedUrl(embedUrl) || buildMapEmbedFromAddress(address);
}
