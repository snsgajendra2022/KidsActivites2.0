import { INITIAL_CALENDAR_EVENTS } from '../data/mockCalendarEvents.js';
import {
  CALENDAR_EVENT_STATUS,
  emptyCalendarAudience,
  emptyCalendarEvent,
  emptyCalendarNotifications,
  emptyCalendarOperations,
  getCalendarEventType,
} from '../constants/calendar.js';
import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';
import { asCrudList } from './schoolModules/createCrudService.js';
import { expandRecurringEvent, detectCalendarConflicts } from '../utils/calendarRecurrence.js';
import { buildRoleMessage, eventIsVisibleToUser, meaningfulCalendarChange } from '../utils/calendarAudience.js';
import { rangesOverlap, toDateKey } from '../utils/calendarDates.js';
import { pushCalendarNotification } from './notificationService.js';
import usersSeed from '../data/users.json';

const STORE_KEY = 'sb_calendar_events';
const ACK_KEY = 'sb_calendar_acks';
const AUDIT_KEY = 'sb_calendar_audit';

function makeId() {
  return `cal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeCalendarEvent(raw = {}) {
  const type = getCalendarEventType(raw.eventType || raw.type || 'custom');
  const startDate = toDateKey(raw.startDate || raw.start_date || raw.date);
  const endDate = toDateKey(raw.endDate || raw.end_date || startDate);
  return emptyCalendarEvent({
    ...raw,
    id: String(raw.id || ''),
    title: raw.title || '',
    description: raw.description || '',
    eventType: type.value,
    eventCategory: raw.eventCategory || raw.category || type.category,
    startDate,
    endDate: endDate || startDate,
    startTime: raw.startTime || raw.start_time || '',
    endTime: raw.endTime || raw.end_time || '',
    timezone: raw.timezone || 'Asia/Kolkata',
    isAllDay: raw.isAllDay !== false && !raw.startTime,
    location: raw.location || '',
    meetingUrl: raw.meetingUrl || raw.meeting_url || '',
    displayColor: raw.displayColor || raw.color || type.color,
    priority: String(raw.priority || 'normal').toLowerCase(),
    recurrence: raw.recurrence || 'none',
    recurrenceWeekdays: Array.isArray(raw.recurrenceWeekdays) ? raw.recurrenceWeekdays : [],
    recurrenceUntil: toDateKey(raw.recurrenceUntil || raw.recurrence_end_date) || '',
    parentEventId: raw.parentEventId || raw.parent_event_id || null,
    excludedDates: Array.isArray(raw.excludedDates) ? raw.excludedDates : [],
    status: String(raw.status || CALENDAR_EVENT_STATUS.DRAFT).toLowerCase(),
    publishAt: raw.publishAt || '',
    publishedAt: raw.publishedAt || '',
    academicYear: raw.academicYear || raw.academic_year || '',
    audience: { ...emptyCalendarAudience(), ...(raw.audience || {}) },
    operations: { ...emptyCalendarOperations(), ...(raw.operations || {}) },
    notifications: { ...emptyCalendarNotifications(), ...(raw.notifications || {}) },
    acknowledgement: raw.acknowledgement || { required: Boolean(raw.notifications?.requireAck), count: 0, pending: 0 },
    source: raw.source || 'EVENT',
    sourceId: raw.sourceId || raw.source_id || null,
    createdBy: raw.createdBy || raw.created_by || '',
    updatedBy: raw.updatedBy || raw.updated_by || '',
    createdAt: raw.createdAt || '',
    updatedAt: raw.updatedAt || '',
    deletedAt: raw.deletedAt || null,
  });
}

function readEvents() {
  return getStore(STORE_KEY, INITIAL_CALENDAR_EVENTS).map(normalizeCalendarEvent);
}

function writeEvents(items) {
  setStore(STORE_KEY, items);
}

function readAcks() {
  return getStore(ACK_KEY, []);
}

function writeAcks(items) {
  setStore(ACK_KEY, items);
}

function appendAudit(entry) {
  const rows = getStore(AUDIT_KEY, []);
  rows.unshift({
    id: makeId(),
    at: new Date().toISOString(),
    ...entry,
  });
  setStore(AUDIT_KEY, rows.slice(0, 400));
}

function dispatchEventNotifications(event, kind = 'published') {
  if (event.priority !== 'emergency' && event.notifications?.inApp === false) return;
  const users = usersSeed?.users || [];
  users.forEach((user) => {
    if (!eventIsVisibleToUser(event, { role: user.role, userId: user.id })) return;
    if (user.role === 'super_admin') return;
    pushCalendarNotification({
      userId: user.id,
      eventId: event.id,
      title: event.title,
      message: buildRoleMessage(event, user.role),
      kind,
      priority: event.priority,
    });
  });
}

function validateEvent(payload) {
  const errors = [];
  if (!String(payload.title || '').trim()) errors.push('Title is required.');
  if (!payload.startDate) errors.push('Start date is required.');
  if (payload.endDate && payload.startDate && payload.endDate < payload.startDate) {
    errors.push('End date must be on or after the start date.');
  }
  if (payload.startTime && payload.endTime && payload.endTime < payload.startTime && payload.startDate === payload.endDate) {
    errors.push('End time must be after start time.');
  }
  if (errors.length) {
    const error = new Error(errors.join(' '));
    error.status = 400;
    throw error;
  }
}

async function tryApi(fn) {
  try {
    return await fn();
  } catch (err) {
    const status = Number(err?.status || 0);
    if (status === 404 || status === 405 || status === 501) return null;
    throw err;
  }
}

export const calendarService = {
  async list(filters = {}) {
    return routeRequest({
      mockFn: async () => {
        await delay(80);
        return readEvents().filter((item) => {
          if (item.deletedAt && !filters.includeDeleted) return false;
          if (filters.status && item.status !== filters.status) return false;
          if (filters.eventType && item.eventType !== filters.eventType) return false;
          if (filters.category && item.eventCategory !== filters.category) return false;
          if (filters.priority && item.priority !== filters.priority) return false;
          if (filters.academicYear && item.academicYear !== filters.academicYear) return false;
          if (filters.q) {
            const hay = `${item.title} ${item.description} ${item.location}`.toLowerCase();
            if (!hay.includes(String(filters.q).toLowerCase())) return false;
          }
          if (filters.from || filters.to) {
            const from = filters.from || '0000-01-01';
            const to = filters.to || '9999-12-31';
            if (!rangesOverlap(item.startDate, item.endDate || item.startDate, from, to)
              && item.recurrence === 'none') return false;
          }
          return true;
        });
      },
      apiFn: async () => {
        const data = await tryApi(() => api.get('/calendar/events', filters));
        if (data == null) {
          const fallback = await tryApi(() => api.get('/admin/calendar-events', filters));
          if (fallback == null) {
            return readEvents().filter((item) => !item.deletedAt);
          }
          return asCrudList(fallback).map(normalizeCalendarEvent);
        }
        return asCrudList(data).map(normalizeCalendarEvent);
      },
    });
  },

  async get(id) {
    return routeRequest({
      mockFn: async () => {
        await delay(60);
        return readEvents().find((item) => String(item.id) === String(id)) || null;
      },
      apiFn: async () => {
        const data = await tryApi(() => api.get(`/calendar/events/${id}`));
        if (data == null) return readEvents().find((item) => String(item.id) === String(id)) || null;
        return normalizeCalendarEvent(data);
      },
    });
  },

  async create(payload, actor = {}) {
    const body = normalizeCalendarEvent({
      ...payload,
      id: payload.id || makeId(),
      status: payload.status || CALENDAR_EVENT_STATUS.DRAFT,
      createdBy: actor.userId || payload.createdBy || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    validateEvent(body);
    return routeRequest({
      mockFn: async () => {
        await delay(80);
        const items = readEvents();
        items.unshift(body);
        writeEvents(items);
        appendAudit({ action: 'created', eventId: body.id, actorId: actor.userId, title: body.title });
        return body;
      },
      apiFn: async () => {
        const data = await tryApi(() => api.post('/calendar/events', body));
        if (data == null) {
          const items = readEvents();
          items.unshift(body);
          writeEvents(items);
          return body;
        }
        return normalizeCalendarEvent(data);
      },
    });
  },

  async update(id, payload, actor = {}) {
    return routeRequest({
      mockFn: async () => {
        await delay(80);
        const items = readEvents();
        const index = items.findIndex((item) => String(item.id) === String(id));
        if (index < 0) throw new Error('Event not found.');
        const previous = items[index];
        const next = normalizeCalendarEvent({
          ...previous,
          ...payload,
          id,
          updatedBy: actor.userId || payload.updatedBy || previous.updatedBy,
          updatedAt: new Date().toISOString(),
        });
        validateEvent(next);
        items[index] = next;
        writeEvents(items);
        appendAudit({ action: 'updated', eventId: id, actorId: actor.userId, title: next.title });
        if (previous.status === CALENDAR_EVENT_STATUS.PUBLISHED && meaningfulCalendarChange(previous, next)) {
          dispatchEventNotifications(next, 'updated');
        }
        return next;
      },
      apiFn: async () => {
        const data = await tryApi(() => api.patch(`/calendar/events/${id}`, payload));
        if (data == null) {
          const items = readEvents();
          const index = items.findIndex((item) => String(item.id) === String(id));
          if (index < 0) {
            const created = normalizeCalendarEvent({ ...payload, id, updatedAt: new Date().toISOString() });
            items.unshift(created);
            writeEvents(items);
            return created;
          }
          const next = normalizeCalendarEvent({
            ...items[index],
            ...payload,
            id,
            updatedAt: new Date().toISOString(),
          });
          items[index] = next;
          writeEvents(items);
          return next;
        }
        return normalizeCalendarEvent(data);
      },
    });
  },

  async publish(id, actor = {}) {
    const current = await calendarService.get(id);
    if (!current) throw new Error('Event not found.');
    return calendarService.update(id, {
      status: CALENDAR_EVENT_STATUS.PUBLISHED,
      publishedAt: new Date().toISOString(),
    }, actor).then((event) => {
      appendAudit({ action: 'published', eventId: id, actorId: actor.userId, title: event.title });
      dispatchEventNotifications(event, 'published');
      return event;
    });
  },

  async cancel(id, actor = {}) {
    return calendarService.update(id, { status: CALENDAR_EVENT_STATUS.CANCELLED }, actor).then((event) => {
      appendAudit({ action: 'cancelled', eventId: id, actorId: actor.userId, title: event.title });
      dispatchEventNotifications(event, 'cancelled');
      return event;
    });
  },

  async remove(id, actor = {}) {
    return routeRequest({
      mockFn: async () => {
        await delay(60);
        const items = readEvents().map((item) => (
          String(item.id) === String(id)
            ? { ...item, deletedAt: new Date().toISOString(), status: CALENDAR_EVENT_STATUS.ARCHIVED }
            : item
        ));
        writeEvents(items);
        appendAudit({ action: 'deleted', eventId: id, actorId: actor.userId });
        return { ok: true };
      },
      apiFn: async () => {
        const data = await tryApi(() => api.delete(`/calendar/events/${id}`));
        if (data == null) {
          const items = readEvents().map((item) => (
            String(item.id) === String(id)
              ? { ...item, deletedAt: new Date().toISOString(), status: CALENDAR_EVENT_STATUS.ARCHIVED }
              : item
          ));
          writeEvents(items);
          return { ok: true };
        }
        return data;
      },
    });
  },

  async duplicate(id, actor = {}) {
    const current = await calendarService.get(id);
    if (!current) throw new Error('Event not found.');
    return calendarService.create({
      ...current,
      id: makeId(),
      title: `${current.title} (copy)`,
      status: CALENDAR_EVENT_STATUS.DRAFT,
      publishedAt: '',
      acknowledgement: { required: current.notifications?.requireAck, count: 0, pending: 0 },
    }, actor);
  },

  async copyHolidays({ fromYear, toYear, actor = {} }) {
    const items = await calendarService.list({ academicYear: fromYear });
    const holidays = items.filter((item) => item.eventCategory === 'holiday' || item.eventCategory === 'vacation');
    const created = [];
    for (const holiday of holidays) {
      const next = await calendarService.create({
        ...holiday,
        id: makeId(),
        academicYear: toYear,
        status: CALENDAR_EVENT_STATUS.DRAFT,
        publishedAt: '',
        title: holiday.title,
        description: `${holiday.description || ''}\nCopied from ${fromYear}. Confirm the date before publishing.`.trim(),
      }, actor);
      created.push(next);
    }
    return created;
  },

  async acknowledge(eventId, userId) {
    const rows = readAcks();
    if (rows.some((row) => row.eventId === eventId && row.userId === userId)) return { ok: true, duplicate: true };
    rows.push({ eventId, userId, acknowledgedAt: new Date().toISOString() });
    writeAcks(rows);
    return routeRequest({
      mockFn: async () => ({ ok: true }),
      apiFn: async () => {
        const data = await tryApi(() => api.post(`/calendar/events/${eventId}/acknowledge`, { userId }));
        return data || { ok: true };
      },
    });
  },

  async analytics(filters = {}) {
    const items = await calendarService.list(filters);
    const published = items.filter((item) => item.status === CALENDAR_EVENT_STATUS.PUBLISHED);
    return {
      total: items.length,
      published: published.length,
      holidays: published.filter((item) => item.eventCategory === 'holiday' || item.eventCategory === 'vacation').length,
      emergencies: published.filter((item) => item.eventCategory === 'emergency').length,
      transportChanges: published.filter((item) => item.operations?.transportStatus && item.operations.transportStatus !== 'normal').length,
      pendingAcknowledgements: published.reduce((sum, item) => sum + Number(item.acknowledgement?.pending || 0), 0),
    };
  },

  async auditLog(eventId) {
    const rows = getStore(AUDIT_KEY, []);
    return eventId ? rows.filter((row) => String(row.eventId) === String(eventId)) : rows;
  },

  expand(events, from, to) {
    return (events || []).flatMap((event) => expandRecurringEvent(event, from, to));
  },

  conflicts(event, others) {
    return detectCalendarConflicts(event, others);
  },

  visible(events, context) {
    return (events || []).filter((event) => eventIsVisibleToUser(event, context));
  },
};
