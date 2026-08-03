import { delay, getStore, setStore } from '../mockApi.js';
import { api } from '../api/client.js';
import { routeRequest } from '../api/routeRequest.js';

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function asCrudList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  return [];
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
  normalizeItem,
}) {
  const storageKey = `sb_${key}`;
  const baseList = listPath || `/admin/${resource}`;
  const baseItem = itemPath || ((id) => `/admin/${resource}/${id}`);
  const normalize = typeof normalizeItem === 'function' ? normalizeItem : (item) => item;

  function readAll() {
    return getStore(storageKey, seed).map(normalize);
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
        return asCrudList(data).map(normalize);
      },
    });
  }

  async function getById(id) {
    return routeRequest({
      mockFn: async () => {
        await delay(80);
        return readAll().find((item) => item.id === id) || null;
      },
      apiFn: async () => normalize(
        await api.get(typeof baseItem === 'function' ? baseItem(id) : `${baseItem}/${id}`),
      ),
    });
  }

  async function create(payload) {
    return routeRequest({
      mockFn: async () => {
        await delay(150);
        const now = new Date().toISOString();
        const item = normalize({
          id: makeId(idPrefix),
          createdAt: now,
          updatedAt: now,
          ...payload,
        });
        const items = readAll();
        items.unshift(item);
        writeAll(items);
        return item;
      },
      apiFn: async () => normalize(await api.post(baseList, payload)),
    });
  }

  async function update(id, updates) {
    return routeRequest({
      mockFn: async () => {
        await delay(150);
        const items = readAll();
        const index = items.findIndex((item) => item.id === id);
        if (index < 0) throw new Error('Record not found');
        items[index] = normalize({
          ...items[index],
          ...updates,
          id,
          updatedAt: new Date().toISOString(),
        });
        writeAll(items);
        return items[index];
      },
      apiFn: async () => normalize(
        await api.patch(typeof baseItem === 'function' ? baseItem(id) : `${baseItem}/${id}`, updates),
      ),
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
