/**
 * Phase 6 — re-evaluate analytics-driven badges when `user_analytics_summary` changes.
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { ANALYTICS_COLLECTIONS } from "../mortarAnalyticsContract";
import { evaluateAnalyticsBadgesForUser } from "../badges/analyticsBadgeEvaluator";
import { evaluateConferenceMissionsForUser } from "../badges/conferenceMissionEvaluator";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export const onUserAnalyticsSummaryWritten = onDocumentWritten(
  `${ANALYTICS_COLLECTIONS.USER_ANALYTICS_SUMMARY}/{userId}`,
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const uid = event.params.userId as string;
    const data = after.data() as Record<string, unknown>;

    // Settled independently so a failure in one evaluator cannot suppress the
    // other — they award into the same place but are otherwise unrelated.
    const [badges, missions] = await Promise.allSettled([
      evaluateAnalyticsBadgesForUser(db, uid, data),
      evaluateConferenceMissionsForUser(db, uid, data),
    ]);
    if (badges.status === "rejected") {
      logger.error("onUserAnalyticsSummaryWritten: badge evaluation failed", {
        err: badges.reason,
        uid,
      });
    }
    if (missions.status === "rejected") {
      logger.error("onUserAnalyticsSummaryWritten: mission evaluation failed", {
        err: missions.reason,
        uid,
      });
    }
  }
);
