/**
 * scheduledNudgeIncompleteProfiles Scheduled Function
 * Sends reminder emails to users with onboarding_status='partial' > 48h
 * Stub email sending for now (log to console)
 */

import {onSchedule} from "firebase-functions/v2/scheduler";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, Timestamp, FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {ANALYTICS_WEB_SCHEMA_VERSION} from "../analytics/mortarAnalyticsContract";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export const scheduledNudgeIncompleteProfiles = onSchedule(
  {
    schedule: "0 9 * * *", // Daily at 9 AM
    timeZone: "America/New_York",
    region: "us-central1",
    maxInstances: 1,
  },
  async () => {
    try {
      logger.info("Starting scheduled nudge for incomplete profiles");

      // Calculate 48 hours ago
      const fortyEightHoursAgo = Timestamp.fromMillis(
        Date.now() - 48 * 60 * 60 * 1000
      );

      // Query users with partial onboarding status updated more than 48h ago
      const usersRef = db.collection("users");
      const snapshot = await usersRef
        .where("onboarding_status", "==", "partial")
        .where("updated_at", "<", fortyEightHoursAgo)
        .limit(100) // Process in batches
        .get();

      const nudgedUsers: string[] = [];

      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();
        const uid = userDoc.id;
        const email = userData.email;

        // Stub: Log to console (replace with SendGrid integration later)
        logger.info(`[STUB] Sending nudge email to ${email} (${uid})`);
        logger.info("  Message: Complete your profile to get better matches!");

        // Log analytics event (normalized shape used by Phase 4/5 summaries)
        await db.collection("analytics_events").add({
          schema_version: ANALYTICS_WEB_SCHEMA_VERSION,
          source: "backend_functions",
          event_name: "onboarding_nudge_sent",
          user_id: uid,
          created_at: FieldValue.serverTimestamp(),
          client_timestamp_ms: null,
          client: {platform: "web"},
          session_id: null,
          screen_session_id: null,
          route_path: null,
          screen_name: "scheduled_nudge_incomplete_profiles",
          properties: {
            onboarding_status: "partial",
            days_since_update: Math.round(
              (Date.now() - (userData.updated_at?.toMillis?.() || Date.now())) /
                (24 * 60 * 60 * 1000)
            ),
          },
          dedupe_key: null,
          ingested_via: "scheduled_nudge_incomplete_profiles",
        });

        nudgedUsers.push(uid);
      }

      logger.info(`Nudged ${nudgedUsers.length} users with incomplete profiles`);
    } catch (error) {
      logger.error("Error in scheduled nudge:", error);
      throw error;
    }
  }
);
