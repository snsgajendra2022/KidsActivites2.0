import { delay, getStore, setStore } from '../mockApi.js';
import { api } from '../api/client.js';
import { routeRequest } from '../api/routeRequest.js';

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Shared mock + API CRUD service for school ERP modules.
 * Live API path: /admin/{resource} (override via options).
 */
export function createCrudService({
  key,
  resource,
  seed = [],
  idPrefix = 'item',
  listPath,
  itemPath,
}) {
  const storageKey = `sb_${key}`;
  const baseList = listPath || `/admin/${resource}`;
  const baseItem = itemPath || ((id) => `/admin/${resource}/${id}`);

  function readAll() {
    return getStore(storageKey, seed);
  }

  function writeAll(items) {
    setStore(storageKey, items);
  }

  async function list(filters = {}) {
    return routeRequest({
      mockFn: async () => {
        await delay(120);
        let items = readAll();
        Object.entries(filters).forEach(([field, value]) => {
          if (value === undefined || value === null || value === '') return;
          items = items.filter((item) => String(item[field] || '').toLowerCase() === String(value).toLowerCase());
        });
        return items;
      },
      apiFn: async () => {
        const data = await api.get(baseList, filters);
        return Array.isArray(data) ? data : (data?.items || []);
      },
    });
  }

  async function getById(id) {
    return routeRequest({
      mockFn: async () => {
        await delay(80);
        return readAll().find((item) => item.id === id) || null;
      },
      apiFn: () => api.get(typeof baseItem === 'function' ? baseItem(id) : `${baseItem}/${id}`),
    });
  }

  async function create(payload) {
    return routeRequest({
      mockFn: async () => {
        await delay(150);
        const now = new Date().toISOString();
        const item = {
          id: makeId(idPrefix),
          createdAt: now,
          updatedAt: now,
          ...payload,
        };
        const items = readAll();
        items.unshift(item);
        writeAll(items);
        return item;
      },
      apiFn: () => api.post(baseList, payload),
    });
  }

  async function update(id, updates) {
    return routeRequest({
      mockFn: async () => {
        await delay(150);
        const items = readAll();
        const index = items.findIndex((item) => item.id === id);
        if (index < 0) throw new Error('Record not found');
        items[index] = {
          ...items[index],
          ...updates,
          id,
          updatedAt: new Date().toISOString(),
        };
        writeAll(items);
        return items[index];
      },
      apiFn: () => api.patch(typeof baseItem === 'function' ? baseItem(id) : `${baseItem}/${id}`, updates),
    });
  }

  async function remove(id) {
    return routeRequest({
      mockFn: async () => {
        await delay(120);
        writeAll(readAll().filter((item) => item.id !== id));
        return { ok: true };
      },
      apiFn: () => api.delete(typeof baseItem === 'function' ? baseItem(id) : `${baseItem}/${id}`),
    });
  }

  return { list, getById, create, update, remove, readAll, writeAll };
}
