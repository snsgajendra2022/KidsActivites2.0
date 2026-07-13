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

export function stashPreviewDraft(schoolId, page) {
  try {
    sessionStorage.setItem(PREVIEW_STORAGE_KEY(schoolId), JSON.stringify(page));
  } catch {
    // quota
  }
}

export function readPreviewDraft(schoolId) {
  try {
    const raw = sessionStorage.getItem(PREVIEW_STORAGE_KEY(schoolId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
