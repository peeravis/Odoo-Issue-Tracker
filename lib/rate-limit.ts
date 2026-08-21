// NOTE: In-process store — resets on restart and does not share state across worker processes.
// For multi-process deployments, replace with a Redis-backed store.
const store = new Map<string, { count: number; resetAt: number }>();

// Purge expired entries on every N calls to bound memory growth
let callCount = 0;
const PURGE_EVERY = 500;

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; remaining: number } {
  if (++callCount % PURGE_EVERY === 0) purgeExpiredRateLimits();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Clean up expired entry before resetting
    if (entry) store.delete(key);
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxAttempts - entry.count };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}

// Purge all expired entries — call periodically if needed
export function purgeExpiredRateLimits() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}
