const DRAFT_KEY = 'schoolbridge_printable_enrollment_form_draft';

export function saveHtmlFormDraft(data) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function loadHtmlFormDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data || null;
  } catch {
    return null;
  }
}

export function clearHtmlFormDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}
