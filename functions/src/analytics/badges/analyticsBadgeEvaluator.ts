/**
 * Phase 6 — analytics-driven badges from `user_analytics_summary` + `badge_definitions`.
 * Writes `user_badges/{uid}/awarded/{badgeId}` and `badge_progress/{uid}` (Functions only).
 *
 * The threshold logic lives in `./ruleEngine`, shared with conference missions.
 */

import { Firestore } from "firebase-admin/firestore";
import { ANALYTICS_COLLECTIONS } from "../mortarAnalyticsContract";
import { evaluateDefinitions, parseRuleDefinition, RuleDefRow } from "./ruleEngine";

// Re-exported for existing importers of the old type names.
export type {
  RuleOperator as BadgeRuleOperator,
  RuleTimeframe as BadgeRuleTimeframe,
  RuleCondition as BadgeCondition,
  ThresholdRule as BadgePhase6Rule,
} from "./ruleEngine";

/**
 * Run after `user_analytics_summary/{uid}` is updated. Idempotent: only increases
 * `times_awarded`.
 *
 * Definitions without a valid `rule` are skipped by [parseRuleDefinition] — which
 * is what keeps a mission's presentation-only badge doc out of this path.
 */
export async function evaluateAnalyticsBadgesForUser(
  db: Firestore,
  uid: string,
  summaryData: Record<string, unknown>
): Promise<void> {
  const defsSnap = await db.collection("badge_definitions").get();
  const defs: RuleDefRow[] = [];
  for (const doc of defsSnap.docs) {
    const row = parseRuleDefinition(doc.id, doc.data() as Record<string, unknown>);
    if (row?.active) defs.push(row);
  }
  if (defs.length === 0) return;

  await evaluateDefinitions(db, uid, summaryData, defs, {
    progressCollection: ANALYTICS_COLLECTIONS.BADGE_PROGRESS,
    notificationType: "badge_earned",
    addToEarnedBadges: true,
    buildNotification: ({ displayName, awardMode, delta }) => {
      const title =
        awardMode === "repeatable" && delta > 1
          ? `${displayName} — ×${delta} new tiers`
          : awardMode === "repeatable"
            ? `New tier: ${displayName}`
            : `Badge earned: ${displayName}`;
      const body =
        awardMode === "repeatable" && delta > 1
          ? `You advanced “${displayName}” by ${delta} tiers. Open your badges from the header (click your email) to see details.`
          : awardMode === "repeatable"
            ? `You reached another tier for “${displayName}”.`
            : `You earned the “${displayName}” badge.`;
      return { title, body };
    },
  });
}
