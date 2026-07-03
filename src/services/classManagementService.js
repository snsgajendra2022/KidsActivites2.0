import { delay } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';

const MOCK_CLASSES = [
  {
    id: 'cls-1',
    name: 'Toddler Group',
    code: 'toddler',
    ageGroup: '1.5–2 years',
    capacity: 15,
    description: 'Early toddler care group',
    status: 'active',
    assignedTeacherSummary: '—',
    teacherNames: [],
    assignedTeachers: [],
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-06-01T08:00:00Z',
  },
  {
    id: 'cls-2',
    name: 'Nursery',
    code: 'nursery',
    ageGroup: '2–3 years',
    capacity: 20,
    status: 'active',
    assignedTeacherSummary: 'Rajesh Kumar',
    teacherNames: ['Rajesh Kumar'],
    assignedTeachers: [{ teacherId: 'u-parent', teacherName: 'Rajesh Kumar' }],
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-06-01T08:00:00Z',
  },
];

let mockClasses = [...MOCK_CLASSES];
let mockFees = [];

export const FEE_CATEGORIES = [
  'Admission Fee',
  'Monthly Tuition Fee',
  'Meal Fee',
  'Transport Fee',
  'Activity Fee',
  'Daycare Fee',
  'Annual Fee',
  'Security Deposit',
];

export const BILLING_FREQUENCIES = [
  { value: 'one_time', label: 'One Time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

export function formatBillingFrequency(value) {
  return BILLING_FREQUENCIES.find((f) => f.value === value)?.label || value;
}

export async function listClasses(filters = {}) {
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      let rows = [...mockClasses];
      if (filters.status && filters.status !== 'all') {
        rows = rows.filter((c) => c.status === filters.status);
      }
      if (filters.search?.trim()) {
        const q = filters.search.trim().toLowerCase();
        rows = rows.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
      }
      return rows;
    },
    apiFn: () => api.get('/admin/classes', filters),
  });
}

export async function getClass(classId) {
  return routeRequest({
    mockFn: async () => mockClasses.find((c) => c.id === classId) || null,
    apiFn: () => api.get(`/admin/classes/${classId}`),
  });
}

export async function createClass(payload) {
  return routeRequest({
    mockFn: async () => {
      await delay(200);
      const entry = {
        id: `cls-${Date.now()}`,
        ...payload,
        assignedTeacherSummary: '—',
        teacherNames: [],
        assignedTeachers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockClasses.push(entry);
      return entry;
    },
    apiFn: () => api.post('/admin/classes', payload),
  });
}

export async function updateClass(classId, payload) {
  return routeRequest({
    mockFn: async () => {
      const idx = mockClasses.findIndex((c) => c.id === classId);
      if (idx < 0) throw new Error('Class not found');
      mockClasses[idx] = { ...mockClasses[idx], ...payload, updatedAt: new Date().toISOString() };
      return mockClasses[idx];
    },
    apiFn: () => api.put(`/admin/classes/${classId}`, payload),
  });
}

export async function deactivateClass(classId) {
  return routeRequest({
    mockFn: async () => {
      const idx = mockClasses.findIndex((c) => c.id === classId);
      if (idx < 0) throw new Error('Class not found');
      mockClasses[idx] = { ...mockClasses[idx], status: 'inactive', updatedAt: new Date().toISOString() };
      return mockClasses[idx];
    },
    apiFn: () => api.patch(`/admin/classes/${classId}/deactivate`),
  });
}

export async function listClassTeachers(classId) {
  return routeRequest({
    mockFn: async () => {
      const cls = mockClasses.find((c) => c.id === classId);
      return cls?.assignedTeachers || [];
    },
    apiFn: () => api.get(`/admin/classes/${classId}/teachers`),
  });
}

export async function assignTeacherToClass(classId, teacherId) {
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      return { classId, teacherId, status: 'active' };
    },
    apiFn: () => api.post(`/admin/classes/${classId}/teachers`, { teacherId }),
  });
}

export async function removeTeacherFromClass(classId, teacherId) {
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      return null;
    },
    apiFn: () => api.delete(`/admin/classes/${classId}/teachers/${teacherId}`),
  });
}

export async function listClassFees(classId) {
  return routeRequest({
    mockFn: async () => mockFees.filter((f) => f.classId === classId),
    apiFn: () => api.get(`/admin/classes/${classId}/fees`),
  });
}

export async function createClassFee(classId, payload) {
  return routeRequest({
    mockFn: async () => {
      const entry = { id: `cfee-${Date.now()}`, classId, status: 'active', ...payload };
      mockFees.push(entry);
      return entry;
    },
    apiFn: () => api.post(`/admin/classes/${classId}/fees`, payload),
  });
}

export async function updateClassFee(classId, feeId, payload) {
  return routeRequest({
    mockFn: async () => {
      const idx = mockFees.findIndex((f) => f.id === feeId);
      if (idx < 0) throw new Error('Fee not found');
      mockFees[idx] = { ...mockFees[idx], ...payload };
      return mockFees[idx];
    },
    apiFn: () => api.put(`/admin/classes/${classId}/fees/${feeId}`, payload),
  });
}

export async function deactivateClassFee(classId, feeId) {
  return routeRequest({
    mockFn: async () => {
      const idx = mockFees.findIndex((f) => f.id === feeId);
      if (idx < 0) throw new Error('Fee not found');
      mockFees[idx].status = 'inactive';
      return mockFees[idx];
    },
    apiFn: () => api.patch(`/admin/classes/${classId}/fees/${feeId}/deactivate`),
  });
}

export async function fetchAssignableClassOptions() {
  const classes = await listClasses({ status: 'active' });
  return classes.map((c) => ({ value: c.code, label: c.name, id: c.id }));
}

export function resolveFeeBreakdownFromClassFees(fees) {
  const breakdown = { discount: 0 };
  fees
    .filter((f) => f.status === 'active' && f.billingFrequency === 'one_time')
    .forEach((f) => {
      const key = f.feeCategory
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      breakdown[key] = Number(f.amount) || 0;
    });
  return breakdown;
}
