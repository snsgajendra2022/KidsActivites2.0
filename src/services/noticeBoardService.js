import usersData from '../data/users.json';
import {
  INITIAL_NOTICE_GROUPS,
  INITIAL_NOTICE_RECIPIENTS,
  INITIAL_NOTICES,
} from '../data/mockNotices.js';
import {
  NOTICE_AUDIENCE_TYPE,
  NOTICE_STATUS,
  STAFF_ROLES,
  getAudienceSummary,
} from '../constants/notices.js';
import { delay, getStore, setStore } from './mockApi.js';
import { api, ApiError } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { pushNoticeNotification } from './notificationService.js';

const NOTICES_KEY = 'sb_notices';
const RECIPIENTS_KEY = 'sb_notice_recipients';
const GROUPS_KEY = 'sb_notice_groups';
const AUDIT_KEY = 'sb_notice_audit';

const MOCK_CLASSES = [
  { id: 'cls-1', name: 'Toddler Group', sections: ['A'] },
  { id: 'cls-2', name: 'Nursery', sections: ['A', 'B'] },
  { id: 'cls-7de133ff', name: 'PTP', sections: ['A'] },
];

const ROLE_MAP = {
  PARENT: 'parent',
  TEACHER: 'teacher',
  SCHOOL_ADMIN: 'school_admin',
  ADMISSION_OFFICER: 'admission_officer',
  ACCOUNTANT: 'accountant',
  SUPPORT_STAFF: 'support_staff',
  SUPER_ADMIN: 'super_admin',
};

function readNoticesStore() {
  return getStore(NOTICES_KEY, INITIAL_NOTICES);
}

function saveNotices(notices) {
  setStore(NOTICES_KEY, notices);
}

function getRecipients() {
  return getStore(RECIPIENTS_KEY, INITIAL_NOTICE_RECIPIENTS);
}

function saveRecipients(recipients) {
  setStore(RECIPIENTS_KEY, recipients);
}

function getGroups() {
  return getStore(GROUPS_KEY, INITIAL_NOTICE_GROUPS);
}

function appendAudit(noticeId, action, performedBy, oldValue = null, newValue = null) {
  const logs = getStore(AUDIT_KEY, []);
  logs.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    noticeId,
    action,
    oldValue,
    newValue,
    performedBy,
    performedAt: new Date().toISOString(),
  });
  setStore(AUDIT_KEY, logs.slice(0, 500));
}

function getActiveUsers(schoolId = 'school-1') {
  return usersData.users.filter((u) => !u.schoolId || u.schoolId === schoolId);
}

function toRecipientRow(user, extra = {}) {
  return {
    userId: user.id,
    name: user.name,
    role: (user.role || '').toUpperCase(),
    email: user.email,
    mobile: user.mobile,
    studentName: extra.studentName || null,
    className: extra.className || null,
    sectionName: extra.sectionName || null,
  };
}

function roleBucket(role) {
  const r = (role || '').toLowerCase();
  if (r === 'parent' || r === 'student') return 'parents';
  if (r === 'teacher') return 'teachers';
  if (STAFF_ROLES.includes(r)) return 'staff';
  return 'other';
}

function buildBreakdown(recipients) {
  const breakdown = { parents: 0, teachers: 0, staff: 0, students: 0, other: 0 };
  recipients.forEach((r) => {
    const bucket = roleBucket(r.role);
    breakdown[bucket] = (breakdown[bucket] || 0) + 1;
  });
  return breakdown;
}

export function resolveAudiencePreview(audience, schoolId = 'school-1') {
  const users = getActiveUsers(schoolId);
  const map = new Map();
  const type = audience?.type || NOTICE_AUDIENCE_TYPE.ALL_USERS;

  const addUser = (user, extra = {}) => {
    if (!user?.id) return;
    map.set(user.id, toRecipientRow(user, extra));
  };

  if (type === NOTICE_AUDIENCE_TYPE.ALL_USERS) {
    users.forEach((u) => addUser(u));
  } else if (type === NOTICE_AUDIENCE_TYPE.ALL_PARENTS) {
    users.filter((u) => u.role === 'parent').forEach((u) => addUser(u));
  } else if (type === NOTICE_AUDIENCE_TYPE.ALL_TEACHERS) {
    users.filter((u) => u.role === 'teacher').forEach((u) => addUser(u));
  } else if (type === NOTICE_AUDIENCE_TYPE.ALL_STAFF) {
    users.filter((u) => STAFF_ROLES.includes(u.role)).forEach((u) => addUser(u));
  } else if (type === NOTICE_AUDIENCE_TYPE.SELECTED_ROLES) {
    const roles = (audience.roles || []).map((r) => ROLE_MAP[r] || r.toLowerCase());
    users.filter((u) => roles.includes(u.role)).forEach((u) => addUser(u));
  } else if (type === NOTICE_AUDIENCE_TYPE.SELECTED_TEACHERS) {
    users.filter((u) => audience.teacherIds?.includes(u.id)).forEach((u) => addUser(u));
  } else if (type === NOTICE_AUDIENCE_TYPE.SELECTED_PARENTS) {
    users.filter((u) => audience.parentIds?.includes(u.id)).forEach((u) => addUser(u));
  } else if (type === NOTICE_AUDIENCE_TYPE.MANUAL_USERS) {
    users.filter((u) => audience.userIds?.includes(u.id)).forEach((u) => addUser(u));
  } else if (type === NOTICE_AUDIENCE_TYPE.CUSTOM_GROUP) {
    const groups = getGroups().filter((g) => audience.groupIds?.includes(g.id));
    const memberIds = new Set(groups.flatMap((g) => g.memberIds || []));
    users.filter((u) => memberIds.has(u.id)).forEach((u) => addUser(u));
  } else if (type === NOTICE_AUDIENCE_TYPE.SELECTED_CLASSES) {
    if (audience.includeParents) {
      users.filter((u) => u.role === 'parent').forEach((u) => addUser(u, { className: 'Linked class' }));
    }
    if (audience.includeTeachers) {
      users.filter((u) => u.role === 'teacher').forEach((u) => addUser(u, { className: 'Assigned class' }));
    }
  } else if (type === NOTICE_AUDIENCE_TYPE.SELECTED_SECTIONS) {
    users.filter((u) => ['parent', 'teacher'].includes(u.role)).forEach((u) => addUser(u, { sectionName: 'A' }));
  } else if (type === NOTICE_AUDIENCE_TYPE.SELECTED_STUDENTS) {
    users.filter((u) => u.role === 'parent').forEach((u) => addUser(u, { studentName: 'Student' }));
  }

  const recipients = Array.from(map.values());
  return {
    total: recipients.length,
    breakdown: buildBreakdown(recipients),
    recipients,
  };
}

function normalizeNotice(notice) {
  if (!notice) return null;
  const audience = notice.audience || { type: notice.audienceType };
  return {
    ...notice,
    audience,
    audienceType: audience.type || notice.audienceType,
    audienceSummary: notice.audienceSummary || getAudienceSummary(audience),
  };
}

function filterNotices(notices, filters = {}) {
  let rows = [...notices];
  if (filters.status) rows = rows.filter((n) => n.status === filters.status);
  if (filters.category) rows = rows.filter((n) => n.category === filters.category);
  if (filters.priority) rows = rows.filter((n) => n.priority === filters.priority);
  if (filters.audienceType) rows = rows.filter((n) => n.audienceType === filters.audienceType);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter((n) => n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q));
  }
  rows.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  return rows;
}

function syncNoticeCounts(noticeId) {
  const recipients = getRecipients().filter((r) => r.noticeId === noticeId);
  const readCount = recipients.filter((r) => r.readAt).length;
  const acknowledgementCount = recipients.filter((r) => r.acknowledgedAt).length;
  const notices = readNoticesStore();
  const idx = notices.findIndex((n) => n.id === noticeId);
  if (idx >= 0) {
    notices[idx] = {
      ...notices[idx],
      recipientCount: recipients.length,
      readCount,
      acknowledgementCount,
    };
    saveNotices(notices);
  }
}

async function mockPublishNotice(noticeId, actor) {
  const notices = readNoticesStore();
  const idx = notices.findIndex((n) => n.id === noticeId);
  if (idx < 0) throw new ApiError('Notice not found', 404);
  const notice = notices[idx];
  if (![NOTICE_STATUS.DRAFT, NOTICE_STATUS.SCHEDULED].includes(notice.status)) {
    throw new ApiError('Only draft or scheduled notices can be published', 409);
  }

  const preview = resolveAudiencePreview(notice.audience, notice.tenantId);
  if (preview.total === 0) {
    throw new ApiError('No recipients found for the selected audience', 422, 'NO_RECIPIENTS');
  }

  const now = new Date().toISOString();
  const recipients = getRecipients().filter((r) => r.noticeId !== noticeId);
  preview.recipients.forEach((r, i) => {
    recipients.push({
      id: `nr-${noticeId}-${i}`,
      noticeId,
      userId: r.userId,
      role: r.role?.toLowerCase(),
      readAt: null,
      acknowledgedAt: null,
      deliveredAt: now,
    });
    if (notice.sendPush) {
      pushNoticeNotification({
        userId: r.userId,
        noticeId,
        title: notice.title,
      });
    }
  });
  saveRecipients(recipients);

  notices[idx] = {
    ...notice,
    status: NOTICE_STATUS.PUBLISHED,
    publishedAt: now,
    publishAt: notice.publishAt || now,
    recipientCount: preview.total,
    readCount: 0,
    acknowledgementCount: 0,
    updatedAt: now,
  };
  saveNotices(notices);
  appendAudit(noticeId, 'PUBLISHED', actor?.id, null, { recipientCount: preview.total });
  return { notice: normalizeNotice(notices[idx]), recipientCount: preview.total };
}

export async function getNotices(filters = {}) {
  return routeRequest({
    mockFn: async () => {
      await delay(200);
      const items = filterNotices(readNoticesStore(), filters);
      return { items: items.map(normalizeNotice), total: items.length, page: 1, size: items.length };
    },
    apiFn: async () => api.get('/notices', filters),
  });
}

export async function getNoticeById(noticeId) {
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      const notice = readNoticesStore().find((n) => n.id === noticeId);
      return normalizeNotice(notice) || null;
    },
    apiFn: () => api.get(`/notices/${noticeId}`),
  });
}

export async function createNotice(payload, actor) {
  return routeRequest({
    mockFn: async () => {
      await delay(300);
      const now = new Date().toISOString();
      const audience = payload.audience || { type: NOTICE_AUDIENCE_TYPE.ALL_PARENTS };
      const entry = normalizeNotice({
        id: `notice-${Date.now()}`,
        tenantId: actor?.schoolId || 'school-1',
        ...payload,
        audience,
        audienceType: audience.type,
        audienceSummary: getAudienceSummary(audience),
        status: payload.status || NOTICE_STATUS.DRAFT,
        recipientCount: 0,
        readCount: 0,
        acknowledgementCount: 0,
        createdBy: actor?.id,
        createdByName: actor?.name,
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
      });
      const notices = readNoticesStore();
      notices.unshift(entry);
      saveNotices(notices);
      appendAudit(entry.id, 'CREATED', actor?.id, null, entry);
      if (entry.status === NOTICE_STATUS.PUBLISHED) {
        return mockPublishNotice(entry.id, actor).then((r) => r.notice);
      }
      return entry;
    },
    apiFn: () => api.post('/notices', payload),
  });
}

export async function updateNotice(noticeId, payload, actor) {
  return routeRequest({
    mockFn: async () => {
      await delay(250);
      const notices = readNoticesStore();
      const idx = notices.findIndex((n) => n.id === noticeId);
      if (idx < 0) throw new ApiError('Notice not found', 404);
      if (![NOTICE_STATUS.DRAFT, NOTICE_STATUS.SCHEDULED].includes(notices[idx].status)) {
        throw new ApiError('Published notices cannot be edited', 409);
      }
      const audience = payload.audience || notices[idx].audience;
      notices[idx] = normalizeNotice({
        ...notices[idx],
        ...payload,
        audience,
        audienceType: audience.type,
        audienceSummary: getAudienceSummary(audience),
        updatedAt: new Date().toISOString(),
        updatedBy: actor?.id,
      });
      saveNotices(notices);
      appendAudit(noticeId, 'UPDATED', actor?.id);
      return notices[idx];
    },
    apiFn: () => api.put(`/notices/${noticeId}`, payload),
  });
}

export async function deleteNotice(noticeId, actor) {
  return routeRequest({
    mockFn: async () => {
      await delay(200);
      const notices = readNoticesStore();
      const notice = notices.find((n) => n.id === noticeId);
      if (!notice) throw new ApiError('Notice not found', 404);
      if (notice.status !== NOTICE_STATUS.DRAFT) {
        throw new ApiError('Only draft notices can be deleted', 409);
      }
      saveNotices(notices.filter((n) => n.id !== noticeId));
      saveRecipients(getRecipients().filter((r) => r.noticeId !== noticeId));
      appendAudit(noticeId, 'DELETED', actor?.id);
    },
    apiFn: () => api.delete(`/notices/${noticeId}`),
  });
}

export async function publishNotice(noticeId, actor) {
  return routeRequest({
    mockFn: () => mockPublishNotice(noticeId, actor).then((r) => r.notice),
    apiFn: () => api.post(`/notices/${noticeId}/publish`),
  });
}

export async function archiveNotice(noticeId, actor) {
  return routeRequest({
    mockFn: async () => {
      await delay(200);
      const notices = readNoticesStore();
      const idx = notices.findIndex((n) => n.id === noticeId);
      if (idx < 0) throw new ApiError('Notice not found', 404);
      notices[idx] = { ...notices[idx], status: NOTICE_STATUS.ARCHIVED, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      saveNotices(notices);
      appendAudit(noticeId, 'ARCHIVED', actor?.id);
      return normalizeNotice(notices[idx]);
    },
    apiFn: () => api.post(`/notices/${noticeId}/archive`),
  });
}

export async function duplicateNotice(noticeId, actor) {
  return routeRequest({
    mockFn: async () => {
      const source = readNoticesStore().find((n) => n.id === noticeId);
      if (!source) throw new ApiError('Notice not found', 404);
      return createNotice({
        ...source,
        title: `${source.title} (Copy)`,
        status: NOTICE_STATUS.DRAFT,
        publishedAt: null,
        publishAt: null,
        recipientCount: 0,
        readCount: 0,
        acknowledgementCount: 0,
      }, actor);
    },
    apiFn: () => api.post(`/notices/${noticeId}/duplicate`),
  });
}

export async function previewNoticeAudience(audience, schoolId) {
  return routeRequest({
    mockFn: async () => {
      await delay(250);
      return resolveAudiencePreview(audience, schoolId);
    },
    apiFn: () => api.post('/notices/audience/preview', { audience }),
  });
}

export async function getNoticeAudienceOptions(schoolId = 'school-1') {
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      const users = getActiveUsers(schoolId);
      return {
        roles: ['PARENT', 'TEACHER', 'SCHOOL_ADMIN', 'ADMISSION_OFFICER', 'ACCOUNTANT', 'SUPPORT_STAFF'],
        classes: MOCK_CLASSES,
        groups: getGroups().map(({ id, name, memberCount }) => ({ id, name, memberCount })),
        users: users.map((u) => ({ id: u.id, name: u.name, role: u.role, email: u.email, mobile: u.mobile })),
        teachers: users.filter((u) => u.role === 'teacher').map((u) => ({ id: u.id, name: u.name })),
        parents: users.filter((u) => u.role === 'parent').map((u) => ({ id: u.id, name: u.name })),
        counts: {
          allUsers: users.length,
          allParents: users.filter((u) => u.role === 'parent').length,
          allTeachers: users.filter((u) => u.role === 'teacher').length,
          allStaff: users.filter((u) => STAFF_ROLES.includes(u.role)).length,
        },
      };
    },
    apiFn: () => api.get('/notices/audience/options'),
  });
}

export async function getNoticeAnalytics(noticeId) {
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      const recipients = getRecipients().filter((r) => r.noticeId === noticeId);
      const readCount = recipients.filter((r) => r.readAt).length;
      const acknowledgementCount = recipients.filter((r) => r.acknowledgedAt).length;
      const users = getActiveUsers();
      const breakdown = { parents: { total: 0, read: 0, acknowledged: 0 }, teachers: { total: 0, read: 0, acknowledged: 0 }, staff: { total: 0, read: 0, acknowledged: 0 } };
      recipients.forEach((r) => {
        const user = users.find((u) => u.id === r.userId);
        const bucket = roleBucket(user?.role || r.role);
        if (!breakdown[bucket]) return;
        breakdown[bucket].total += 1;
        if (r.readAt) breakdown[bucket].read += 1;
        if (r.acknowledgedAt) breakdown[bucket].acknowledged += 1;
      });
      return {
        recipientCount: recipients.length,
        readCount,
        unreadCount: recipients.length - readCount,
        acknowledgementCount,
        pendingAcknowledgementCount: recipients.length - acknowledgementCount,
        breakdown,
      };
    },
    apiFn: () => api.get(`/notices/${noticeId}/analytics`),
  });
}

export async function getNoticeRecipients(noticeId, filters = {}) {
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      const users = getActiveUsers();
      let rows = getRecipients().filter((r) => r.noticeId === noticeId).map((r) => {
        const user = users.find((u) => u.id === r.userId);
        return { ...r, name: user?.name, email: user?.email, role: user?.role || r.role };
      });
      if (filters.read === 'true') rows = rows.filter((r) => r.readAt);
      if (filters.read === 'false') rows = rows.filter((r) => !r.readAt);
      return { items: rows, total: rows.length };
    },
    apiFn: () => api.get(`/notices/${noticeId}/recipients`, filters),
  });
}

export async function getMyNotices(userId, filters = {}) {
  return routeRequest({
    mockFn: async () => {
      await delay(200);
      const recipientRows = getRecipients().filter((r) => r.userId === userId);
      const noticeIds = new Set(recipientRows.map((r) => r.noticeId));
      let notices = readNoticesStore()
        .filter((n) => noticeIds.has(n.id) && n.status === NOTICE_STATUS.PUBLISHED)
        .map((n) => {
          const rec = recipientRows.find((r) => r.noticeId === n.id);
          return {
            ...normalizeNotice(n),
            readAt: rec?.readAt || null,
            acknowledgedAt: rec?.acknowledgedAt || null,
            isUnread: !rec?.readAt,
          };
        });
      if (filters.unreadOnly === 'true' || filters.unreadOnly === true) {
        notices = notices.filter((n) => !n.readAt);
      }
      if (filters.category) notices = notices.filter((n) => n.category === filters.category);
      if (filters.priority) notices = notices.filter((n) => n.priority === filters.priority);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        notices = notices.filter((n) => n.title?.toLowerCase().includes(q));
      }
      notices.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1;
        if (b.priority === 'URGENT' && a.priority !== 'URGENT') return 1;
        return new Date(b.publishedAt) - new Date(a.publishedAt);
      });
      return { items: notices, total: notices.length, unreadCount: notices.filter((n) => !n.readAt).length };
    },
    apiFn: () => api.get('/notices/my', filters),
  });
}

export async function getMyNoticeById(userId, noticeId) {
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      const rec = getRecipients().find((r) => r.noticeId === noticeId && r.userId === userId);
      if (!rec) throw new ApiError('Notice not found', 404);
      const notice = readNoticesStore().find((n) => n.id === noticeId);
      if (!notice) throw new ApiError('Notice not found', 404);
      return {
        ...normalizeNotice(notice),
        readAt: rec.readAt,
        acknowledgedAt: rec.acknowledgedAt,
      };
    },
    apiFn: () => api.get(`/notices/my/${noticeId}`),
  });
}

export async function markNoticeRead(userId, noticeId) {
  return routeRequest({
    mockFn: async () => {
      const recipients = getRecipients();
      const idx = recipients.findIndex((r) => r.noticeId === noticeId && r.userId === userId);
      if (idx < 0) throw new ApiError('Notice not found', 404);
      if (!recipients[idx].readAt) {
        recipients[idx] = { ...recipients[idx], readAt: new Date().toISOString() };
        saveRecipients(recipients);
        syncNoticeCounts(noticeId);
      }
    },
    apiFn: () => api.post(`/notices/my/${noticeId}/read`),
  });
}

export async function acknowledgeNotice(userId, noticeId) {
  return routeRequest({
    mockFn: async () => {
      const notice = readNoticesStore().find((n) => n.id === noticeId);
      if (!notice?.requiresAcknowledgement) {
        throw new ApiError('Acknowledgement not required', 400);
      }
      const recipients = getRecipients();
      const idx = recipients.findIndex((r) => r.noticeId === noticeId && r.userId === userId);
      if (idx < 0) throw new ApiError('Notice not found', 404);
      const now = new Date().toISOString();
      recipients[idx] = {
        ...recipients[idx],
        readAt: recipients[idx].readAt || now,
        acknowledgedAt: recipients[idx].acknowledgedAt || now,
      };
      saveRecipients(recipients);
      syncNoticeCounts(noticeId);
    },
    apiFn: () => api.post(`/notices/my/${noticeId}/acknowledge`),
  });
}
