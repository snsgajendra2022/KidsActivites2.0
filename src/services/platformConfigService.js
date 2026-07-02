import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';

const PLATFORM_KEY = 'sb_platform_config';

const DEFAULT_PLATFORM_CONFIG = {
  platformName: 'SchoolBridge',
  tagline: 'Multi-school enrollment platform',
};

function mergePlatformConfig(stored) {
  return { ...DEFAULT_PLATFORM_CONFIG, ...(stored || {}) };
}

export async function getPlatformConfig() {
  return routeRequest({
    mockFn: async () => {
      await delay(80);
      return mergePlatformConfig(getStore(PLATFORM_KEY, null));
    },
    apiFn: () => api.get('/platform/config', undefined, { auth: false }),
  });
}

export async function savePlatformConfig(updates) {
  return routeRequest({
    mockFn: async () => {
      await delay(200);
      const next = mergePlatformConfig({ ...getStore(PLATFORM_KEY, null), ...updates });
      setStore(PLATFORM_KEY, next);
      return next;
    },
    apiFn: () => api.put('/admin/platform-settings', updates),
  });
}
