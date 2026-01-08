export const offlineQueue = {
  _key(name) {
    return `offlineQueue_${name}`;
  },
  _get(name) {
    try {
      return JSON.parse(localStorage.getItem(this._key(name)) || '[]');
    } catch (e) {
      return [];
    }
  },
  _set(name, q) {
    try {
      localStorage.setItem(this._key(name), JSON.stringify(q));
    } catch (e) {
      // ignore
    }
  },
  enqueue(name, item) {
    const q = this._get(name);
    q.push({ ...item, enqueuedAt: Date.now() });
    this._set(name, q);
  },
  async flush(name, processor) {
    if (!navigator.onLine) return false;
    const original = this._get(name);
    const remaining = [];
    for (let i = 0; i < original.length; i++) {
      const item = original[i];
      try {
        // Processor must throw on failure; on success we drop the item
        // eslint-disable-next-line no-await-in-loop
        await processor(item);
      } catch (e) {
        // If offline again, keep remaining and stop
        if (!navigator.onLine) {
          remaining.push(...original.slice(i));
          break;
        }
        // Keep this item for another attempt, continue with others
        remaining.push(item);
      }
    }
    this._set(name, remaining);
    return remaining.length === 0;
  },
  onOnline(name, processor) {
    const handler = () => {
      this.flush(name, processor);
    };
    window.addEventListener('online', handler);
    // Try immediate flush
    setTimeout(handler, 0);
    return () => window.removeEventListener('online', handler);
  }
};