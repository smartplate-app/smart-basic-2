// Simple localStorage cache with timestamp, namespaced by current user email
function getUserKey(key) {
  try {
    const cached = localStorage.getItem('b44_user_cache');
    if (cached) {
      const user = JSON.parse(cached);
      const email = user?.email || 'anon';
      return `${key}__${email}`;
    }
  } catch (_) {}
  return key;
}

export function getCache(key) {
  try {
    const raw = localStorage.getItem(getUserKey(key));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export function setCache(key, data) {
  try {
    localStorage.setItem(getUserKey(key), JSON.stringify({ ts: Date.now(), data }));
  } catch (_) {}
}

export function isStale(entry, maxAgeMs = 180000) { // default 3 minutes
  if (!entry || !entry.ts) return true;
  return (Date.now() - entry.ts) > maxAgeMs;
}