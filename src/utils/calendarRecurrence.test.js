import { describe, expect, it } from 'vitest';
import { expandRecurringEvent, detectCalendarConflicts } from './calendarRecurrence.js';
import { eventIsVisibleToUser, appliesToChild } from './calendarAudience.js';
import { addDays, eachDateInRange, formatDateLabel, rangesOverlap } from './calendarDates.js';
import { CALENDAR_AUDIENCE_TYPE, CALENDAR_EVENT_STATUS } from '../constants/calendar.js';

describe('calendar recurrence', () => {
  it('expands weekly monday assembly inside a month', () => {
    const event = {
      id: 'assembly',
      startDate: '2026-08-03',
      endDate: '2026-08-03',
      recurrence: 'weekly',
      recurrenceWeekdays: [1],
      recurrenceUntil: '2026-08-31',
    };
    const items = expandRecurringEvent(event, '2026-08-01', '2026-08-31');
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(items.every((item) => item.occurrenceDate >= '2026-08-01')).toBe(true);
  });

  it('respects excluded dates', () => {
    const event = {
      id: 'daily',
      startDate: '2026-08-10',
      endDate: '2026-08-10',
      recurrence: 'daily',
      excludedDates: ['2026-08-11'],
    };
    const items = expandRecurringEvent(event, '2026-08-10', '2026-08-12');
    expect(items.map((item) => item.occurrenceDate)).toEqual(['2026-08-10', '2026-08-12']);
  });
});

describe('calendar audience', () => {
  it('hides drafts from parents', () => {
    const event = { status: CALENDAR_EVENT_STATUS.DRAFT, audience: { type: CALENDAR_AUDIENCE_TYPE.EVERYONE } };
    expect(eventIsVisibleToUser(event, { role: 'parent' })).toBe(false);
    expect(eventIsVisibleToUser(event, { role: 'school_admin', canManage: true })).toBe(true);
  });

  it('scopes class events to the matching child', () => {
    const event = {
      status: CALENDAR_EVENT_STATUS.PUBLISHED,
      audience: { type: CALENDAR_AUDIENCE_TYPE.CLASSES, classIds: ['cls-3a'] },
    };
    expect(appliesToChild(event, { classId: 'cls-3a', studentId: 'stu-1' })).toBe(true);
    expect(appliesToChild(event, { classId: 'cls-6b', studentId: 'stu-2' })).toBe(false);
  });
});

describe('calendar dates', () => {
  it('walks inclusive ranges', () => {
    expect(eachDateInRange('2026-08-19', '2026-08-21')).toEqual([
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
    ]);
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(rangesOverlap('2026-08-01', '2026-08-10', '2026-08-10', '2026-08-12')).toBe(true);
  });

  it('formats labels without a boolean year option', () => {
    const withYear = formatDateLabel('2026-11-08', { weekday: 'short' });
    const withoutYear = formatDateLabel('2026-11-08', { weekday: 'short', year: false });
    expect(withYear).toContain('2026');
    expect(withoutYear).not.toContain('2026');
    expect(withoutYear.length).toBeGreaterThan(0);
  });
});

describe('calendar conflicts', () => {
  it('warns when an exam lands on a school closure', () => {
    const exam = {
      id: 'e1',
      eventCategory: 'exam',
      startDate: '2026-11-08',
      endDate: '2026-11-08',
      operations: { schoolStatus: 'open' },
    };
    const holiday = {
      id: 'h1',
      eventCategory: 'holiday',
      startDate: '2026-11-08',
      endDate: '2026-11-08',
      operations: { schoolStatus: 'closed' },
      status: 'published',
    };
    expect(detectCalendarConflicts(exam, [holiday])).toHaveLength(1);
  });
});
