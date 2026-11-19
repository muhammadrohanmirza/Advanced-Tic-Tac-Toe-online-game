interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStores = new Map<string, Map<string, RateLimitRecord>>();

/**
 * Checks whether an action for a given key exceeds the maximum count within windowMs.
 * Returns { success: boolean, limit: number, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  namespace: string,
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; limit: number; remaining: number; resetTime: number } {
  let store = rateLimitStores.get(namespace);
  if (!store) {
    store = new Map<string, RateLimitRecord>();
    rateLimitStores.set(namespace, store);
  }

  const now = Date.now();
  const record = store.get(key);

  // Periodic cleanup if map grows large
  if (store.size > 5000) {
    store.forEach((rec, k) => {
      if (now > rec.resetTime) {
        store?.delete(k);
      }
    });
  }

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    store.set(key, newRecord);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetTime: newRecord.resetTime,
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    resetTime: record.resetTime,
  };
}

