export function cloneBlock(block) {
  return {
    ...JSON.parse(JSON.stringify(block)),
    id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  };
}

export function moveBlock(blocks, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return blocks;
  if (fromIndex >= blocks.length || toIndex >= blocks.length) return blocks;
  const next = [...blocks];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function removeBlockAt(blocks, index) {
  return blocks.filter((_, i) => i !== index);
}

export function updateBlockAt(blocks, index, patch) {
  return blocks.map((b, i) => (i === index ? { ...b, ...patch } : b));
}

export function updateBlockContent(blocks, blockId, contentPatch) {
  return blocks.map((b) => (
    b.id === blockId
      ? { ...b, content: { ...b.content, ...contentPatch } }
      : b
  ));
}

export function updateBlockStyle(blocks, blockId, stylePatch) {
  return blocks.map((b) => (
    b.id === blockId
      ? { ...b, style: { ...b.style, ...stylePatch } }
      : b
  ));
}

export const PREVIEW_STORAGE_KEY = (schoolId) => `ka_landing_preview_${schoolId}`;

function writeStorage(storage, key, page) {
  try {
    storage.setItem(key, JSON.stringify(page));
  } catch {
    // quota / private mode
  }
}

function readStorage(storage, key) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Stash draft for Preview tab — uses both session + local storage under all known keys. */
export function stashPreviewDraft(schoolId, page, extraKeys = []) {
  if (!page) return;
  const keys = [schoolId, ...extraKeys].filter(Boolean);
  const unique = [...new Set(keys.map(String))];
  for (const id of unique) {
    const key = PREVIEW_STORAGE_KEY(id);
    writeStorage(sessionStorage, key, page);
    writeStorage(localStorage, key, page);
  }
}

export function readPreviewDraft(schoolId) {
  if (!schoolId) return null;
  const key = PREVIEW_STORAGE_KEY(schoolId);
  return readStorage(sessionStorage, key) || readStorage(localStorage, key);
}

/** Try several keys (school id, slug, etc.) and return the first valid v2 draft. */
export function readPreviewDraftFromKeys(keys = []) {
  for (const id of keys) {
    const page = readPreviewDraft(id);
    if (page?.version === 2 && page?.blocks?.length) return page;
  }
  return null;
}

