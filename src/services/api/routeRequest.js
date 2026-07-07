import { isApiFallbackMock, isApiEnabled, isForceMock } from './config.js';

/**
 * Route to mock or live API. Uses apiFn when VITE_API_URL is set unless VITE_FORCE_MOCK=true.
 * Mock fallback on API errors only when VITE_API_FALLBACK_MOCK=true.
 */
export async function routeRequest({ mockFn, apiFn }) {
  if (isForceMock() || !isApiEnabled()) {
    return mockFn();
  }
  try {
    return await apiFn();
  } catch (err) {
    if (isApiFallbackMock()) {
      console.warn('[KidsActivites] API unavailable, using mock data:', err.message);
      return mockFn();
    }
    throw err;
  }
}
