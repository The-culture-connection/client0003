/**
 * Aggregation trigger: when a survey_response doc is created, roll up daily
 * bucket counters in survey_summaries/{context_type}_{YYYY-MM-DD}.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { ANALYTICS_COLLECTIONS } from "../mortarAnalyticsContract";
import { utcYyyyMmDd } from "../summary/phase4WebEventRollup";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export const onSurveyResponseCreated = onDocumentCreated(
  `${ANALYTICS_COLLECTIONS.SURVEY_RESPONSES}/{docId}`,
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const contextType =
      typeof data.context_type === "string" && data.context_type.length > 0
        ? data.context_type
        : "general";

    const resp = data.response as { type?: string; value?: unknown; label?: string } | undefined;
    const responseLabel = typeof resp?.label === "string" ? resp.label : "unknown";
    const responseType = typeof resp?.type === "string" ? resp.type : "reaction";
    const responseValue = resp?.value;

    const createdAt = data.created_at instanceof Timestamp ? data.created_at : Timestamp.now();
    const dateKey = utcYyyyMmDd(new Date(createdAt.toMillis()));

    const summaryDocId = `${contextType}_${dateKey}`;
    const summaryRef = db.collection(ANALYTICS_COLLECTIONS.SURVEY_SUMMARIES).doc(summaryDocId);

    const patch: Record<string, unknown> = {
      schema_version: 1,
      context_type: contextType,
      date_utc: dateKey,
      updated_at: FieldValue.serverTimestamp(),
      total_responses: FieldValue.increment(1),
    };

    // Increment reaction label counter
    const safeLabel = responseLabel.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64);
    patch[`by_label.${safeLabel}`] = FieldValue.increment(1);
    patch[`by_type.${responseType}`] = FieldValue.increment(1);

    // For slider responses, accumulate sum + count for avg calculation
    if (responseType === "slider" && typeof responseValue === "number") {
      patch["slider_sum"] = FieldValue.increment(responseValue);
      patch["slider_count"] = FieldValue.increment(1);
    }

    try {
      await summaryRef.set(patch, { merge: true });
    } catch (err) {
      logger.error("onSurveyResponseCreated: summary write failed", {
        err,
        docId: snap.id,
        contextType,
        dateKey,
      });
    }
  }
);
