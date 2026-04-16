/**
 * Phase 6 — re-evaluate analytics-driven badges when `user_analytics_summary` changes.
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { ANALYTICS_COLLECTIONS } from "../mortarAnalyticsContract";
import { evaluateAnalyticsBadgesForUser } from "../badges/analyticsBadgeEvaluator";

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

    try {
      await evaluateAnalyticsBadgesForUser(db, uid, data);
    } catch (err) {
      logger.error("onUserAnalyticsSummaryWritten: badge evaluation failed", { err, uid });
    }
  }
);
