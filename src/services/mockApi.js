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
  localStorage.setItem(key, JSON.stringify(data));
}

export { delay, getStore, setStore };

export function generateApplicationNo() {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `GVIS-${year}-${num}`;
}
