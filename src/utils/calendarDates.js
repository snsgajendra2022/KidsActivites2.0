const pad = (n) => String(n).padStart(2, '0');

export function toDateKey(value, timeZone = 'Asia/Kolkata') {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  } catch {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}

export function parseDateKey(key) {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, amount) {
  const date = parseDateKey(key);
  if (!date) return '';
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function startOfWeek(key, weekStartsOn = 1) {
  const date = parseDateKey(key);
  if (!date) return key;
  const day = date.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  date.setDate(date.getDate() - diff);
  return toDateKey(date);
}

export function endOfWeek(key, weekStartsOn = 1) {
  return addDays(startOfWeek(key, weekStartsOn), 6);
}

export function startOfMonth(key) {
  const date = parseDateKey(key);
  if (!date) return key;
  date.setDate(1);
  return toDateKey(date);
}

export function endOfMonth(key) {
  const date = parseDateKey(key);
  if (!date) return key;
  date.setMonth(date.getMonth() + 1, 0);
  return toDateKey(date);
}

export function monthGrid(key, weekStartsOn = 1) {
  const start = startOfWeek(startOfMonth(key), weekStartsOn);
  const end = endOfWeek(endOfMonth(key), weekStartsOn);
  const days = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function eachDateInRange(startKey, endKey) {
  if (!startKey) return [];
  const last = endKey && endKey >= startKey ? endKey : startKey;
  const days = [];
  let cursor = startKey;
  while (cursor <= last) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    if (days.length > 400) break;
  }
  return days;
}

export function formatDateLabel(key, options = {}) {
  const date = parseDateKey(key);
  if (!date) return '';
  const formatOptions = {
    weekday: options.weekday || 'short',
    day: options.day || 'numeric',
    month: options.month || 'short',
  };
  if (options.year !== false) {
    formatOptions.year = options.year || 'numeric';
  }
  return date.toLocaleDateString('en-IN', formatOptions);
}

export function formatTimeLabel(value) {
  if (!value) return '';
  const [h, m] = String(value).split(':').map(Number);
  if (!Number.isFinite(h)) return value;
  const date = new Date();
  date.setHours(h, m || 0, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function todayKey(timeZone = 'Asia/Kolkata') {
  return toDateKey(new Date(), timeZone);
}

export function daysUntil(key, fromKey = todayKey()) {
  const a = parseDateKey(fromKey);
  const b = parseDateKey(key);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function weekdayIndex(key) {
  const date = parseDateKey(key);
  return date ? date.getDay() : 0;
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const as = aStart;
  const ae = aEnd || aStart;
  const bs = bStart;
  const be = bEnd || bStart;
  return as <= be && ae >= bs;
}

export function nextWeekdayOnOrAfter(key, weekday) {
  const date = parseDateKey(key);
  if (!date) return key;
  const diff = (weekday - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + diff);
  return toDateKey(date);
}
