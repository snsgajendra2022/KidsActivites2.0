export const CREATIVE_CARDS_STORAGE_KEYS = Object.freeze({
  cards: 'kidsCreativeCards',
  drafts: 'kidsCreativeDrafts',
  favorites: 'kidsCreativeFavorites',
  statistics: 'kidsCreativeStatistics',
});

const memoryStorage = new Map();
const DEFAULT_STATISTICS = Object.freeze({
  cardsCreated: 0,
  cardsUpdated: 0,
  cardsDeleted: 0,
  cardsDuplicated: 0,
  cardsShared: 0,
  draftsSaved: 0,
  stickersUsed: 0,
  templatesUsed: 0,
  categoriesUsed: 0,
  favoritesAdded: 0,
  lastActivityAt: null,
});

function cloneJSON(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function getNativeStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Privacy settings can make localStorage inaccessible.
  }
  return null;
}

export function safeParseJSON(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return cloneJSON(fallback);
  }

  try {
    return JSON.parse(value);
  } catch {
    return cloneJSON(fallback);
  }
}

function readRaw(key) {
  const nativeStorage = getNativeStorage();

  if (nativeStorage) {
    try {
      const value = nativeStorage.getItem(key);
      if (value !== null) {
        memoryStorage.set(key, value);
        return value;
      }
    } catch {
      // Fall through to the in-memory copy.
    }
  }

  return memoryStorage.get(key) ?? null;
}

function writeRaw(key, value) {
  memoryStorage.set(key, value);
  const nativeStorage = getNativeStorage();

  if (nativeStorage) {
    try {
      nativeStorage.setItem(key, value);
    } catch {
      // The in-memory copy keeps the service usable when storage is full or blocked.
    }
  }
}

function removeRaw(key) {
  memoryStorage.delete(key);
  const nativeStorage = getNativeStorage();

  if (nativeStorage) {
    try {
      nativeStorage.removeItem(key);
    } catch {
      // The in-memory copy has still been cleared.
    }
  }
}

function readArray(key) {
  const parsed = safeParseJSON(readRaw(key), []);
  return Array.isArray(parsed) ? parsed : [];
}

function writeJSON(key, value) {
  let serialized;

  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new TypeError('Creative card data must be JSON serializable.');
  }

  writeRaw(key, serialized);
  return cloneJSON(value);
}

function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function requireId(id, label = 'ID') {
  if (typeof id !== 'string' || id.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return id.trim();
}

function nowISO() {
  return new Date().toISOString();
}

export function generateCreativeId(prefix = 'card', existingIds = []) {
  const safePrefix = String(prefix || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
  const usedIds = new Set(existingIds);
  const base = `${safePrefix}-${Date.now().toString(36)}`;
  let id = base;
  let sequence = 1;

  while (usedIds.has(id)) {
    id = `${base}-${sequence}`;
    sequence += 1;
  }

  return id;
}

function incrementStoredStatistic(metric, amount = 1) {
  const statistics = getCreativeStatistics();
  const current = Number(statistics[metric]);
  const increment = Number(amount);

  statistics[metric] = (Number.isFinite(current) ? current : 0)
    + (Number.isFinite(increment) ? increment : 0);
  statistics.lastActivityAt = nowISO();
  return writeJSON(CREATIVE_CARDS_STORAGE_KEYS.statistics, statistics);
}

export function getCreativeCards() {
  return cloneJSON(readArray(CREATIVE_CARDS_STORAGE_KEYS.cards));
}

export function getCreativeCardById(cardId) {
  const id = requireId(cardId, 'Card ID');
  const card = readArray(CREATIVE_CARDS_STORAGE_KEYS.cards).find((item) => item?.id === id);
  return card ? cloneJSON(card) : null;
}

export function createCreativeCard(cardData) {
  requireRecord(cardData, 'Card');
  const cards = readArray(CREATIVE_CARDS_STORAGE_KEYS.cards);
  const timestamp = nowISO();
  const card = {
    ...cloneJSON(cardData),
    id: generateCreativeId('card', cards.map((item) => item?.id)),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  cards.unshift(card);
  writeJSON(CREATIVE_CARDS_STORAGE_KEYS.cards, cards);
  incrementStoredStatistic('cardsCreated');
  return cloneJSON(card);
}

export function updateCreativeCard(cardId, updates) {
  const id = requireId(cardId, 'Card ID');
  requireRecord(updates, 'Card updates');
  const cards = readArray(CREATIVE_CARDS_STORAGE_KEYS.cards);
  const index = cards.findIndex((item) => item?.id === id);

  if (index === -1) return null;

  cards[index] = {
    ...cards[index],
    ...cloneJSON(updates),
    id,
    createdAt: cards[index].createdAt,
    updatedAt: nowISO(),
  };
  writeJSON(CREATIVE_CARDS_STORAGE_KEYS.cards, cards);
  incrementStoredStatistic('cardsUpdated');
  return cloneJSON(cards[index]);
}

export function deleteCreativeCard(cardId) {
  const id = requireId(cardId, 'Card ID');
  const cards = readArray(CREATIVE_CARDS_STORAGE_KEYS.cards);
  const remainingCards = cards.filter((item) => item?.id !== id);

  if (remainingCards.length === cards.length) return false;

  writeJSON(CREATIVE_CARDS_STORAGE_KEYS.cards, remainingCards);
  removeCreativeFavorite(id, 'card');
  incrementStoredStatistic('cardsDeleted');
  return true;
}

export function duplicateCreativeCard(cardId, overrides = {}) {
  const id = requireId(cardId, 'Card ID');
  requireRecord(overrides, 'Card overrides');
  const cards = readArray(CREATIVE_CARDS_STORAGE_KEYS.cards);
  const source = cards.find((item) => item?.id === id);

  if (!source) return null;

  const timestamp = nowISO();
  const copy = {
    ...cloneJSON(source),
    ...cloneJSON(overrides),
    id: generateCreativeId('card', cards.map((item) => item?.id)),
    name: overrides.name ?? `${source.name || source.title || 'Untitled Card'} (Copy)`,
    createdAt: timestamp,
    updatedAt: timestamp,
    duplicatedFrom: id,
  };

  cards.unshift(copy);
  writeJSON(CREATIVE_CARDS_STORAGE_KEYS.cards, cards);
  incrementStoredStatistic('cardsCreated');
  incrementStoredStatistic('cardsDuplicated');
  return cloneJSON(copy);
}

export function getCreativeDrafts() {
  return cloneJSON(readArray(CREATIVE_CARDS_STORAGE_KEYS.drafts));
}

export function getCreativeDraftById(draftId) {
  const id = requireId(draftId, 'Draft ID');
  const draft = readArray(CREATIVE_CARDS_STORAGE_KEYS.drafts).find((item) => item?.id === id);
  return draft ? cloneJSON(draft) : null;
}

export function createCreativeDraft(draftData) {
  requireRecord(draftData, 'Draft');
  const drafts = readArray(CREATIVE_CARDS_STORAGE_KEYS.drafts);
  const timestamp = nowISO();
  const draft = {
    ...cloneJSON(draftData),
    id: generateCreativeId('draft', drafts.map((item) => item?.id)),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  drafts.unshift(draft);
  writeJSON(CREATIVE_CARDS_STORAGE_KEYS.drafts, drafts);
  incrementStoredStatistic('draftsSaved');
  return cloneJSON(draft);
}

export function updateCreativeDraft(draftId, updates) {
  const id = requireId(draftId, 'Draft ID');
  requireRecord(updates, 'Draft updates');
  const drafts = readArray(CREATIVE_CARDS_STORAGE_KEYS.drafts);
  const index = drafts.findIndex((item) => item?.id === id);

  if (index === -1) return null;

  drafts[index] = {
    ...drafts[index],
    ...cloneJSON(updates),
    id,
    createdAt: drafts[index].createdAt,
    updatedAt: nowISO(),
  };
  writeJSON(CREATIVE_CARDS_STORAGE_KEYS.drafts, drafts);
  incrementStoredStatistic('draftsSaved');
  return cloneJSON(drafts[index]);
}

export function saveCreativeDraft(draftData) {
  requireRecord(draftData, 'Draft');
  return draftData.id
    ? updateCreativeDraft(requireId(draftData.id, 'Draft ID'), draftData)
    : createCreativeDraft(draftData);
}

export function deleteCreativeDraft(draftId) {
  const id = requireId(draftId, 'Draft ID');
  const drafts = readArray(CREATIVE_CARDS_STORAGE_KEYS.drafts);
  const remainingDrafts = drafts.filter((item) => item?.id !== id);

  if (remainingDrafts.length === drafts.length) return false;

  writeJSON(CREATIVE_CARDS_STORAGE_KEYS.drafts, remainingDrafts);
  return true;
}

export function getCreativeFavorites() {
  return cloneJSON(readArray(CREATIVE_CARDS_STORAGE_KEYS.favorites));
}

export function isCreativeFavorite(targetId, targetType = 'card') {
  const id = requireId(targetId, 'Favorite target ID');
  const type = requireId(targetType, 'Favorite target type');
  return readArray(CREATIVE_CARDS_STORAGE_KEYS.favorites)
    .some((favorite) => favorite?.targetId === id && favorite?.targetType === type);
}

export function addCreativeFavorite(targetId, targetType = 'card') {
  const id = requireId(targetId, 'Favorite target ID');
  const type = requireId(targetType, 'Favorite target type');
  const favorites = readArray(CREATIVE_CARDS_STORAGE_KEYS.favorites);
  const existing = favorites.find(
    (favorite) => favorite?.targetId === id && favorite?.targetType === type,
  );

  if (existing) return cloneJSON(existing);

  const favorite = {
    id: generateCreativeId('favorite', favorites.map((item) => item?.id)),
    targetId: id,
    targetType: type,
    createdAt: nowISO(),
  };
  favorites.unshift(favorite);
  writeJSON(CREATIVE_CARDS_STORAGE_KEYS.favorites, favorites);
  incrementStoredStatistic('favoritesAdded');
  return cloneJSON(favorite);
}

export function removeCreativeFavorite(targetId, targetType = 'card') {
  const id = requireId(targetId, 'Favorite target ID');
  const type = requireId(targetType, 'Favorite target type');
  const favorites = readArray(CREATIVE_CARDS_STORAGE_KEYS.favorites);
  const remainingFavorites = favorites.filter(
    (favorite) => favorite?.targetId !== id || favorite?.targetType !== type,
  );

  if (remainingFavorites.length === favorites.length) return false;

  writeJSON(CREATIVE_CARDS_STORAGE_KEYS.favorites, remainingFavorites);
  return true;
}

export function toggleCreativeFavorite(targetId, targetType = 'card') {
  if (isCreativeFavorite(targetId, targetType)) {
    removeCreativeFavorite(targetId, targetType);
    return { isFavorite: false, favorite: null };
  }

  const favorite = addCreativeFavorite(targetId, targetType);
  return { isFavorite: true, favorite };
}

export function getCreativeStatistics() {
  const parsed = safeParseJSON(readRaw(CREATIVE_CARDS_STORAGE_KEYS.statistics), {});
  const saved = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  return { ...DEFAULT_STATISTICS, ...saved };
}

export function updateCreativeStatistics(updates) {
  requireRecord(updates, 'Statistics updates');
  const statistics = {
    ...getCreativeStatistics(),
    ...cloneJSON(updates),
    lastActivityAt: updates.lastActivityAt ?? nowISO(),
  };
  return writeJSON(CREATIVE_CARDS_STORAGE_KEYS.statistics, statistics);
}

export function incrementCreativeStatistic(metric, amount = 1) {
  const name = requireId(metric, 'Statistic name');
  return incrementStoredStatistic(name, amount);
}

export function resetCreativeStatistics() {
  const statistics = cloneJSON(DEFAULT_STATISTICS);
  writeJSON(CREATIVE_CARDS_STORAGE_KEYS.statistics, statistics);
  return statistics;
}

export function clearCreativeCardsStorage() {
  Object.values(CREATIVE_CARDS_STORAGE_KEYS).forEach(removeRaw);
}
