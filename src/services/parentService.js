import usersData from '../data/users.json';
import { delay, getStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { getSchoolById } from './schoolService.js';
import { STATUS_LABELS } from '../constants/enrollmentStatuses.js';
import { INITIAL_APPLICATIONS } from '../data/mockApplications.js';
import { getMyFee, normalizeFee } from './feeService.js';

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
  return normalizeParentChild({
    applicationId: app.id,
    applicationNo: app.applicationNo,
    status: app.status,
    statusLabel: STATUS_LABELS[app.status] || app.status,
    submittedAt: app.submittedAt,
    updatedAt: app.updatedAt,
    schoolId: app.schoolId,
    classId: app.classId,
    className: app.className,
    student: app.student,
    parent: app.parent,
    address: app.address,
    academic: app.academic,
    medical: app.medical,
    documents: app.documents,
    declaration: app.declaration,
    signature: app.signature,
    formType: app.formType,
    formData: app.formData,
    statusHistory: app.statusHistory,
  });
}

export function normalizeParentChild(child) {
  if (!child) return null;
  const student = child.student || {};
  const cls = child.class || {};
  const academic = child.academic || {};
  const applicationId = child.applicationId || child.id;
  const classId = child.classId
    || child.assignedClassId
    || child.enrolledClassId
    || student.classId
    || academic.classId
    || cls.id
    || cls.classId
    || null;
  const className = child.className
    || student.className
    || cls.name
    || cls.className
    || academic.className
    || student.classApplying
    || academic.classApplying
    || null;
  const studentName = student.fullName
    || [student.firstName, student.lastName].filter(Boolean).join(' ')
    || null;

  return {
    applicationId,
    applicationNo: child.applicationNo,
    status: child.status,
    statusLabel: child.statusLabel || STATUS_LABELS[child.status] || child.status,
    submittedAt: child.submittedAt,
    updatedAt: child.updatedAt,
    schoolId: child.schoolId,
    classId,
    className,
    studentName,
    student,
    parent: child.parent || {},
    address: child.address || {},
    academic: child.academic || {},
    medical: child.medical || {},
    documents: child.documents || {},
    declaration: child.declaration || {},
    signature: child.signature || {},
    formType: child.formType || null,
    formData: child.formData || child.printableEnrollment || null,
    statusHistory: child.statusHistory || [],
  };
}

function kidzeeEnrollPath(school) {
  return school?.slug
    ? `/${school.slug}/enrollment/kidzee-print-form`
    : '/enrollment/kidzee-print-form';
}

function normalizeParentDashboard(data) {
  if (!data) return data;
  return {
    ...data,
    enrollPath: kidzeeEnrollPath(data.school),
    children: (data.children || []).map((child) => normalizeParentChild(child)),
  };
}

export async function enrichParentChildrenWithClass(parentId, children, user) {
  const normalized = (children || []).map((child) => normalizeParentChild(child));
  return Promise.all(normalized.map(async (child) => {
    if (child.classId) return child;
    if (!child.applicationId) return child;
    try {
      const detail = await getParentChild(parentId, child.applicationId, user);
      return normalizeParentChild({ ...child, ...detail });
    } catch {
      return child;
    }
  }));
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
    enrollPath: kidzeeEnrollPath(school),
  };
}

export async function getParentDashboard(parentId, schoolId, user) {
  return routeRequest({
    user,
    mockFn: () => mockGetParentDashboard(parentId, schoolId),
    apiFn: async () => {
      const data = await api.get('/parent/dashboard', { schoolId });
      return normalizeParentDashboard(data);
    },
  });
}

export async function getParentChildren(user) {
  return routeRequest({
    user,
    mockFn: async () => {
      await delay(150);
      return readParentApplications(user?.id).map(mapChildApplication);
    },
    apiFn: async () => {
      const data = await api.get('/parent/children');
      const list = Array.isArray(data) ? data : [];
      return list.map((child) => normalizeParentChild(child));
    },
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
    apiFn: async () => {
      const data = await api.get(`/parent/children/${applicationId}`);
      return normalizeParentChild(data);
    },
  });
}

/** Single call: child + fee + siblings for enrollment detail page. */
export async function getParentEnrollmentDetail(applicationId, user) {
  return routeRequest({
    user,
    mockFn: async () => {
      await delay(200);
      const parentId = user?.id;
      const dashboard = await mockGetParentDashboard(parentId, user?.schoolId);
      const child = dashboard.children.find((c) => c.applicationId === applicationId) || null;
      let fee = null;
      if (child?.applicationId) {
        fee = await getMyFee(child.applicationId, user);
      }
      return {
        child,
        fee,
        children: dashboard.children,
        school: dashboard.school,
        enrollPath: dashboard.enrollPath,
      };
    },
    apiFn: async () => {
      const data = await api.get(`/parent/children/${applicationId}/enrollment-detail`);
      return {
        ...data,
        enrollPath: kidzeeEnrollPath(data.school),
        child: normalizeParentChild(data.child),
        children: (data.children || []).map((child) => normalizeParentChild(child)),
        fee: data.fee ? normalizeFee(data.fee) : null,
      };
    },
  });
}
