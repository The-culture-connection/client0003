/**
 * Session id for analytics (one per browser tab). No UI dependency.
 */

const STORAGE_KEY = "mortar_analytics_session_id_v1";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateAnalyticsSessionId(): string {
  if (typeof sessionStorage === "undefined") {
    return randomId();
  }
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const next = randomId();
    sessionStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return randomId();
  }
}
