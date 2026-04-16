/**
 * Summary / rollup logic for raw analytics events.
 * Called from Firestore triggers; keep free of HTTP/UI concerns.
 */

import type {DocumentSnapshot} from "firebase-admin/firestore";

export interface RawEventSnapshotShape {
  event_name?: string;
  user_id?: string;
}

/**
 * Placeholder: derive rollup keys from a new raw event.
 * Implement daily/hourly counters and facet bucketing here.
 */
export function rollupKeysFromRawEvent(_snap: DocumentSnapshot): string[] {
  return [];
}
