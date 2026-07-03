import { ENROLLMENT_STATUSES } from '../constants/enrollmentStatuses.js';
import { STATUS_LABELS } from '../constants/enrollmentStatuses.js';
import { delay, getStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { INITIAL_APPLICATIONS } from '../data/mockApplications.js';
import { INITIAL_FEES } from '../data/mockFees.js';
import { INITIAL_PHOTOS } from '../data/mockPhotos.js';
import { INITIAL_NOTIFICATIONS } from '../data/mockNotifications.js';

const APPS_KEY = 'sb_applications';
const FEES_KEY = 'sb_fees';
const PHOTOS_KEY = 'sb_photos';

function getApplications() {
  return getStore(APPS_KEY, INITIAL_APPLICATIONS);
}

function getFees() {
  return getStore(FEES_KEY, INITIAL_FEES);
}

function getPhotos() {
  return getStore(PHOTOS_KEY, INITIAL_PHOTOS);
}

function inPeriod(dateIso, periodDays) {
  if (!periodDays || periodDays === 'all') return true;
  const days = Number(periodDays);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(dateIso).getTime() >= cutoff;
}

function buildApplicationsReport(apps, periodDays) {
  const filtered = apps.filter((a) => a.submittedAt && inPeriod(a.submittedAt, periodDays));
  const byStatus = {};
  filtered.forEach((a) => {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  });

  return {
    summary: {
      total: filtered.length,
      underReview: filtered.filter((a) => [
        ENROLLMENT_STATUSES.SUBMITTED,
        ENROLLMENT_STATUSES.UNDER_REVIEW,
        ENROLLMENT_STATUSES.CORRECTION_REQUIRED,
        ENROLLMENT_STATUSES.DOCUMENTS_PENDING,
        ENROLLMENT_STATUSES.DOCUMENTS_VERIFIED,
      ].includes(a.status)).length,
      approved: filtered.filter((a) => [
        ENROLLMENT_STATUSES.FEE_PENDING,
        ENROLLMENT_STATUSES.FEE_SUBMITTED,
        ENROLLMENT_STATUSES.FEE_VERIFIED,
        ENROLLMENT_STATUSES.APPROVED,
        ENROLLMENT_STATUSES.ADMISSION_CONFIRMED,
        ENROLLMENT_STATUSES.ACCOUNT_CREATED,
      ].includes(a.status)).length,
      rejected: filtered.filter((a) => a.status === ENROLLMENT_STATUSES.REJECTED).length,
    },
    rows: filtered.map((a) => ({
      applicationNo: a.applicationNo,
      studentName: a.student?.fullName,
      classApplying: a.student?.classApplying?.toUpperCase(),
      status: STATUS_LABELS[a.status] || a.status,
      submittedAt: a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '—',
      parentMobile: a.parent?.fatherMobile || '—',
    })),
    byStatus: Object.entries(byStatus).map(([status, count]) => ({
      status: STATUS_LABELS[status] || status,
      count,
    })),
  };
}

function buildFeesReport(fees, periodDays) {
  const filtered = fees.filter((f) => {
    const date = f.payment?.submittedAt || f.payment?.verifiedAt;
    if (!date) return periodDays === 'all' || !periodDays;
    return inPeriod(date, periodDays);
  });

  const collected = filtered
    .filter((f) => f.status === 'verified')
    .reduce((sum, f) => sum + (f.total || 0), 0);
  const pending = filtered
    .filter((f) => ['fee_pending', 'payment_submitted'].includes(f.status))
    .reduce((sum, f) => sum + (f.total || 0), 0);

  return {
    summary: {
      totalRecords: filtered.length,
      collected,
      pending,
      verified: filtered.filter((f) => f.status === 'verified').length,
    },
    rows: filtered.map((f) => ({
      applicationNo: f.applicationNo,
      studentName: f.studentName,
      classApplying: f.classApplying?.toUpperCase(),
      total: f.total,
      status: f.status,
      transactionId: f.payment?.transactionId || '—',
      receiptNo: f.payment?.receiptNo || '—',
    })),
  };
}

function buildCommunicationsReport(photos, periodDays) {
  const filteredPhotos = photos.filter((p) => inPeriod(p.sentAt, periodDays));
  const notifications = INITIAL_NOTIFICATIONS.filter((n) => inPeriod(n.createdAt, periodDays));

  return {
    summary: {
      photosShared: filteredPhotos.length,
      notificationsSent: notifications.length,
      classesReached: new Set(filteredPhotos.map((p) => p.className)).size,
    },
    rows: [
      ...filteredPhotos.map((p) => ({
        type: 'Photo',
        detail: p.caption || 'Classroom photo',
        className: p.className,
        sentBy: p.teacherName,
        sentAt: new Date(p.sentAt).toLocaleString(),
      })),
      ...notifications.map((n) => ({
        type: 'Notification',
        detail: n.title,
        className: '—',
        sentBy: 'System',
        sentAt: new Date(n.createdAt).toLocaleString(),
      })),
    ].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)),
  };
}

export async function getReportsSummary(periodDays = '30') {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const apps = getApplications();
      const fees = getFees();
      const photos = getPhotos();
      const appReport = buildApplicationsReport(apps, periodDays);
      const feeReport = buildFeesReport(fees, periodDays);
      const commReport = buildCommunicationsReport(photos, periodDays);
      return {
        applications: appReport.summary,
        fees: feeReport.summary,
        communications: commReport.summary,
        periodDays,
      };
    },
    apiFn: () => api.get('/admin/reports/summary', { periodDays }),
  });
}

export async function getReport(type, periodDays = '30') {
  return routeRequest({
    mockFn: async () => {
      await delay();
      if (type === 'applications') {
        return buildApplicationsReport(getApplications(), periodDays);
      }
      if (type === 'fees') {
        return buildFeesReport(getFees(), periodDays);
      }
      if (type === 'communications') {
        return buildCommunicationsReport(getPhotos(), periodDays);
      }
      throw new Error('Unknown report type');
    },
    apiFn: () => api.get(`/admin/reports/${type}`, { periodDays }),
  });
}

export async function exportReport(type, periodDays = '30') {
  return routeRequest({
    mockFn: async () => {
      const report = await getReport(type, periodDays);
      return { type, periodDays, rows: report.rows, exportedAt: new Date().toISOString() };
    },
    apiFn: () => api.post(`/admin/reports/${type}/export`, { periodDays }),
  });
}
