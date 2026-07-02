const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

function getStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStore(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    if (err?.name === 'QuotaExceededError') {
      console.warn(`[mockApi] localStorage quota exceeded for key "${key}"`);
      return false;
    }
    throw err;
  }
}

function removeStore(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export { delay, getStore, setStore, removeStore };

export function generateApplicationNo() {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `GVIS-${year}-${num}`;
}
