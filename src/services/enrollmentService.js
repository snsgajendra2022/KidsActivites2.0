import { ENROLLMENT_STATUSES } from '../constants/enrollmentStatuses.js';
import { INITIAL_APPLICATIONS } from '../data/mockApplications.js';
import { buildEmptyFormFromConfig } from '../utils/enrollmentFormUtils.js';
import { DEFAULT_ENROLLMENT_FORM } from '../data/defaultEnrollmentFormConfig.js';
import { sanitizeEnrollmentPayload } from '../utils/enrollmentPayload.js';
import { delay, getStore, setStore, generateApplicationNo } from './mockApi.js';
import { api, ApiError } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { getStoredUser } from './api/demoMode.js';
import { API_BASE_URL, resolveTenantSlug, TENANT_HEADER } from './api/config.js';
import { getAccessToken } from './api/tokenStorage.js';

const KEY = 'sb_applications';

function getAll() {
  return getStore(KEY, INITIAL_APPLICATIONS);
}

function saveAll(apps) {
  setStore(KEY, apps);
}

function nextKidzeeFormNo(apps) {
  const nums = apps
    .flatMap((a) => {
      const formNo = a.formData?.formNo ?? a.printableEnrollment?.formNo;
      return formNo && /^\d+$/.test(formNo) ? [Number(formNo)] : [];
    });
  const max = nums.length ? Math.max(...nums) : 1330;
  return String(max + 1).padStart(6, '0');
}

function assignKidzeeFormNo(payload, existingApp, allApps) {
  const formType = payload._formType || payload.formType;
  if (formType !== 'kidzee_printable') return payload;

  const kidzeeData = { ...(payload.printableEnrollment || {}) };
  const stored = existingApp?.formData?.formNo ?? existingApp?.printableEnrollment?.formNo;
  if (!kidzeeData.formNo) {
    kidzeeData.formNo = stored || nextKidzeeFormNo(allApps);
  }

  return {
    ...payload,
    formType: 'kidzee_printable',
    printableEnrollment: kidzeeData,
    formData: kidzeeData,
  };
}

async function mockGetApplications(filters = {}) {
  let apps = getAll();
  if (filters.status) apps = apps.filter((a) => a.status === filters.status);
  if (filters.parentId) apps = apps.filter((a) => a.parentId === filters.parentId);
  return { items: apps, page: 0, size: apps.length, total: apps.length, totalPages: 1 };
}

export async function getAdmissionsStatus() {
  return routeRequest({
    mockFn: async () => ({
      admissionsOpen: true,
      enrollmentDeadline: '2026-07-31',
      admissionStartDate: '2026-04-01',
    }),
    apiFn: () => api.get('/enrollment/admissions', undefined, { auth: false }),
  });
}

export async function getApplications(filters = {}) {
  return routeRequest({
    mockFn: () => mockGetApplications(filters),
    apiFn: async () => {
      const data = await api.get('/admin/applications', filters);
      if (Array.isArray(data)) {
        return { items: data, page: 0, size: data.length, total: data.length, totalPages: 1 };
      }
      if (data && Array.isArray(data.items)) {
        return data;
      }
      return { items: [], page: 0, size: 0, total: 0, totalPages: 0 };
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
          const withFormNo = assignKidzeeFormNo(formData, apps[idx], apps);
          apps[idx] = {
            ...apps[idx],
            ...withFormNo,
            ...meta,
            status: apps[idx].status || ENROLLMENT_STATUSES.DRAFT,
            updatedAt: new Date().toISOString(),
          };
          saveAll(apps);
          return apps[idx];
        }
      }
      const withFormNo = assignKidzeeFormNo(formData, null, apps);
      const draft = {
        id: `app-draft-${Date.now()}`,
        applicationNo: null,
        status: ENROLLMENT_STATUSES.DRAFT,
        ...withFormNo,
        ...meta,
        createdAt: new Date().toISOString(),
      };
      apps.push(draft);
      saveAll(apps);
      return draft;
    },
    apiFn: () => {
      const payload = sanitizeEnrollmentPayload({ ...formData, ...meta });
      return existingId
        ? api.put(`/enrollment/draft/${existingId}`, payload)
        : api.post('/enrollment/draft', payload);
    },
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
    apiFn: () => api.post('/enrollment/submit', sanitizeEnrollmentPayload({
      applicationId: existingId,
      parentId,
      schoolId,
      ...formData,
    })),
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

/** Public (no auth) load of an application via correction token. */
export async function getCorrectionApplication(token) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const apps = getAll();
      const app = apps.find((a) => a.status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED);
      return app || null;
    },
    apiFn: () => api.get(`/enrollment/correction/${token}`, undefined, { auth: false }),
  });
}

/** Public (no auth) load of an application via short-lived print token (Playwright PDF). */
export async function getPrintApplication(token) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const apps = getAll();
      return apps[0] || null;
    },
    apiFn: () => api.get(`/enrollment/print/${token}`, undefined, { auth: false }),
  });
}

function parseContentDispositionFilename(header) {
  if (!header) return null;
  const match = /filename="([^"]+)"/i.exec(header);
  return match?.[1] || null;
}

/** Download Kidzee enrollment PDF via backend Playwright renderer. */
export async function downloadKidzeeEnrollmentPdf(applicationId) {
  return routeRequest({
    mockFn: async () => {
      await delay(300);
      toastMockPdfDownload(applicationId);
    },
    apiFn: async () => {
      const headers = {};
      const tenantSlug = resolveTenantSlug();
      if (tenantSlug) headers[TENANT_HEADER] = tenantSlug;
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      let res;
      try {
        res = await fetch(`${API_BASE_URL}/enrollment/applications/${applicationId}/pdf`, { headers });
      } catch (networkErr) {
        const hint = networkErr?.message === 'Failed to fetch'
          ? `Cannot reach the API at ${API_BASE_URL}.`
          : (networkErr?.message || 'Network request failed');
        throw new ApiError(hint, 0, 'NETWORK_ERROR');
      }

      if (!res.ok) {
        const text = await res.text();
        let message = `PDF download failed (${res.status})`;
        try {
          const json = JSON.parse(text);
          message = json?.error?.message || message;
        } catch {
          if (text) message = text;
        }
        throw new ApiError(message, res.status);
      }

      const blob = await res.blob();
      const filename = parseContentDispositionFilename(res.headers.get('Content-Disposition'))
        || `kidzee-enrollment-${applicationId}.pdf`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });
}

function toastMockPdfDownload(applicationId) {
  if (typeof window !== 'undefined') {
    // Demo mode: no backend PDF — open print dialog as fallback
    window.print?.();
  }
  return { id: applicationId, mock: true };
}

/** Public (no auth) save draft via correction token. */
export async function saveCorrectionDraft(token, formData) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const apps = getAll();
      const idx = apps.findIndex((a) => a.status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED);
      if (idx >= 0) {
        apps[idx] = { ...apps[idx], ...formData, updatedAt: new Date().toISOString() };
        saveAll(apps);
        return apps[idx];
      }
      return { id: 'mock-correction', ...formData };
    },
    apiFn: () => api.put(`/enrollment/correction/${token}`, sanitizeEnrollmentPayload(formData), { auth: false }),
  });
}

/** Public (no auth) resubmit via correction token. */
export async function submitCorrectionApplication(token, formData) {
  return routeRequest({
    mockFn: async () => {
      await delay(600);
      const apps = getAll();
      const idx = apps.findIndex((a) => a.status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED);
      if (idx >= 0) {
        apps[idx] = {
          ...apps[idx],
          ...formData,
          status: ENROLLMENT_STATUSES.SUBMITTED,
          submittedAt: new Date().toISOString(),
        };
        saveAll(apps);
        return apps[idx];
      }
      return { id: 'mock-correction', status: ENROLLMENT_STATUSES.SUBMITTED };
    },
    apiFn: () => api.post(`/enrollment/correction/${token}/submit`, sanitizeEnrollmentPayload(formData), { auth: false }),
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
    mockFn: async () => {
      const apps = getAll();
      const app = apps.find((a) => a.id === id);
      if (!app) throw Object.assign(new Error('Application not found'), { status: 404, code: 'NOT_FOUND' });
      const parent = app.parent || {};
      const formData = app.formData || {};
      const fatherEmail = formData.fatherGuardian?.email || parent.fatherEmail || '';
      const motherEmail = formData.motherGuardian?.email || parent.motherEmail || '';
      const email = [fatherEmail, motherEmail, parent.email]
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .find(Boolean);
      if (!email) {
        throw Object.assign(
          new Error('Mother or Father email is required to create a parent account. Please add at least one parent email on the application first.'),
          { status: 400, code: 'VALIDATION_ERROR' },
        );
      }
      return mockUpdateStatus(id, ENROLLMENT_STATUSES.ACCOUNT_CREATED, 'Parent account created and invitation sent');
    },
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

export async function updateStudentClass(studentId, classApplying) {
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      const apps = getAll();
      const idx = apps.findIndex((a) => a.id === studentId);
      if (idx < 0) throw new Error('Student not found');
      const app = apps[idx];
      if (![
        ENROLLMENT_STATUSES.ADMISSION_CONFIRMED,
        ENROLLMENT_STATUSES.ACCOUNT_CREATED,
      ].includes(app.status)) {
        throw new Error('Class can only be updated for confirmed students');
      }
      const normalized = String(classApplying || '').trim().toLowerCase();
      if (!normalized) throw new Error('Class is required');
      apps[idx] = {
        ...app,
        student: { ...app.student, classApplying: normalized },
      };
      saveAll(apps);
      return {
        id: app.id,
        applicationNo: app.applicationNo,
        name: app.student?.fullName,
        classApplying: normalized,
        parentName: app.parent?.fatherName || app.parent?.motherName,
        status: app.status,
        submittedAt: app.submittedAt,
      };
    },
    apiFn: () => api.patch(`/admin/students/${studentId}/class`, { classApplying }),
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

export async function getAdminDashboard(recentLimit = 5) {
  return routeRequest({
    mockFn: async () => {
      await delay(100);
      const apps = getAll();
      return {
        stats: computeDashboardStats(apps),
        charts: await getDashboardChartData(),
        recent: apps.slice(0, recentLimit),
      };
    },
    apiFn: async () => {
      const data = await api.get('/admin/dashboard', { recentLimit });
      return {
        stats: data?.stats && typeof data.stats === 'object' ? data.stats : {},
        charts: Array.isArray(data?.charts) ? data.charts : [],
        recent: Array.isArray(data?.recent) ? data.recent : [],
      };
    },
  });
}
