const STORAGE_PREFIX = 'lms-flash-review:';

export function flashCardsFromLesson(lesson) {
  const content = String(lesson?.content || '').trim();
  if (!content) return [];
  const lines = content.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const cards = [];
  lines.forEach((line) => {
    const match = line.match(/^(?:Q:\s*)?(.+?)\s*(?:—|--|–|:)\s*(?:A:\s*)?(.+)$/);
    if (match && match[1] && match[2] && match[1].length < 180 && match[2].length < 280) {
      cards.push({ id: `${lesson.id}-${cards.length}`, front: match[1].trim(), back: match[2].trim() });
    }
  });
  return cards;
}

export function practiceItemsFromQuiz(quiz) {
  return (quiz?.questions || []).map((q, index) => ({
    id: q.id || `practice-${index}`,
    prompt: q.question || q.prompt || `Question ${index + 1}`,
    options: (q.options || []).map((o) => ({
      id: o.id,
      text: o.text || o.label || 'Option',
    })),
  }));
}

function storageKey(lessonId) {
  return `${STORAGE_PREFIX}${lessonId}`;
}

export function loadMarkedForReview(lessonId) {
  if (!lessonId || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(lessonId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function saveMarkedForReview(lessonId, ids) {
  if (!lessonId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey(lessonId), JSON.stringify([...new Set(ids.map(String))]));
  } catch {
    // ignore quota / private mode
  }
}

export function toggleMarkedForReview(lessonId, cardId) {
  const current = loadMarkedForReview(lessonId);
  const id = String(cardId);
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  saveMarkedForReview(lessonId, next);
  return next;
}
