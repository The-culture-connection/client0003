import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";
import {callableCorsAllowlist} from "../callableCorsAllowlist";
import {ANALYTICS_WEB_SCHEMA_VERSION} from "../analytics/mortarAnalyticsContract";
import {WEB_ANALYTICS_EVENTS} from "../analytics/webAnalyticsEventRegistry";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const schema = z.object({
  user_id: z.string().min(1),
  notification_id: z.string().min(1),
});

export const markNotificationReadBackend = onCall(
  {region: "us-central1", cors: callableCorsAllowlist},
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const parsed = schema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }
    const {user_id, notification_id} = parsed.data;
    if (user_id !== callerUid) {
      throw new HttpsError("permission-denied", "Cannot modify another user's notifications");
    }

    const notifRef = db.collection("users").doc(user_id).collection("notifications").doc(notification_id);
    await notifRef.set(
      {
        read: true,
        readAt: FieldValue.serverTimestamp(),
      },
      {merge: true}
    );

    await db.collection("analytics_events").add({
      schema_version: ANALYTICS_WEB_SCHEMA_VERSION,
      source: "backend_functions",
      event_name: WEB_ANALYTICS_EVENTS.NOTIFICATION_MARK_READ_BACKEND,
      user_id: user_id,
      created_at: FieldValue.serverTimestamp(),
      client_timestamp_ms: null,
      client: {platform: "web"},
      session_id: null,
      screen_session_id: null,
      route_path: null,
      screen_name: "notification_center",
      properties: {
        notification_id,
      },
      dedupe_key: null,
      ingested_via: "callable_mark_notification_read_backend",
    });

    logger.info("notification marked as read", {user_id, notification_id});
    return {success: true};
  }
);
