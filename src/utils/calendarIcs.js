import { formatTimeLabel } from './calendarDates.js';

function icsEscape(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function compactDate(key) {
  return String(key || '').replace(/-/g, '');
}

function compactDateTime(key, time, timeZone) {
  if (!time) return compactDate(key);
  const stamp = String(time).replace(':', '');
  return `${compactDate(key)}T${stamp.padEnd(6, '0')}`;
}

export function eventToIcs(event, { timeZone = 'Asia/Kolkata' } = {}) {
  const uid = `${event.occurrenceId || event.id}@kidsactivities`;
  const start = event.occurrenceDate || event.startDate;
  const end = event.occurrenceEndDate || event.endDate || start;
  const allDay = event.isAllDay !== false;
  const dtStart = allDay
    ? `DTSTART;VALUE=DATE:${compactDate(start)}`
    : `DTSTART;TZID=${timeZone}:${compactDateTime(start, event.startTime, timeZone)}`;
  const dtEnd = allDay
    ? `DTEND;VALUE=DATE:${compactDate(end)}`
    : `DTEND;TZID=${timeZone}:${compactDateTime(end, event.endTime || event.startTime, timeZone)}`;
  const description = [
    event.description,
    event.operations?.schoolStatus ? `School: ${event.operations.schoolStatus}` : '',
    event.operations?.transportStatus ? `Transport: ${event.operations.transportStatus}` : '',
  ].filter(Boolean).join('\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kids Activities//School Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    dtStart,
    dtEnd,
    `SUMMARY:${icsEscape(event.title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    event.location ? `LOCATION:${icsEscape(event.location)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export function downloadIcs(event) {
  const body = eventToIcs(event);
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${String(event.title || 'event').replace(/\s+/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function googleCalendarUrl(event) {
  const start = event.occurrenceDate || event.startDate;
  const end = event.occurrenceEndDate || event.endDate || start;
  const dates = event.isAllDay !== false
    ? `${start.replace(/-/g, '')}/${end.replace(/-/g, '')}`
    : `${start.replace(/-/g, '')}T${String(event.startTime || '0900').replace(':', '')}00/${end.replace(/-/g, '')}T${String(event.endTime || event.startTime || '1000').replace(':', '')}00`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'School event',
    dates,
    details: event.description || '',
    location: event.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function eventTimeLabel(event) {
  if (event.isAllDay !== false) return 'All day';
  if (event.startTime && event.endTime) {
    return `${formatTimeLabel(event.startTime)} – ${formatTimeLabel(event.endTime)}`;
  }
  return formatTimeLabel(event.startTime) || 'Timed';
}
