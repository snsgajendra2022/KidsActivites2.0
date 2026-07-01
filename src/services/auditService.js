import { INITIAL_AUDIT_LOGS, AUDIT_ACTION_LABELS } from '../data/mockAuditLogs.js';
import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';

const KEY = 'sb_audit_logs';

function getAll() {
  const stored = getStore(KEY, null);
  if (stored) return stored;
  setStore(KEY, INITIAL_AUDIT_LOGS);
  return INITIAL_AUDIT_LOGS;
}

function saveAll(logs) {
  setStore(KEY, logs);
}

function filterLogs(logs, filters = {}) {
  let result = [...logs];
  if (filters.action) {
    result = result.filter((l) => l.action === filters.action);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((l) =>
      l.summary?.toLowerCase().includes(q)
      || l.userName?.toLowerCase().includes(q)
      || l.resourceId?.toLowerCase().includes(q));
  }
  if (filters.from) {
    const from = new Date(filters.from).getTime();
    result = result.filter((l) => new Date(l.timestamp).getTime() >= from);
  }
  if (filters.to) {
    const to = new Date(filters.to).getTime();
    result = result.filter((l) => new Date(l.timestamp).getTime() <= to);
  }
  return result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function getAuditLogs(filters = {}) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      return filterLogs(getAll(), filters);
    },
    apiFn: () => api.get('/admin/audit-logs', filters),
  });
}

export async function appendAuditLog({
  action,
  resource,
  resourceId,
  summary,
  userId = 'usr-school-admin',
  userName = 'System',
  role = 'school_admin',
  ipAddress = '127.0.0.1',
}) {
  const entry = {
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    role,
    action,
    resource,
    resourceId,
    summary,
    ipAddress,
  };
  const logs = getAll();
  logs.unshift(entry);
  saveAll(logs.slice(0, 500));
  return entry;
}

export { AUDIT_ACTION_LABELS };
