/**
 * Badge / milestone materialization from analytics (server-side only).
 * Phase 6 rules run from `onUserAnalyticsSummaryWritten` → `evaluateAnalyticsBadgesForUser`.
 */

import type {DocumentSnapshot} from "firebase-admin/firestore";

export { evaluateAnalyticsBadgesForUser } from "./analyticsBadgeEvaluator";
export type { BadgePhase6Rule, BadgeRuleOperator, BadgeRuleTimeframe } from "./analyticsBadgeEvaluator";

/** Raw-event hook reserved for future streaming rules; Phase 6 uses summary rollups. */
export function evaluateBadgeRulesOnRawEvent(_snap: DocumentSnapshot): void {
  /* no-op */
}
