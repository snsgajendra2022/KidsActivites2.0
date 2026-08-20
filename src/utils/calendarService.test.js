import { describe, expect, it } from 'vitest';
import { normalizeCalendarEvent } from '../services/calendarService.js';
import { meaningfulCalendarChange, eventIsVisibleToUser } from './calendarAudience.js';
import { CALENDAR_AUDIENCE_TYPE, CALENDAR_EVENT_STATUS } from '../constants/calendar.js';

describe('normalizeCalendarEvent', () => {
  it('fills operational defaults and date keys', () => {
    const event = normalizeCalendarEvent({
      title: 'PTM',
      eventType: 'ptm',
      start_date: '2026-09-01',
      end_date: '2026-09-01',
    });
    expect(event.eventCategory).toBe('ptm');
    expect(event.startDate).toBe('2026-09-01');
    expect(event.endDate).toBe('2026-09-01');
    expect(event.operations.schoolStatus).toBe('open');
    expect(event.audience.type).toBe(CALENDAR_AUDIENCE_TYPE.EVERYONE);
  });
});

describe('meaningful calendar change', () => {
  it('ignores metadata-only edits', () => {
    const previous = { startDate: '2026-09-01', title: 'PTM', operations: { schoolStatus: 'open' }, audience: { type: 'everyone' } };
    const next = { ...previous, displayColor: '#000' };
    expect(meaningfulCalendarChange(previous, next)).toBe(false);
  });

  it('detects timing and transport changes', () => {
    const previous = { startDate: '2026-09-01', title: 'Half day', operations: { busDepartureTime: '15:30' } };
    const next = { startDate: '2026-09-01', title: 'Half day', operations: { busDepartureTime: '12:40' } };
    expect(meaningfulCalendarChange(previous, next)).toBe(true);
  });
});

describe('route-specific visibility', () => {
  it('hides a route change from drivers on other routes', () => {
    const event = {
      status: CALENDAR_EVENT_STATUS.PUBLISHED,
      audience: { type: CALENDAR_AUDIENCE_TYPE.ROUTES, routeIds: ['route-7'] },
    };
    expect(eventIsVisibleToUser(event, { role: 'driver', routeIds: ['route-7'] })).toBe(true);
    expect(eventIsVisibleToUser(event, { role: 'driver', routeIds: ['route-2'] })).toBe(false);
  });
});
