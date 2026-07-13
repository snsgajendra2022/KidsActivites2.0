export const NOTICE_STATUS = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
  EXPIRED: 'EXPIRED',
};

export const NOTICE_PRIORITY = {
  NORMAL: 'NORMAL',
  IMPORTANT: 'IMPORTANT',
  URGENT: 'URGENT',
};

export const NOTICE_CATEGORY = {
  GENERAL: 'GENERAL',
  ADMISSION: 'ADMISSION',
  FEES: 'FEES',
  EXAM: 'EXAM',
  HOLIDAY: 'HOLIDAY',
  EVENT: 'EVENT',
  EMERGENCY: 'EMERGENCY',
  HOMEWORK: 'HOMEWORK',
  ACTIVITY: 'ACTIVITY',
  TRANSPORT: 'TRANSPORT',
  HEALTH: 'HEALTH',
  OTHER: 'OTHER',
};

export const NOTICE_AUDIENCE_TYPE = {
  ALL_USERS: 'ALL_USERS',
  ALL_PARENTS: 'ALL_PARENTS',
  ALL_TEACHERS: 'ALL_TEACHERS',
  ALL_STAFF: 'ALL_STAFF',
  SELECTED_ROLES: 'SELECTED_ROLES',
  SELECTED_CLASSES: 'SELECTED_CLASSES',
  SELECTED_SECTIONS: 'SELECTED_SECTIONS',
  SELECTED_TEACHERS: 'SELECTED_TEACHERS',
  SELECTED_PARENTS: 'SELECTED_PARENTS',
  SELECTED_STUDENTS: 'SELECTED_STUDENTS',
  CUSTOM_GROUP: 'CUSTOM_GROUP',
  MANUAL_USERS: 'MANUAL_USERS',
};

export const NOTICE_STATUS_LABELS = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
  EXPIRED: 'Expired',
};

export const NOTICE_PRIORITY_LABELS = {
  NORMAL: 'Normal',
  IMPORTANT: 'Important',
  URGENT: 'Urgent',
};

export const NOTICE_CATEGORY_LABELS = {
  GENERAL: 'General',
  ADMISSION: 'Admission',
  FEES: 'Fees',
  EXAM: 'Exam',
  HOLIDAY: 'Holiday',
  EVENT: 'Event',
  EMERGENCY: 'Emergency',
  HOMEWORK: 'Homework',
  ACTIVITY: 'Activity',
  TRANSPORT: 'Transport',
  HEALTH: 'Health',
  OTHER: 'Other',
};

export const NOTICE_AUDIENCE_LABELS = {
  ALL_USERS: 'All users',
  ALL_PARENTS: 'All parents',
  ALL_TEACHERS: 'All teachers',
  ALL_STAFF: 'All staff',
  SELECTED_ROLES: 'Selected roles',
  SELECTED_CLASSES: 'Selected classes',
  SELECTED_SECTIONS: 'Selected sections',
  SELECTED_TEACHERS: 'Selected teachers',
  SELECTED_PARENTS: 'Selected parents',
  SELECTED_STUDENTS: 'Selected students / families',
  CUSTOM_GROUP: 'Custom group',
  MANUAL_USERS: 'Manual user selection',
};

export const STAFF_ROLES = [
  'school_admin',
  'super_admin',
  'admission_officer',
  'accountant',
  'support_staff',
];

export const AUDIENCE_ROLE_OPTIONS = [
  { value: 'PARENT', label: 'Parent' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'SCHOOL_ADMIN', label: 'School Admin' },
  { value: 'ADMISSION_OFFICER', label: 'Admission Officer' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'SUPPORT_STAFF', label: 'Support Staff' },
];

export const AUDIENCE_TYPE_OPTIONS = Object.entries(NOTICE_AUDIENCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const NOTICE_CATEGORY_OPTIONS = Object.entries(NOTICE_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const NOTICE_PRIORITY_OPTIONS = Object.entries(NOTICE_PRIORITY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function getAudienceSummary(audience = {}) {
  const type = audience.type || NOTICE_AUDIENCE_TYPE.ALL_USERS;
  const base = NOTICE_AUDIENCE_LABELS[type] || type;
  if (type === NOTICE_AUDIENCE_TYPE.SELECTED_CLASSES && audience.classIds?.length) {
    const parts = [`${audience.classIds.length} class(es)`];
    if (audience.includeParents) parts.push('parents');
    if (audience.includeTeachers) parts.push('teachers');
    return `${base}: ${parts.join(', ')}`;
  }
  if (type === NOTICE_AUDIENCE_TYPE.SELECTED_ROLES && audience.roles?.length) {
    return `${base}: ${audience.roles.join(', ')}`;
  }
  if (type === NOTICE_AUDIENCE_TYPE.MANUAL_USERS && audience.userIds?.length) {
    return `${base}: ${audience.userIds.length} user(s)`;
  }
  if (type === NOTICE_AUDIENCE_TYPE.CUSTOM_GROUP && audience.groupIds?.length) {
    return `${base}: ${audience.groupIds.length} group(s)`;
  }
  return base;
}

export function emptyAudience(type = NOTICE_AUDIENCE_TYPE.ALL_PARENTS) {
  return {
    type,
    roles: [],
    classIds: [],
    sectionIds: [],
    teacherIds: [],
    parentIds: [],
    studentIds: [],
    groupIds: [],
    userIds: [],
    includeParents: true,
    includeTeachers: false,
  };
}

export function emptyNoticeForm() {
  return {
    title: '',
    body: '',
    category: NOTICE_CATEGORY.GENERAL,
    priority: NOTICE_PRIORITY.NORMAL,
    status: NOTICE_STATUS.DRAFT,
    audience: emptyAudience(),
    publishAt: '',
    expiresAt: '',
    isPinned: false,
    requiresAcknowledgement: false,
    sendPush: true,
    sendEmail: false,
    sendSms: false,
    coverImageUrl: '',
    attachments: [],
  };
}
