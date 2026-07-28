/**
 * Conference missions — admin-authored challenges evaluated by the same
 * threshold engine as analytics badges (`./ruleEngine`).
 *
 * Definitions: `conference_missions/{missionId}`
 *   conference_id, title, description, icon_key, display_order, active,
 *   award_mode, badge_id, rule { metric_key, operator, threshold }
 *
 * Progress:  `mission_progress/{uid}.by_badge[missionId]`
 * Awards:    `user_badges/{uid}/awarded/{badge_id}` + `users/{uid}.badges.earned`
 *
 * Completing a mission grants its linked badge, so it appears on the normal
 * badge wall alongside every other badge. That badge's `badge_definitions` doc
 * carries no `rule`, which is what keeps the badge evaluator from also trying
 * to award it.
 */

import { Firestore } from "firebase-admin/firestore";
import { evaluateDefinitions, parseRuleDefinition, RuleDefRow } from "./ruleEngine";

export const CONFERENCE_MISSIONS_COLLECTION = "conference_missions";
export const MISSION_PROGRESS_COLLECTION = "mission_progress";

/**
 * Metric keys are conference-scoped so a returning attendee starts each event
 * from zero. Kept in sync with `expansionMobileEventRollup`.
 */
export function conferenceMetricKey(conferenceId: string, metric: string): string {
  return `conf_${conferenceId}_${metric}`;
}

export async function evaluateConferenceMissionsForUser(
  db: Firestore,
  uid: string,
  summaryData: Record<string, unknown>
): Promise<void> {
  const snap = await db
    .collection(CONFERENCE_MISSIONS_COLLECTION)
    .where("active", "==", true)
    .get();

  const defs: RuleDefRow[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const row = parseRuleDefinition(doc.id, data, {
      nameKeys: ["title", "name"],
      // Completing the mission awards this badge, not the mission id.
      awardIdKey: "badge_id",
    });
    // A mission with no badge attached has nothing to award, and would
    // otherwise silently award under its own id and render as a blank tile.
    if (row?.active && row.award_id) defs.push(row);
  }
  if (defs.length === 0) return;

  await evaluateDefinitions(db, uid, summaryData, defs, {
    progressCollection: MISSION_PROGRESS_COLLECTION,
    notificationType: "mission_completed",
    addToEarnedBadges: true,
    buildNotification: ({ displayName, awardMode, delta }) => {
      const title =
        awardMode === "repeatable" && delta > 1
          ? `${displayName} — ×${delta} completed`
          : `Mission complete: ${displayName}`;
      const body =
        awardMode === "repeatable" && delta > 1
          ? `You completed “${displayName}” ${delta} more times. Your badge is on your profile.`
          : `You completed “${displayName}”. The badge is now on your profile.`;
      return { title, body };
    },
  });
}
