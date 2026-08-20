import { calendarService, normalizeCalendarEvent } from './calendarService.js';
import { examService, homeworkService, parentHomeworkService } from './schoolModules/index.js';
import { getMyNotices } from './noticeBoardService.js';
import { CALENDAR_EVENT_STATUS, CALENDAR_SOURCE, getCalendarEventType } from '../constants/calendar.js';
import { toDateKey } from '../utils/calendarDates.js';
import { ROLES } from '../constants/roles.js';

function asExamEvent(exam) {
  const date = toDateKey(exam.examDate || exam.date);
  if (!date) return null;
  const type = getCalendarEventType('exam');
  return normalizeCalendarEvent({
    id: `exam-${exam.id}`,
    title: exam.name || exam.examName || 'Exam',
    description: [exam.subject, exam.className].filter(Boolean).join(' · '),
    eventType: 'exam',
    eventCategory: 'exam',
    startDate: date,
    endDate: date,
    isAllDay: true,
    status: CALENDAR_EVENT_STATUS.PUBLISHED,
    displayColor: type.color,
    source: CALENDAR_SOURCE.EXAM,
    sourceId: exam.id,
    audience: {
      type: exam.classId ? 'classes' : 'everyone',
      classIds: exam.classId ? [exam.classId] : [],
      sectionIds: exam.sectionId ? [exam.sectionId] : [],
      studentIds: [],
      roles: [],
    },
  });
}

function asHomeworkEvent(item) {
  const date = toDateKey(item.dueDate);
  if (!date) return null;
  const type = getCalendarEventType('assignment_deadline');
  return normalizeCalendarEvent({
    id: `hw-${item.id}`,
    title: item.title ? `Due: ${item.title}` : 'Assignment due',
    description: item.description || '',
    eventType: 'assignment_deadline',
    eventCategory: 'class',
    startDate: date,
    endDate: date,
    isAllDay: true,
    status: CALENDAR_EVENT_STATUS.PUBLISHED,
    displayColor: type.color,
    source: CALENDAR_SOURCE.ASSIGNMENT,
    sourceId: item.id,
    audience: {
      type: item.classId ? 'classes' : 'everyone',
      classIds: item.classId ? [item.classId] : [],
      studentIds: item.assignedStudentIds || [],
      roles: [],
    },
  });
}

function asNoticeEvent(notice) {
  const category = String(notice.category || '').toUpperCase();
  if (!['HOLIDAY', 'EVENT', 'EMERGENCY', 'EXAM', 'TRANSPORT'].includes(category)) return null;
  const date = toDateKey(notice.publishAt || notice.createdAt);
  if (!date) return null;
  const typeMap = {
    HOLIDAY: 'school_holiday',
    EVENT: 'school_event',
    EMERGENCY: 'emergency_closure',
    EXAM: 'exam',
    TRANSPORT: 'transport_timing_change',
  };
  const type = getCalendarEventType(typeMap[category]);
  return normalizeCalendarEvent({
    id: `notice-${notice.id}`,
    title: notice.title,
    description: notice.body || '',
    eventType: type.value,
    eventCategory: type.category,
    startDate: date,
    endDate: date,
    isAllDay: true,
    status: String(notice.status || 'PUBLISHED').toLowerCase() === 'published'
      ? CALENDAR_EVENT_STATUS.PUBLISHED
      : CALENDAR_EVENT_STATUS.DRAFT,
    displayColor: type.color,
    source: CALENDAR_SOURCE.NOTICE,
    sourceId: notice.id,
    priority: String(notice.priority || 'normal').toLowerCase() === 'urgent' ? 'emergency' : 'normal',
  });
}

export async function loadCalendarFeed({
  from,
  to,
  role,
  userId,
  classIds = [],
  studentIds = [],
  includeManaged = false,
  filters = {},
} = {}) {
  const [managed, exams, homework, notices] = await Promise.all([
    calendarService.list({ ...filters, from, to }).catch(() => []),
    examService.list().catch(() => []),
    (role === ROLES.PARENT || role === ROLES.STUDENT
      ? parentHomeworkService.list()
      : homeworkService.list()
    ).catch(() => []),
    getMyNotices(userId).catch(() => []),
  ]);

  const mappedExams = (exams || []).map(asExamEvent).filter(Boolean);
  const mappedHomework = (homework || []).map(asHomeworkEvent).filter(Boolean);
  const mappedNotices = (Array.isArray(notices) ? notices : notices?.items || []).map(asNoticeEvent).filter(Boolean);

  const combined = [...managed, ...mappedExams, ...mappedHomework, ...mappedNotices]
    .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index);

  const visible = includeManaged
    ? combined
    : calendarService.visible(combined, {
      role,
      userId,
      classIds,
      studentIds,
      canManage: includeManaged,
    });

  return calendarService.expand(visible, from, to);
}

/** Dashboard widget: calendar events only (skips exams/homework/notices). */
export async function loadCalendarUpcomingLight({
  from,
  to,
  role,
  userId,
  classIds = [],
  studentIds = [],
} = {}) {
  const managed = await calendarService.list({ from, to }).catch(() => []);
  const visible = calendarService.visible(managed, {
    role,
    userId,
    classIds,
    studentIds,
    canManage: false,
  });
  return calendarService.expand(visible, from, to);
}

export async function loadActiveEmergencyEvents(context = {}) {
  const today = toDateKey(new Date());
  const items = await calendarService.list({ from: today, to: today }).catch(() => []);
  return calendarService.visible(items, context).filter((item) => (
    item.status === CALENDAR_EVENT_STATUS.PUBLISHED
    && (item.priority === 'emergency' || item.eventCategory === 'emergency')
    && item.startDate <= today
    && (item.endDate || item.startDate) >= today
  ));
}

export async function getSchoolOperationsForDate(date, context = {}) {
  const items = await loadCalendarFeed({
    from: date,
    to: date,
    role: context.role,
    userId: context.userId,
    classIds: context.classIds || [],
    includeManaged: true,
  }).catch(() => []);
  return (items || []).find((item) => (
    item.operations?.schoolStatus === 'closed'
    || item.operations?.studentAttendance === 'holiday'
    || item.eventCategory === 'emergency'
  )) || null;
}
