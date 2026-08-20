import { CALENDAR_AUDIENCE_TYPE, CALENDAR_EVENT_STATUS } from '../constants/calendar.js';
import { ROLES } from '../constants/roles.js';

export function eventIsVisibleToUser(event, context = {}) {
  if (!event) return false;
  const {
    role,
    userId,
    classIds = [],
    studentIds = [],
    routeIds = [],
    vehicleIds = [],
    canManage = false,
  } = context;

  if (event.deletedAt) return false;
  if (event.status === CALENDAR_EVENT_STATUS.CANCELLED && !canManage) return false;
  if ([CALENDAR_EVENT_STATUS.DRAFT, CALENDAR_EVENT_STATUS.ARCHIVED].includes(event.status) && !canManage) {
    return false;
  }
  if (event.status === CALENDAR_EVENT_STATUS.SCHEDULED) {
    if (!canManage) {
      const publishAt = event.publishAt ? new Date(event.publishAt).getTime() : 0;
      if (publishAt && publishAt > Date.now()) return false;
    }
  }

  const audience = event.audience || { type: CALENDAR_AUDIENCE_TYPE.EVERYONE };
  if (!audience.type || audience.type === CALENDAR_AUDIENCE_TYPE.EVERYONE) return true;
  if (canManage) return true;

  const roleKey = String(role || '').toLowerCase();
  if (audience.type === CALENDAR_AUDIENCE_TYPE.ROLES) {
    return (audience.roles || []).map((item) => String(item).toLowerCase()).includes(roleKey);
  }
  if (audience.type === CALENDAR_AUDIENCE_TYPE.CLASSES) {
    if (roleKey === ROLES.TEACHER || roleKey === ROLES.SCHOOL_ADMIN) {
      return (audience.classIds || []).some((id) => classIds.map(String).includes(String(id)));
    }
    return (audience.classIds || []).some((id) => classIds.map(String).includes(String(id)))
      || (audience.studentIds || []).some((id) => studentIds.map(String).includes(String(id)));
  }
  if (audience.type === CALENDAR_AUDIENCE_TYPE.STUDENTS) {
    return (audience.studentIds || []).some((id) => studentIds.map(String).includes(String(id)))
      || (audience.parentIds || []).map(String).includes(String(userId));
  }
  if (audience.type === CALENDAR_AUDIENCE_TYPE.TEACHERS) {
    return roleKey === ROLES.TEACHER
      && ((audience.teacherIds || []).length === 0 || (audience.teacherIds || []).map(String).includes(String(userId)));
  }
  if (audience.type === CALENDAR_AUDIENCE_TYPE.DRIVERS) {
    return roleKey === ROLES.DRIVER
      && ((audience.driverIds || []).length === 0 || (audience.driverIds || []).map(String).includes(String(userId)));
  }
  if (audience.type === CALENDAR_AUDIENCE_TYPE.ROUTES) {
    const hitRoute = (audience.routeIds || []).some((id) => routeIds.map(String).includes(String(id)));
    const hitBus = (audience.vehicleIds || []).some((id) => vehicleIds.map(String).includes(String(id)));
    return hitRoute || hitBus;
  }
  return false;
}

export function appliesToChild(event, child) {
  if (!event || !child) return false;
  const audience = event.audience || { type: CALENDAR_AUDIENCE_TYPE.EVERYONE };
  if (!audience.type || audience.type === CALENDAR_AUDIENCE_TYPE.EVERYONE) return true;
  if (audience.type === CALENDAR_AUDIENCE_TYPE.ROLES) {
    return (audience.roles || []).map((item) => String(item).toLowerCase()).includes('parent')
      || (audience.roles || []).map((item) => String(item).toLowerCase()).includes('student');
  }
  const classId = String(child.classId || '');
  const studentId = String(child.studentId || child.id || '');
  if (audience.classIds?.length) return audience.classIds.map(String).includes(classId);
  if (audience.studentIds?.length) return audience.studentIds.map(String).includes(studentId);
  return true;
}

export function buildRoleMessage(event, role) {
  const title = event.title || 'School event';
  const date = event.startDate || '';
  const school = event.operations?.schoolStatus;
  const transport = event.operations?.transportStatus;
  if (role === ROLES.DRIVER) {
    if (transport === 'cancelled') return `Bus service is cancelled on ${date} because of ${title}.`;
    if (transport === 'updated') {
      return `BUS timing updated for ${title} on ${date}${event.operations?.busDepartureTime ? ` — departure ${event.operations.busDepartureTime}` : ''}.`;
    }
    return `${title} on ${date}. Check whether your route is affected.`;
  }
  if (role === ROLES.TEACHER) {
    if (event.eventType === 'teacher_training') return `Teacher training on ${date}: ${title}.`;
    if (school === 'closed') return `School is closed on ${date} for ${title}.`;
    return `${title} on ${date}.`;
  }
  if (role === ROLES.STUDENT) {
    if (school === 'closed' || event.eventCategory === 'holiday') return `No school on ${date} — ${title}.`;
    return `${title} on ${date}.`;
  }
  if (school === 'closed') {
    return `School will remain closed on ${date} for ${title}. Classes${transport === 'cancelled' ? ' and transport services are' : ' are'} unavailable.`;
  }
  if (event.eventType === 'half_day') {
    return `Half day on ${date}${event.operations?.closeTime ? ` — school closes at ${event.operations.closeTime}` : ''}.`;
  }
  return `${title} on ${date}.`;
}

export function meaningfulCalendarChange(previous, next) {
  if (!previous || !next) return false;
  const keys = [
    'startDate', 'endDate', 'startTime', 'endTime', 'location', 'title', 'status',
  ];
  if (keys.some((key) => String(previous[key] || '') !== String(next[key] || ''))) return true;
  const ops = ['schoolStatus', 'transportStatus', 'classesStatus', 'closeTime', 'openTime', 'busDepartureTime'];
  if (ops.some((key) => String(previous.operations?.[key] || '') !== String(next.operations?.[key] || ''))) return true;
  return JSON.stringify(previous.audience || {}) !== JSON.stringify(next.audience || {});
}
