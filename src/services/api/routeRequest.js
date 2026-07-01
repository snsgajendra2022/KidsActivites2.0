import { isApiFallbackMock } from './config.js';
import { shouldUseMockData } from './demoMode.js';

/**
 * Route to mock or live API. Demo sessions always use mock data.
 * When API fails and VITE_API_FALLBACK_MOCK is not false, falls back to mock.
 */
export async function routeRequest({ mockFn, apiFn, user }) {
  if (shouldUseMockData(user)) {
    return mockFn();
  }
  try {
    return await apiFn();
  } catch (err) {
    if (isApiFallbackMock()) {
      console.warn('[SchoolBridge] API unavailable, using demo data:', err.message);
      return mockFn();
    }
    throw err;
  }
}
