import usersData from '../data/users.json';
import { delay, getStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { getSchoolById } from './schoolService.js';
import { STATUS_LABELS } from '../constants/enrollmentStatuses.js';
import { INITIAL_APPLICATIONS } from '../data/mockApplications.js';

const APPS_KEY = 'sb_applications';

function readParentApplications(parentId) {
  const apps = getStore(APPS_KEY, INITIAL_APPLICATIONS);
  return apps.filter(
    (a) => a.parentId === parentId || (a.parentId === 'u-parent' && parentId === 'usr-parent'),
  );
}

function findParentUser(parentId) {
  const user = usersData.users.find((u) => u.id === parentId);
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

function mapChildApplication(app) {
  return {
    applicationId: app.id,
    applicationNo: app.applicationNo,
    status: app.status,
    statusLabel: STATUS_LABELS[app.status] || app.status,
    submittedAt: app.submittedAt,
    updatedAt: app.updatedAt,
    schoolId: app.schoolId,
    student: app.student || {},
    parent: app.parent || {},
    address: app.address || {},
    academic: app.academic || {},
    documents: app.documents || {},
    statusHistory: app.statusHistory || [],
  };
}

async function mockGetParentDashboard(parentId, schoolId) {
  await delay(200);
  const parent = findParentUser(parentId);
  const school = schoolId ? getSchoolById(schoolId) : null;
  const applications = readParentApplications(parentId);
  const scoped = schoolId
    ? applications.filter((a) => !a.schoolId || a.schoolId === schoolId)
    : applications;

  const children = scoped.map(mapChildApplication);

  return {
    parent: parent ? {
      id: parent.id,
      name: parent.name,
      email: parent.email,
      mobile: parent.mobile,
      schoolId: parent.schoolId,
      role: parent.role,
    } : null,
    school: school ? {
      id: school.id,
      slug: school.slug,
      name: school.name,
      academicYear: school.academicYear,
      address: school.address,
      phone: school.phone,
      email: school.email,
    } : null,
    children,
    summary: {
      totalChildren: children.length,
      activeApplications: children.filter((c) => c.status !== 'rejected').length,
      pendingActions: children.filter((c) => [
        'correction_required',
        'fee_pending',
        'documents_pending',
      ].includes(c.status)).length,
    },
    enrollPath: school?.slug ? `/${school.slug}/enroll` : '/enrollment',
  };
}

export async function getParentDashboard(parentId, schoolId, user) {
  return routeRequest({
    user,
    mockFn: () => mockGetParentDashboard(parentId, schoolId),
    apiFn: () => api.get('/parent/dashboard', { schoolId }),
  });
}

export async function getParentChild(parentId, applicationId, user) {
  return routeRequest({
    user,
    mockFn: async () => {
      await delay(150);
      const children = readParentApplications(parentId).map(mapChildApplication);
      return children.find((c) => c.applicationId === applicationId) || null;
    },
    apiFn: () => api.get(`/parent/children/${applicationId}`),
  });
}
