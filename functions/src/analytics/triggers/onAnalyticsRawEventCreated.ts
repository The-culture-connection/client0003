/**
 * Post-process new canonical raw events (rollups + badge hooks).
 * Firestore → Functions v2 trigger; no UI.
 */

import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {ANALYTICS_COLLECTIONS} from "../mortarAnalyticsContract";
import {rollupKeysFromRawEvent} from "../summary/rollupFromRawEvent";
import {evaluateBadgeRulesOnRawEvent} from "../badges/badgeRulesEngine";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

function utcYyyyMmDd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}_${m}_${day}`;
}

export const onAnalyticsRawEventCreated = onDocumentCreated(
  `${ANALYTICS_COLLECTIONS.RAW_EVENTS}/{eventId}`,
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    try {
      evaluateBadgeRulesOnRawEvent(snap);
      const keys = rollupKeysFromRawEvent(snap);
      if (keys.length) {
        logger.debug("rollup keys (stub)", {keys});
      }

      const data = snap.data();
      const eventName = typeof data?.event_name === "string" ? data.event_name : "unknown";
      const dayKey = utcYyyyMmDd(new Date());
      const summaryRef = db.collection(ANALYTICS_COLLECTIONS.DAILY_SUMMARIES).doc(`day_${dayKey}`);

      await summaryRef.set(
        {
          date_utc: dayKey,
          updated_at: FieldValue.serverTimestamp(),
          [`counts.${eventName}`]: FieldValue.increment(1),
          total_events: FieldValue.increment(1),
        },
        {merge: true}
      );
    } catch (err) {
      logger.error("onAnalyticsRawEventCreated failed", err);
    }
  }
);
