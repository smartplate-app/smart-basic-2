// Simple localStorage cache with timestamp
export function getCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) {}
}

export function isStale(entry, maxAgeMs = 180000) { // default 3 minutes
  if (!entry || !entry.ts) return true;
  return (Date.now() - entry.ts) > maxAgeMs;
}