export const CALENDAR_EVENT_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

export const CALENDAR_PRIORITY = {
  NORMAL: 'normal',
  HIGH: 'high',
  EMERGENCY: 'emergency',
};

export const CALENDAR_AUDIENCE_TYPE = {
  EVERYONE: 'everyone',
  ROLES: 'roles',
  CLASSES: 'classes',
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  DRIVERS: 'drivers',
  ROUTES: 'routes',
};

export const CALENDAR_SOURCE = {
  EVENT: 'EVENT',
  HOLIDAY: 'HOLIDAY',
  EXAM: 'EXAM',
  ASSIGNMENT: 'ASSIGNMENT',
  CLASS: 'CLASS',
  TRANSPORT: 'TRANSPORT',
  NOTICE: 'NOTICE',
};

export const CALENDAR_RECURRENCE = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKDAYS: 'weekdays',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
};

export const CALENDAR_EVENT_TYPES = [
  { value: 'school_holiday', label: 'School Holiday', category: 'holiday', color: '#e11d48', icon: 'Palmtree' },
  { value: 'public_holiday', label: 'Public Holiday', category: 'holiday', color: '#e11d48', icon: 'Flag' },
  { value: 'festival', label: 'Festival', category: 'holiday', color: '#e11d48', icon: 'Sparkles' },
  { value: 'vacation', label: 'Vacation', category: 'vacation', color: '#0d9488', icon: 'Palmtree' },
  { value: 'summer_break', label: 'Summer Break', category: 'vacation', color: '#0d9488', icon: 'Sun' },
  { value: 'winter_break', label: 'Winter Break', category: 'vacation', color: '#0d9488', icon: 'Snowflake' },
  { value: 'teacher_holiday', label: 'Teacher Holiday', category: 'staff', color: '#4f46e5', icon: 'UserCog' },
  { value: 'student_holiday', label: 'Student Holiday', category: 'holiday', color: '#e11d48', icon: 'GraduationCap' },
  { value: 'teacher_training', label: 'Teacher Training', category: 'staff', color: '#4f46e5', icon: 'BookOpen' },
  { value: 'staff_meeting', label: 'Staff Meeting', category: 'staff', color: '#4f46e5', icon: 'Users' },
  { value: 'school_event', label: 'School Event', category: 'event', color: '#7c3aed', icon: 'Calendar' },
  { value: 'sports_event', label: 'Sports Event', category: 'event', color: '#7c3aed', icon: 'Trophy' },
  { value: 'cultural_event', label: 'Cultural Event', category: 'event', color: '#7c3aed', icon: 'Music' },
  { value: 'exam', label: 'Exam', category: 'exam', color: '#ea580c', icon: 'FileText' },
  { value: 'exam_period', label: 'Exam Period', category: 'exam', color: '#ea580c', icon: 'ClipboardList' },
  { value: 'assignment_deadline', label: 'Assignment Deadline', category: 'class', color: '#16a34a', icon: 'BookOpen' },
  { value: 'ptm', label: 'PTM', category: 'ptm', color: '#2563eb', icon: 'UsersRound' },
  { value: 'class_event', label: 'Class Event', category: 'class', color: '#16a34a', icon: 'School' },
  { value: 'academic_event', label: 'Academic Event', category: 'class', color: '#16a34a', icon: 'BookMarked' },
  { value: 'half_day', label: 'Half Day', category: 'operations', color: '#d97706', icon: 'Clock' },
  { value: 'early_dismissal', label: 'Early Dismissal', category: 'operations', color: '#d97706', icon: 'Clock' },
  { value: 'late_opening', label: 'Late Opening', category: 'operations', color: '#d97706', icon: 'Sunrise' },
  { value: 'emergency_closure', label: 'Emergency Closure', category: 'emergency', color: '#be123c', icon: 'Siren' },
  { value: 'weather_closure', label: 'Weather Closure', category: 'emergency', color: '#be123c', icon: 'CloudRain' },
  { value: 'transport_closure', label: 'Transport Closure', category: 'transport', color: '#d97706', icon: 'Bus' },
  { value: 'transport_timing_change', label: 'Transport Timing Change', category: 'transport', color: '#d97706', icon: 'Bus' },
  { value: 'route_change', label: 'Route Change', category: 'transport', color: '#d97706', icon: 'Route' },
  { value: 'school_reopening', label: 'School Reopening', category: 'operations', color: '#0d9488', icon: 'DoorOpen' },
  { value: 'admission_event', label: 'Admission Event', category: 'event', color: '#7c3aed', icon: 'FileInput' },
  { value: 'fee_deadline', label: 'Fee Deadline', category: 'event', color: '#7c3aed', icon: 'CreditCard' },
  { value: 'custom', label: 'Custom Event', category: 'event', color: '#7c3aed', icon: 'Calendar' },
];

const TYPE_MAP = Object.fromEntries(CALENDAR_EVENT_TYPES.map((item) => [item.value, item]));

export function getCalendarEventType(value) {
  return TYPE_MAP[value] || TYPE_MAP.custom;
}

export const CALENDAR_CATEGORY_LABELS = {
  holiday: 'Holiday',
  vacation: 'Vacation',
  event: 'Event',
  exam: 'Exam',
  ptm: 'PTM',
  class: 'Class',
  transport: 'Transport',
  staff: 'Staff',
  emergency: 'Emergency',
  operations: 'Operations',
};

export const CALENDAR_STATUS_LABELS = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  cancelled: 'Cancelled',
  completed: 'Completed',
  archived: 'Archived',
};

export const SCHOOL_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'half_day', label: 'Half day' },
  { value: 'late_opening', label: 'Late opening' },
];

export const TRANSPORT_STATUS_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'updated', label: 'Updated' },
];

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: 'required', label: 'Required' },
  { value: 'not_required', label: 'Not required' },
  { value: 'holiday', label: 'Holiday' },
];

export const REMINDER_OPTIONS = [
  { value: 'immediate', label: 'Immediately' },
  { value: '30m', label: '30 minutes before' },
  { value: '1h', label: '1 hour before' },
  { value: '1d', label: '1 day before' },
  { value: '3d', label: '3 days before' },
  { value: '7d', label: '7 days before' },
];

export const CALENDAR_VIEWS = ['month', 'week', 'day', 'agenda', 'list', 'year'];

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function emptyCalendarAudience() {
  return {
    type: CALENDAR_AUDIENCE_TYPE.EVERYONE,
    roles: [],
    classIds: [],
    sectionIds: [],
    studentIds: [],
    teacherIds: [],
    parentIds: [],
    driverIds: [],
    routeIds: [],
    vehicleIds: [],
  };
}

export function emptyCalendarOperations() {
  return {
    schoolStatus: 'open',
    classesStatus: 'normal',
    studentAttendance: 'required',
    teacherAttendance: 'required',
    transportStatus: 'normal',
    transportScope: 'all',
    closeTime: '',
    openTime: '',
    busDepartureTime: '',
    pickupInstructions: '',
    reopensOn: '',
  };
}

export function emptyCalendarNotifications() {
  return {
    inApp: true,
    push: true,
    email: false,
    reminders: ['immediate'],
    requireAck: false,
  };
}

export function emptyCalendarEvent(overrides = {}) {
  const type = getCalendarEventType(overrides.eventType || 'school_event');
  return {
    id: '',
    title: '',
    description: '',
    eventType: type.value,
    eventCategory: type.category,
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    timezone: 'Asia/Kolkata',
    isAllDay: true,
    location: '',
    meetingUrl: '',
    displayColor: type.color,
    priority: CALENDAR_PRIORITY.NORMAL,
    recurrence: CALENDAR_RECURRENCE.NONE,
    recurrenceWeekdays: [],
    recurrenceUntil: '',
    parentEventId: null,
    excludedDates: [],
    status: CALENDAR_EVENT_STATUS.DRAFT,
    publishAt: '',
    publishedAt: '',
    academicYear: '',
    audience: emptyCalendarAudience(),
    operations: emptyCalendarOperations(),
    notifications: emptyCalendarNotifications(),
    acknowledgement: { required: false, count: 0, pending: 0 },
    source: CALENDAR_SOURCE.EVENT,
    sourceId: null,
    createdBy: '',
    updatedBy: '',
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    ...overrides,
  };
}
