/**
 * Client-side feedback trigger engine.
 * Uses sessionStorage only — no Firestore reads — so trigger evaluation costs ~0ms.
 */

const COOLDOWN_KEY_PREFIX = "mortar_feedback_cooldown_";
const SESSION_COUNT_KEY_PREFIX = "mortar_feedback_session_count_";
const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

function safeGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable — silent */
  }
}

/**
 * Returns true if enough time has passed since the last time this trigger type
 * was shown to the user (within the current browser session).
 */
export function canShowFeedback(
  triggerType: string,
  cooldownMs: number = DEFAULT_COOLDOWN_MS
): boolean {
  const raw = safeGet(`${COOLDOWN_KEY_PREFIX}${triggerType}`);
  if (!raw) return true;
  const lastShownAt = parseInt(raw, 10);
  if (isNaN(lastShownAt)) return true;
  return Date.now() - lastShownAt >= cooldownMs;
}

/** Record that a feedback prompt was shown for the given trigger type. */
export function recordFeedbackShown(triggerType: string): void {
  safeSet(`${COOLDOWN_KEY_PREFIX}${triggerType}`, String(Date.now()));
}

/** Increment a session-level event counter (e.g. quiz_failed). */
export function incrementSessionCount(eventName: string): void {
  const key = `${SESSION_COUNT_KEY_PREFIX}${eventName}`;
  const current = parseInt(safeGet(key) ?? "0", 10);
  safeSet(key, String(isNaN(current) ? 1 : current + 1));
}

/** Read a session-level event counter. Returns 0 if not tracked. */
export function getSessionCount(eventName: string): number {
  const raw = safeGet(`${SESSION_COUNT_KEY_PREFIX}${eventName}`);
  const n = parseInt(raw ?? "0", 10);
  return isNaN(n) ? 0 : n;
}

/** Record a navigation path step for dead-end detection. */
export function recordNavStep(routePath: string): void {
  const key = "mortar_feedback_nav_history";
  try {
    const raw = sessionStorage.getItem(key);
    const history: string[] = raw ? JSON.parse(raw) : [];
    history.push(routePath);
    // Keep last 10 nav steps only
    if (history.length > 10) history.splice(0, history.length - 10);
    sessionStorage.setItem(key, JSON.stringify(history));
  } catch {
    /* silent */
  }
}

/**
 * Returns true if the nav history shows a bounce pattern
 * (same two routes alternating 3+ times within the last 8 steps).
 */
export function hasNavigationDeadEnd(): boolean {
  try {
    const raw = sessionStorage.getItem("mortar_feedback_nav_history");
    if (!raw) return false;
    const history: string[] = JSON.parse(raw);
    if (history.length < 6) return false;
    const recent = history.slice(-8);
    // Count repeated ping-pong between the last two distinct routes
    const last = recent[recent.length - 1];
    const secondLast = recent.slice(0, -1).reverse().find((r) => r !== last);
    if (!last || !secondLast) return false;
    let bounceCount = 0;
    for (let i = recent.length - 1; i >= 0; i--) {
      if (recent[i] === last || recent[i] === secondLast) {
        bounceCount++;
      } else {
        break;
      }
    }
    return bounceCount >= 6;
  } catch {
    return false;
  }
}
