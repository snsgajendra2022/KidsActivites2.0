import { CALENDAR_RECURRENCE } from '../constants/calendar.js';
import { addDays, eachDateInRange, parseDateKey, weekdayIndex } from './calendarDates.js';

function isNthWeekday(key, nth, weekday) {
  const date = parseDateKey(key);
  if (!date || date.getDay() !== weekday) return false;
  if (nth === -1) {
    const next = new Date(date);
    next.setDate(date.getDate() + 7);
    return next.getMonth() !== date.getMonth();
  }
  return Math.ceil(date.getDate() / 7) === nth;
}

export function expandRecurringEvent(event, rangeStart, rangeEnd) {
  if (!event?.startDate) return [];
  const excluded = new Set((event.excludedDates || []).map(String));
  const until = event.recurrenceUntil && event.recurrenceUntil < rangeEnd
    ? event.recurrenceUntil
    : rangeEnd;
  const span = Math.max(0, eachDateInRange(event.startDate, event.endDate || event.startDate).length - 1);
  const rule = event.recurrence || CALENDAR_RECURRENCE.NONE;

  const occurrences = [];
  const pushIf = (startKey) => {
    if (!startKey || startKey < rangeStart || startKey > until) return;
    if (excluded.has(startKey)) return;
    const endKey = addDays(startKey, span);
    occurrences.push({
      ...event,
      occurrenceDate: startKey,
      occurrenceEndDate: endKey,
      occurrenceId: `${event.id}:${startKey}`,
    });
  };

  if (!rule || rule === CALENDAR_RECURRENCE.NONE) {
    if (rangesTouch(event.startDate, event.endDate || event.startDate, rangeStart, rangeEnd) && !excluded.has(event.startDate)) {
      occurrences.push({
        ...event,
        occurrenceDate: event.startDate,
        occurrenceEndDate: event.endDate || event.startDate,
        occurrenceId: event.id,
      });
    }
    return occurrences;
  }

  let cursor = event.startDate;
  let guard = 0;
  while (cursor <= until && guard < 800) {
    guard += 1;
    const weekday = weekdayIndex(cursor);
    let match = false;
    if (rule === CALENDAR_RECURRENCE.DAILY) match = true;
    else if (rule === CALENDAR_RECURRENCE.WEEKDAYS) match = weekday >= 1 && weekday <= 5;
    else if (rule === CALENDAR_RECURRENCE.WEEKLY) {
      const days = event.recurrenceWeekdays?.length ? event.recurrenceWeekdays : [weekdayIndex(event.startDate)];
      match = days.map(Number).includes(weekday);
    } else if (rule === CALENDAR_RECURRENCE.MONTHLY) {
      const nth = Number(event.recurrenceNth || 0);
      if (nth) match = isNthWeekday(cursor, nth, weekdayIndex(event.startDate));
      else match = parseDateKey(cursor)?.getDate() === parseDateKey(event.startDate)?.getDate();
    } else if (rule === CALENDAR_RECURRENCE.YEARLY) {
      const origin = parseDateKey(event.startDate);
      const current = parseDateKey(cursor);
      match = origin && current
        && origin.getDate() === current.getDate()
        && origin.getMonth() === current.getMonth();
    } else if (rule === CALENDAR_RECURRENCE.CUSTOM) {
      const days = event.recurrenceWeekdays || [];
      match = days.map(Number).includes(weekday);
    }
    if (match) pushIf(cursor);
    cursor = addDays(cursor, 1);
    if (cursor < rangeStart) continue;
  }
  return occurrences;
}

function rangesTouch(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && aEnd >= bStart;
}

export function detectCalendarConflicts(event, others) {
  const start = event.startDate;
  const end = event.endDate || event.startDate;
  if (!start) return [];
  const closed = ['closed', 'half_day'].includes(event.operations?.schoolStatus);
  return (others || []).filter((other) => {
    if (!other || other.id === event.id || other.status === 'cancelled') return false;
    const overlap = rangesTouch(start, end, other.startDate, other.endDate || other.startDate);
    if (!overlap) return false;
    const otherClosed = other.operations?.schoolStatus === 'closed';
    const examOnHoliday = event.eventCategory === 'exam' && (otherClosed || other.eventCategory === 'holiday');
    const holidayOnExam = event.eventCategory === 'holiday' && other.eventCategory === 'exam';
    const ptmOnClosure = event.eventType === 'ptm' && otherClosed;
    const transportOnClosure = event.eventCategory === 'transport'
      && event.operations?.transportStatus === 'normal'
      && other.operations?.transportStatus === 'cancelled';
    return examOnHoliday || holidayOnExam || ptmOnClosure || transportOnClosure || (closed && other.eventCategory === 'exam');
  });
}
