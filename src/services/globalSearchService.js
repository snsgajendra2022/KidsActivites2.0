import { ROLES } from '../constants/roles.js';
import { getApplications } from './enrollmentService.js';
import { getFees } from './feeService.js';
import { listStudentsForRelationships } from './studentDirectoryService.js';
import { listTeachers } from './teacherService.js';
import { listDrivers } from './driverService.js';
import { listClasses } from './classManagementService.js';
import { getNotices, getMyNotices } from './noticeBoardService.js';
import { getApplicationsByParent } from './enrollmentService.js';
import { listUsers } from './userService.js';
import {
  examService,
  homeworkService,
  lmsService,
  parentHomeworkService,
  teacherHomeworkService,
  transportRouteService,
  transportVehicleService,
} from './schoolModules/index.js';
import {
  dedupeSearchResults,
  groupSearchResults,
  scoreMatch,
  searchNavItems,
  textMatchesQuery,
} from '../utils/globalSearchUtils.js';

const ADMIN_ROLES = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.SCHOOL_ADMIN,
  ROLES.ADMISSION_OFFICER,
]);
const FEES_ROLES = new Set([...ADMIN_ROLES, ROLES.ACCOUNTANT]);
const ERP_ADMIN = new Set([ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN]);

async function safeProvider(fn) {
  try {
    return await fn();
  } catch {
    return [];
  }
}

function mapStudent(item, tenantPath) {
  const id = String(item.id || item.studentId || '');
  if (!id) return null;
  const name = item.fullName || item.name || item.studentName || 'Student';
  return {
    id,
    kind: 'student',
    title: name,
    subtitle: [item.applicationNo, item.className || item.classApplying, item.sectionName]
      .filter(Boolean)
      .join(' · ') || 'Student record',
    path: tenantPath(`/admin/students/${id}`),
    score: 0,
  };
}

function mapApplication(item, tenantPath, { parent = false } = {}) {
  const id = String(item.id || '');
  if (!id) return null;
  const student = item.student || item.formData || {};
  const name = student.fullName || student.name || item.studentName || item.applicationNo || 'Application';
  return {
    id,
    kind: 'application',
    title: name,
    subtitle: [item.applicationNo, item.status, student.classApplying || item.classApplying]
      .filter(Boolean)
      .join(' · ') || (parent ? 'Enrollment' : 'Application'),
    path: parent
      ? tenantPath('/parent/enrollment')
      : tenantPath(`/admin/applications/${id}`),
    score: 0,
  };
}

function mapFee(item, tenantPath) {
  const id = String(item.id || item.applicationId || '');
  if (!id) return null;
  return {
    id,
    kind: 'fee',
    title: item.studentName || item.applicationNo || 'Fee record',
    subtitle: [item.classApplying, item.status, item.total != null ? `₹${item.total}` : '']
      .filter(Boolean)
      .join(' · ') || 'Fees',
    path: tenantPath('/admin/fees'),
    score: 0,
  };
}

function mapNamedRecord(item, kind, pathBuilder, titleFields, subtitleFields) {
  const id = String(item.id || '');
  if (!id) return null;
  const title = titleFields.map((field) => item[field]).find(Boolean) || kind;
  const subtitle = subtitleFields.map((field) => item[field]).filter(Boolean).join(' · ') || kind;
  return {
    id,
    kind,
    title: String(title),
    subtitle,
    path: pathBuilder(id),
    score: 0,
  };
}

function filterAndScore(items, query) {
  const q = String(query || '').trim();
  if (!q) return [];
  return items
    .map((item) => ({
      ...item,
      score: scoreMatch([item.title, item.subtitle], q),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

async function searchAdminRecords(query, { tenantPath, user, role }) {
  const tasks = [];

  if (ADMIN_ROLES.has(role) || role === ROLES.SUPPORT_STAFF) {
    tasks.push(safeProvider(async () => {
      const students = await listStudentsForRelationships({ q: query, status: 'active' });
      return students.map((item) => mapStudent(item, tenantPath)).filter(Boolean);
    }));

    tasks.push(safeProvider(async () => {
      const { items = [] } = await getApplications({
        q: query,
        search: query,
        query,
      });
      return items.map((item) => mapApplication(item, tenantPath)).filter(Boolean);
    }));
  }

  if (FEES_ROLES.has(role)) {
    tasks.push(safeProvider(async () => {
      const fees = await getFees({ q: query, search: query, query });
      const list = Array.isArray(fees) ? fees : [];
      return list.map((item) => mapFee(item, tenantPath)).filter(Boolean);
    }));
  }

  if (ADMIN_ROLES.has(role)) {
    tasks.push(safeProvider(async () => {
      const teachers = await listTeachers({ search: query }, user);
      return (teachers || []).map((item) => mapNamedRecord(
        item,
        'teacher',
        () => tenantPath('/admin/teachers'),
        ['name'],
        ['email', 'mobile', 'status'],
      )).filter(Boolean);
    }));

    tasks.push(safeProvider(async () => {
      const drivers = await listDrivers({ search: query, q: query });
      return (drivers || []).map((item) => mapNamedRecord(
        item,
        'driver',
        () => tenantPath('/admin/transport/drivers'),
        ['name'],
        ['mobile', 'vehicleNumber', 'licenseNumber'],
      )).filter(Boolean);
    }));

    tasks.push(safeProvider(async () => {
      const vehicles = await transportVehicleService.list({ search: query, q: query });
      return (vehicles || []).map((item) => mapNamedRecord(
        item,
        'vehicle',
        () => tenantPath('/admin/transport/vehicles'),
        ['vehicleNumber', 'registrationNumber', 'number'],
        ['model', 'status'],
      )).filter(Boolean);
    }));

    tasks.push(safeProvider(async () => {
      const routes = await transportRouteService.list({ search: query, q: query });
      return (routes || []).map((item) => mapNamedRecord(
        item,
        'route',
        () => tenantPath('/admin/transport/routes'),
        ['name', 'routeName'],
        ['direction', 'status'],
      )).filter(Boolean);
    }));

    tasks.push(safeProvider(async () => {
      const classes = await listClasses({ search: query, q: query });
      return (classes || []).map((item) => mapNamedRecord(
        item,
        'class',
        () => tenantPath('/admin/class-management'),
        ['name', 'code'],
        ['section', 'status'],
      )).filter(Boolean);
    }));

    tasks.push(safeProvider(async () => {
      const homework = await homeworkService.list({ search: query, q: query });
      return (homework || []).map((item) => mapNamedRecord(
        item,
        'homework',
        () => tenantPath('/admin/homework'),
        ['title'],
        ['className', 'subject', 'dueDate'],
      )).filter(Boolean);
    }));

    tasks.push(safeProvider(async () => {
      const exams = await examService.list({ search: query, q: query });
      return (exams || []).map((item) => mapNamedRecord(
        item,
        'exam',
        () => tenantPath('/admin/exams'),
        ['name', 'title'],
        ['className', 'subject', 'examDate'],
      )).filter(Boolean);
    }));

    tasks.push(safeProvider(async () => {
      const { items = [] } = await getNotices({ search: query, q: query });
      return (items || []).map((item) => mapNamedRecord(
        item,
        'notice',
        (id) => tenantPath(`/admin/notice-board/${id}`),
        ['title'],
        ['category', 'priority', 'status'],
      )).filter(Boolean);
    }));

    tasks.push(safeProvider(async () => {
      const courses = await lmsService.list({ search: query, q: query });
      return (courses || []).map((item) => mapNamedRecord(
        item,
        'course',
        (id) => tenantPath(`/admin/lms/courses/${id}`),
        ['title', 'name'],
        ['category', 'status'],
      )).filter(Boolean);
    }));
  }

  if (ERP_ADMIN.has(role)) {
    tasks.push(safeProvider(async () => {
      const users = await listUsers({ search: query, q: query }, user);
      const list = Array.isArray(users) ? users : (users?.items || []);
      return list.map((item) => mapNamedRecord(
        item,
        'user',
        () => tenantPath(role === ROLES.SUPER_ADMIN ? '/admin/users' : '/admin/all-users'),
        ['name', 'fullName'],
        ['email', 'role', 'mobile'],
      )).filter(Boolean);
    }));
  }

  const settled = await Promise.all(tasks);
  return settled.flat();
}

async function searchTeacherRecords(query, { tenantPath }) {
  const tasks = [
    safeProvider(async () => {
      const homework = await teacherHomeworkService.list({ search: query, q: query });
      return (homework || []).map((item) => mapNamedRecord(
        item,
        'homework',
        () => tenantPath('/teacher/homework'),
        ['title'],
        ['className', 'subject', 'dueDate'],
      )).filter(Boolean);
    }),
    safeProvider(async () => {
      const classes = await listClasses({ search: query, q: query });
      return (classes || []).map((item) => mapNamedRecord(
        item,
        'class',
        () => tenantPath('/teacher/classes'),
        ['name', 'code'],
        ['section', 'status'],
      )).filter(Boolean);
    }),
  ];
  const settled = await Promise.all(tasks);
  return settled.flat();
}

async function searchParentRecords(query, { tenantPath, user }) {
  const tasks = [
    safeProvider(async () => {
      const children = await getApplicationsByParent(user?.id);
      const list = Array.isArray(children) ? children : [];
      return list
        .filter((item) => textMatchesQuery([
          item.student?.fullName,
          item.student?.name,
          item.applicationNo,
          item.status,
        ], query))
        .map((item) => mapApplication(item, tenantPath, { parent: true }))
        .filter(Boolean);
    }),
    safeProvider(async () => {
      const homework = await parentHomeworkService.list({ search: query, q: query });
      return (homework || []).map((item) => mapNamedRecord(
        item,
        'homework',
        () => tenantPath('/parent/homework'),
        ['title'],
        ['className', 'subject', 'dueDate'],
      )).filter(Boolean);
    }),
    safeProvider(async () => {
      const { items = [] } = await getMyNotices(user?.id, { search: query });
      return (items || []).map((item) => mapNamedRecord(
        item,
        'notice',
        (id) => tenantPath(`/parent/notice-board/${id}`),
        ['title'],
        ['category', 'priority'],
      )).filter(Boolean);
    }),
  ];
  const settled = await Promise.all(tasks);
  return settled.flat();
}

/**
 * Global search across navigation and role-scoped school records.
 *
 * @param {Object} params
 * @param {string} params.query
 * @param {string} params.role
 * @param {object} params.user
 * @param {Array} params.navItems
 * @param {(path: string) => string} params.tenantPath
 */
export async function runGlobalSearch({
  query,
  role,
  user,
  navItems,
  tenantPath,
}) {
  const trimmed = String(query || '').trim();
  const pageResults = searchNavItems(navItems, trimmed, { limit: trimmed ? 10 : 6 });

  if (!trimmed) {
    return {
      groups: groupSearchResults(pageResults),
      flat: pageResults,
      total: pageResults.length,
    };
  }

  let recordResults = [];
  if (ADMIN_ROLES.has(role) || role === ROLES.SUPPORT_STAFF || FEES_ROLES.has(role)) {
    recordResults = await searchAdminRecords(trimmed, { tenantPath, user, role });
  } else if (role === ROLES.TEACHER) {
    recordResults = await searchTeacherRecords(trimmed, { tenantPath });
  } else if (role === ROLES.PARENT || role === ROLES.STUDENT) {
    recordResults = await searchParentRecords(trimmed, { tenantPath, user });
  }

  const scoredRecords = filterAndScore(recordResults, trimmed);
  const merged = dedupeSearchResults([
    ...pageResults,
    ...scoredRecords,
  ]).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  return {
    groups: groupSearchResults(merged),
    flat: merged,
    total: merged.length,
  };
}
