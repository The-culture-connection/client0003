/**
 * When a member files `user_reports/{id}`, set `users/{reportedUid}.content_suspended` so
 * Firestore rules + app guards block new content (reporters cannot update other users’ docs).
 */
import {initializeApp, getApps} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const USERS = "users";

export const onUserReportCreated = onDocumentCreated(
  {
    document: "user_reports/{reportId}",
    region: "us-central1",
  },
  async (event) => {
    const snap = event.data;
    if (!snap?.exists) return;

    const data = snap.data();
    const reported = typeof data.reported_user_id === "string" ? data.reported_user_id.trim() : "";
    const reporter = typeof data.reporter_id === "string" ? data.reporter_id.trim() : "";

    if (!reported || reported === reporter) {
      logger.warn("onUserReportCreated: skip invalid reported_user_id", {
        reportId: event.params.reportId,
      });
      return;
    }

    try {
      await db.collection(USERS).doc(reported).set(
        {
          content_suspended: true,
          updated_at: FieldValue.serverTimestamp(),
          report_suspension_last_at: FieldValue.serverTimestamp(),
        },
        {merge: true}
      );
      logger.info("onUserReportCreated: content_suspended set", {reported, reportId: event.params.reportId});
    } catch (e) {
      logger.error("onUserReportCreated: failed to update user", {reported, error: String(e)});
      throw e;
    }
  }
);
