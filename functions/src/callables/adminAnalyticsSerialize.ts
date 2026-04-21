import { Timestamp } from "firebase-admin/firestore";

/** JSON-safe payload for admin exports (ISO strings for timestamps). */
export function serializeFirestoreValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === "object" && v !== null && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    try {
      return (v as Timestamp).toDate().toISOString();
    } catch {
      /* fall through */
    }
  }
  if (Array.isArray(v)) return v.map(serializeFirestoreValue);
  if (typeof v === "object" && v !== null && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.entries(o).map(([k, val]) => [k, serializeFirestoreValue(val)]));
  }
  return v;
}
