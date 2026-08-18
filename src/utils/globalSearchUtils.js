/** @typedef {'page' | 'student' | 'application' | 'fee' | 'teacher' | 'driver' | 'vehicle' | 'route' | 'class' | 'homework' | 'exam' | 'notice' | 'course' | 'user'} GlobalSearchKind */

/**
 * @typedef {Object} GlobalSearchResult
 * @property {string} id
 * @property {GlobalSearchKind} kind
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} path
 * @property {number} [score]
 */

export const GLOBAL_SEARCH_CATEGORY_LABELS = {
  page: 'Pages',
  student: 'Students',
  application: 'Applications',
  fee: 'Fees',
  teacher: 'Teachers',
  driver: 'Drivers',
  vehicle: 'Vehicles',
  route: 'Routes',
  class: 'Classes',
  homework: 'Homework',
  exam: 'Exams',
  notice: 'Notices',
  course: 'Courses',
  user: 'Users',
};

const CATEGORY_ORDER = [
  'page',
  'student',
  'application',
  'fee',
  'teacher',
  'driver',
  'vehicle',
  'route',
  'class',
  'homework',
  'exam',
  'notice',
  'course',
  'user',
];

export function normalizeSearchQuery(query) {
  return String(query || '').trim().toLowerCase();
}

export function textMatchesQuery(values, query) {
  const q = normalizeSearchQuery(query);
  if (!q) return true;
  const haystack = values
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .join(' ');
  return haystack.includes(q);
}

export function scoreMatch(values, query) {
  const q = normalizeSearchQuery(query);
  if (!q) return 0;
  const joined = values.filter(Boolean).map((value) => String(value).toLowerCase()).join(' ');
  if (joined === q) return 100;
  if (joined.startsWith(q)) return 80;
  if (values.some((value) => String(value || '').toLowerCase().startsWith(q))) return 60;
  if (joined.includes(q)) return 40;
  return 0;
}

/** @param {GlobalSearchResult[]} results */
export function dedupeSearchResults(results) {
  const seen = new Set();
  return results.filter((item) => {
    const key = `${item.kind}:${item.id}:${item.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** @param {GlobalSearchResult[]} results */
export function groupSearchResults(results, { limitPerGroup = 6 } = {}) {
  const grouped = new Map();
  results.forEach((item) => {
    if (!grouped.has(item.kind)) grouped.set(item.kind, []);
    const bucket = grouped.get(item.kind);
    if (bucket.length < limitPerGroup) bucket.push(item);
  });

  return CATEGORY_ORDER
    .filter((kind) => grouped.has(kind))
    .map((kind) => ({
      kind,
      label: GLOBAL_SEARCH_CATEGORY_LABELS[kind] || kind,
      items: grouped.get(kind),
    }));
}

/** @param {import('../constants/navigation.js').NAV_BY_ROLE} navItems */
export function searchNavItems(navItems, query, { limit = 8 } = {}) {
  const q = normalizeSearchQuery(query);
  const items = (navItems || []).map((item) => {
    const score = q
      ? scoreMatch([item.label, item.section, item.to], q)
      : 10;
    return {
      id: item.id,
      kind: /** @type {GlobalSearchKind} */ ('page'),
      title: item.label,
      subtitle: item.section || 'Navigation',
      path: item.to,
      score,
    };
  }).filter((item) => (q ? item.score > 0 : true));

  return dedupeSearchResults(
    items.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)),
  ).slice(0, limit);
}

export function buildEmptyStateMessage(query, hasNav) {
  const q = normalizeSearchQuery(query);
  if (!q) {
    return hasNav
      ? 'Type to search pages, students, applications, fees, and more.'
      : 'Type to search your school portal.';
  }
  return `No results for “${query.trim()}”. Try another name, number, or page title.`;
}
