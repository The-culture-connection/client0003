/**
 * In-memory cache with TTL for Curriculum and Dashboard to reduce load times
 * and reuse data when navigating between pages.
 */

const store = new Map<string, { value: unknown; expiresAt: number }>();

const DEFAULT_TTL_MS = 90 * 1000; // 90 seconds for frequently changing data (progress, courses)
const LONG_TTL_MS = 3 * 60 * 1000; // 3 minutes for events, groups, certificates

/**
 * Return cached value if present and not expired; otherwise run fn(), cache result, and return it.
 *
 * `opts.shouldCache` lets callers refuse to memoize certain results. This matters
 * for freshly signed-up users: their roles are assigned asynchronously by the
 * onUserCreated Cloud Function, so an early fetch can legitimately return an
 * empty roles/courses list — caching that empty result made the Curriculum page
 * look blank until the TTL expired or the page was refreshed.
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
  opts?: { shouldCache?: (value: T) => boolean }
): Promise<T> {
  const entry = store.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.value as T;
  }
  const value = await fn();
  if (!opts?.shouldCache || opts.shouldCache(value)) {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
  return value;
}

/**
 * Invalidate one key or all keys matching a prefix (e.g. "progress:user123" or prefix "progress:").
 */
export function invalidateCache(keyOrPrefix: string): void {
  if (keyOrPrefix.endsWith(":")) {
    for (const key of store.keys()) {
      if (key.startsWith(keyOrPrefix)) store.delete(key);
    }
  } else {
    store.delete(keyOrPrefix);
  }
}

/** TTL for data that changes often (progress, course list). */
export const TTL_SHORT = DEFAULT_TTL_MS;

/** TTL for data that changes less often (events, groups, certificates, profile). */
export const TTL_MEDIUM = LONG_TTL_MS;
