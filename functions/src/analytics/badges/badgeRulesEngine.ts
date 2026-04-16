/**
 * Badge / milestone materialization from analytics (server-side only).
 * Decoupled from UI; triggers or batch jobs call into this layer.
 */

import type {DocumentSnapshot} from "firebase-admin/firestore";

/**
 * Placeholder: evaluate whether a raw event should update `analytics_user_badges/{uid}`.
 */
export function evaluateBadgeRulesOnRawEvent(_snap: DocumentSnapshot): void {
  /* no-op until badge definitions are wired */
}
