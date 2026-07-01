/** API base URL — set VITE_API_URL when backend is running. */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function isApiEnabled() {
  return Boolean(API_BASE_URL);
}

export function isForceMock() {
  return import.meta.env.VITE_FORCE_MOCK === 'true';
}

export function isApiFallbackMock() {
  return import.meta.env.VITE_API_FALLBACK_MOCK !== 'false';
}
