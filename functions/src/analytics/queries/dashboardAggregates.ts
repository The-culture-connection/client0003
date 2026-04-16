/**
 * Read-side helpers for admin dashboards and reporting callables.
 * Uses Admin SDK only — not callable from the browser directly.
 */

import type {Firestore} from "firebase-admin/firestore";
import {ANALYTICS_COLLECTIONS} from "../mortarAnalyticsContract";

/** Count all canonical raw events for a user (Admin SDK; use in reporting callables). */
export async function countRawEventsForUser(db: Firestore, userId: string): Promise<number> {
  const q = await db
    .collection(ANALYTICS_COLLECTIONS.RAW_EVENTS)
    .where("user_id", "==", userId)
    .count()
    .get();
  return q.data().count;
}
