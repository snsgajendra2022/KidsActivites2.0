/**
 * Ignore stale GPS updates so the map never rewinds.
 * Prefer numeric `sequence`; fall back to `updatedAt` / `recordedAt` timestamps.
 */

function asRecord(value) {
  return value && typeof value === 'object' ? value : {};
}

export function readLocationSequence(payload) {
  const raw = asRecord(payload);
  const seq = Number(raw.sequence ?? raw.seq);
  if (Number.isFinite(seq)) return seq;
  return null;
}

export function readLocationTimestamp(payload) {
  const raw = asRecord(payload);
  const value = raw.updatedAt || raw.updated_at || raw.recordedAt || raw.recorded_at
    || raw.timestamp || raw.ts;
  if (!value) return null;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

/**
 * @returns {boolean} true when `incoming` should replace `current`
 */
export function isNewerLocation(current, incoming) {
  if (!incoming) return false;
  if (!current) return true;

  const currentSeq = readLocationSequence(current);
  const incomingSeq = readLocationSequence(incoming);
  if (currentSeq != null && incomingSeq != null) {
    return incomingSeq > currentSeq;
  }

  const currentTs = readLocationTimestamp(current);
  const incomingTs = readLocationTimestamp(incoming);
  if (currentTs != null && incomingTs != null) {
    return incomingTs >= currentTs;
  }

  // Missing ordering metadata — accept update (backend should send sequence).
  return true;
}

/** Merge location fields onto a live snapshot only when newer. */
export function mergeIfNewerLocation(current, incomingPatch) {
  if (!isNewerLocation(current, incomingPatch)) return current;
  return {
    ...current,
    ...incomingPatch,
  };
}
