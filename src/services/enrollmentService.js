import { ENROLLMENT_STATUSES } from '../constants/enrollmentStatuses.js';
import { INITIAL_APPLICATIONS } from '../data/mockApplications.js';
import { buildEmptyFormFromConfig } from '../utils/enrollmentFormUtils.js';
import { DEFAULT_ENROLLMENT_FORM } from '../data/defaultEnrollmentFormConfig.js';
import { delay, getStore, setStore, generateApplicationNo } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { getStoredUser } from './api/demoMode.js';

const KEY = 'sb_applications';

function getAll() {
  return getStore(KEY, INITIAL_APPLICATIONS);
}

function saveAll(apps) {
  setStore(KEY, apps);
}

async function mockGetApplications(filters = {}) {
  await delay();
  let apps = getAll();
  if (filters.status) apps = apps.filter((a) => a.status === filters.status);
  if (filters.parentId) apps = apps.filter((a) => a.parentId === filters.parentId);
  return apps;
}

export async function getApplications(filters = {}) {
  return routeRequest({
    mockFn: () => mockGetApplications(filters),
    apiFn: async () => {
      const data = await api.get('/admin/applications', filters);
      return Array.isArray(data) ? data : [];
    },
  });
}

export async function getApplication(id) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      return getAll().find((a) => a.id === id) || null;
    },
    apiFn: () => api.get(`/admin/applications/${id}`),
  });
}

export async function getApplicationByParent(parentId) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const apps = getAll().filter((a) => a.parentId === parentId || (a.parentId === 'u-parent' && parentId === 'usr-parent'));
      if (!apps.length) return null;
      return apps.sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0))[0];
    },
    apiFn: () => api.get('/enrollment/my-application'),
  });
}

export async function getApplicationsByParent(parentId) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      return getAll().filter(
        (a) => a.parentId === parentId || (a.parentId === 'u-parent' && parentId === 'usr-parent'),
      );
    },
    apiFn: () => api.get('/parent/children'),
  });
}

export async function saveDraft(formData, existingId, meta = {}) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const apps = getAll();
      if (existingId) {
        const idx = apps.findIndex((a) => a.id === existingId);
        if (idx >= 0) {
          apps[idx] = {
            ...apps[idx],
            ...formData,
            ...meta,
            status: ENROLLMENT_STATUSES.DRAFT,
            updatedAt: new Date().toISOString(),
          };
          saveAll(apps);
          return apps[idx];
        }
      }
      const draft = {
        id: `app-draft-${Date.now()}`,
        applicationNo: null,
        status: ENROLLMENT_STATUSES.DRAFT,
        ...formData,
        ...meta,
        createdAt: new Date().toISOString(),
      };
      apps.push(draft);
      saveAll(apps);
      return draft;
    },
    apiFn: () => (existingId
      ? api.put(`/enrollment/draft/${existingId}`, { ...formData, ...meta })
      : api.post('/enrollment/draft', { ...formData, ...meta })),
  });
}

export async function submitApplication(formData, existingId, parentId, schoolId = null) {
  return routeRequest({
    mockFn: async () => {
      await delay(600);
      const apps = getAll();
      const applicationNo = generateApplicationNo();
      const entry = {
        id: existingId || `app-${Date.now()}`,
        applicationNo,
        status: ENROLLMENT_STATUSES.SUBMITTED,
        submittedAt: new Date().toISOString(),
        parentId: parentId || null,
        schoolId: schoolId || formData.schoolId || null,
        assignedReviewer: 'Priya Sharma',
        statusHistory: [
          {
            status: ENROLLMENT_STATUSES.SUBMITTED,
            date: new Date().toISOString(),
            note: 'Application submitted by parent',
          },
        ],
        ...formData,
      };
      const idx = apps.findIndex((a) => a.id === existingId);
      if (idx >= 0) apps[idx] = entry;
      else apps.push(entry);
      saveAll(apps);
      return entry;
    },
    apiFn: () => api.post('/enrollment/submit', { applicationId: existingId, parentId, schoolId, ...formData }),
  });
}

async function mockUpdateStatus(id, status, note) {
  await delay();
  const apps = getAll();
  const idx = apps.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Application not found');
  apps[idx].status = status;
  apps[idx].statusHistory = [
    ...(apps[idx].statusHistory || []),
    { status, date: new Date().toISOString(), note },
  ];
  saveAll(apps);
  return apps[idx];
}

export async function updateApplicationStatus(id, status, note) {
  return routeRequest({
    mockFn: () => mockUpdateStatus(id, status, note),
    apiFn: () => api.patch(`/admin/applications/${id}/status`, { status, note }),
  });
}

export async function requestCorrection(id, reason) {
  return routeRequest({
    mockFn: () => mockUpdateStatus(id, ENROLLMENT_STATUSES.CORRECTION_REQUIRED, reason),
    apiFn: () => api.post(`/admin/applications/${id}/request-correction`, { note: reason }),
  });
}

export async function approveApplication(id) {
  return routeRequest({
    mockFn: () => mockUpdateStatus(id, ENROLLMENT_STATUSES.FEE_PENDING, 'Application approved. Fee assigned.'),
    apiFn: () => api.post(`/admin/applications/${id}/approve`),
  });
}

export async function rejectApplication(id, reason) {
  return routeRequest({
    mockFn: () => mockUpdateStatus(id, ENROLLMENT_STATUSES.REJECTED, reason),
    apiFn: () => api.post(`/admin/applications/${id}/reject`, { reason }),
  });
}

export async function verifyDocuments(id) {
  return routeRequest({
    mockFn: () => mockUpdateStatus(id, ENROLLMENT_STATUSES.DOCUMENTS_VERIFIED, 'All documents verified'),
    apiFn: () => api.post(`/admin/applications/${id}/verify-documents`),
  });
}

export async function confirmAdmission(id) {
  return routeRequest({
    mockFn: () => mockUpdateStatus(id, ENROLLMENT_STATUSES.ADMISSION_CONFIRMED, 'Admission confirmed'),
    apiFn: () => api.post(`/admin/applications/${id}/confirm-admission`),
  });
}

export async function createAccount(id) {
  return routeRequest({
    mockFn: () => mockUpdateStatus(id, ENROLLMENT_STATUSES.ACCOUNT_CREATED, 'Parent account created and invitation sent'),
    apiFn: () => api.post(`/admin/applications/${id}/create-account`),
  });
}

export function getEmptyForm(enrollmentForm) {
  return buildEmptyFormFromConfig(enrollmentForm || DEFAULT_ENROLLMENT_FORM);
}

function computeDashboardStats(apps) {
  return {
    total: apps.length,
    pendingReview: apps.filter((a) => [ENROLLMENT_STATUSES.SUBMITTED, ENROLLMENT_STATUSES.UNDER_REVIEW].includes(a.status)).length,
    correctionRequired: apps.filter((a) => a.status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED).length,
    documentsPending: apps.filter((a) => a.status === ENROLLMENT_STATUSES.DOCUMENTS_PENDING).length,
    feePending: apps.filter((a) => a.status === ENROLLMENT_STATUSES.FEE_PENDING).length,
    feeSubmitted: apps.filter((a) => a.status === ENROLLMENT_STATUSES.FEE_SUBMITTED).length,
    confirmed: apps.filter((a) => a.status === ENROLLMENT_STATUSES.ADMISSION_CONFIRMED).length,
    rejected: apps.filter((a) => a.status === ENROLLMENT_STATUSES.REJECTED).length,
    accountsCreated: apps.filter((a) => a.status === ENROLLMENT_STATUSES.ACCOUNT_CREATED).length,
  };
}

export async function getDashboardStats() {
  return routeRequest({
    mockFn: async () => {
      await delay(100);
      return computeDashboardStats(getAll());
    },
    apiFn: async () => {
      const data = await api.get('/admin/dashboard/stats');
      return data && typeof data === 'object' ? data : {};
    },
  });
}

export async function getEnrolledStudents() {
  return routeRequest({
    mockFn: async () => {
      const apps = await mockGetApplications();
      return apps
        .filter((a) => [
          ENROLLMENT_STATUSES.ADMISSION_CONFIRMED,
          ENROLLMENT_STATUSES.ACCOUNT_CREATED,
        ].includes(a.status))
        .map((a) => ({
          id: a.id,
          applicationNo: a.applicationNo,
          name: a.student?.fullName,
          classApplying: a.student?.classApplying,
          parentName: a.parent?.fatherName || a.parent?.motherName,
          status: a.status,
          submittedAt: a.submittedAt,
        }));
    },
    apiFn: () => api.get('/admin/students'),
  });
}

export async function getDashboardChartData() {
  const user = getStoredUser();
  return routeRequest({
    user,
    mockFn: async () => {
      const apps = getAll();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      return months.map((month, i) => ({
        month,
        applications: Math.max(1, apps.filter((_, idx) => idx % 6 === i).length * 3 + 8),
        collected: (i + 1) * 180000 + apps.length * 12000,
      }));
    },
    apiFn: () => api.get('/admin/dashboard/charts'),
  });
}
