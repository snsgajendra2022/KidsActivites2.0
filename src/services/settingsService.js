import { INITIAL_SCHOOL_SETTINGS } from '../data/mockSchoolSettings.js';
import { INITIAL_FEE_STRUCTURES } from '../data/mockFeeStructures.js';
import { calculateTotal } from '../data/mockFees.js';
import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { appendAuditLog } from './auditService.js';

const SETTINGS_KEY = 'sb_school_settings';
const FEE_STRUCTURES_KEY = 'sb_fee_structures';

function getSettingsStore() {
  return getStore(SETTINGS_KEY, INITIAL_SCHOOL_SETTINGS);
}

function getFeeStructuresStore() {
  return getStore(FEE_STRUCTURES_KEY, INITIAL_FEE_STRUCTURES);
}

export async function getSchoolSettings() {
  return routeRequest({
    mockFn: async () => {
      await delay();
      return getSettingsStore();
    },
    apiFn: () => api.get('/admin/settings'),
  });
}

export async function updateSchoolSettings(patch, updatedBy = 'Admin') {
  return routeRequest({
    mockFn: async () => {
      await delay(300);
      const current = getSettingsStore();
      const next = {
        ...current,
        ...patch,
        documents: { ...current.documents, ...patch.documents },
        notifications: { ...current.notifications, ...patch.notifications },
        updatedAt: new Date().toISOString(),
        updatedBy,
      };
      setStore(SETTINGS_KEY, next);
      await appendAuditLog({
        action: 'settings.updated',
        resource: 'school_settings',
        resourceId: 'school-1',
        summary: 'Updated school configuration settings',
        userName: updatedBy,
        role: 'school_admin',
      });
      return next;
    },
    apiFn: () => api.put('/admin/settings', patch),
  });
}

export async function getFeeStructures() {
  return routeRequest({
    mockFn: async () => {
      await delay();
      return getFeeStructuresStore();
    },
    apiFn: () => api.get('/admin/settings/fee-structures'),
  });
}

export async function updateFeeStructure(id, breakdown, updatedBy = 'Admin') {
  return routeRequest({
    mockFn: async () => {
      await delay(300);
      const structures = getFeeStructuresStore();
      const idx = structures.findIndex((s) => s.id === id);
      if (idx < 0) throw new Error('Fee structure not found');
      const entry = {
        ...structures[idx],
        breakdown,
        total: calculateTotal(breakdown),
        updatedAt: new Date().toISOString(),
        updatedBy,
      };
      structures[idx] = entry;
      setStore(FEE_STRUCTURES_KEY, structures);
      await appendAuditLog({
        action: 'fee_structure.updated',
        resource: 'fee_structure',
        resourceId: id,
        summary: `Updated fee structure for ${entry.label}`,
        userName: updatedBy,
        role: 'school_admin',
      });
      return entry;
    },
    apiFn: () => api.put(`/admin/settings/fee-structures/${id}`, { breakdown }),
  });
}

export async function toggleFeeStructure(id, active, updatedBy = 'Admin') {
  return routeRequest({
    mockFn: async () => {
      await delay(200);
      const structures = getFeeStructuresStore();
      const idx = structures.findIndex((s) => s.id === id);
      if (idx < 0) throw new Error('Fee structure not found');
      structures[idx] = {
        ...structures[idx],
        active,
        updatedAt: new Date().toISOString(),
        updatedBy,
      };
      setStore(FEE_STRUCTURES_KEY, structures);
      return structures[idx];
    },
    apiFn: () => api.patch(`/admin/settings/fee-structures/${id}`, { active }),
  });
}
