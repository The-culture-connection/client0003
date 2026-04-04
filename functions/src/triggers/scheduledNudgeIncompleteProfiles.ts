/**
 * scheduledNudgeIncompleteProfiles Scheduled Function
 * Sends reminder emails to users with onboarding_status='partial' > 48h
 * Stub email sending for now (log to console)
 */

import {onSchedule} from "firebase-functions/v2/scheduler";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

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

        // Log analytics event
        await db.collection("analytics_events").add({
          event_type: "onboarding_nudge_sent",
          user_id: uid,
          timestamp: Timestamp.now(),
          metadata: {
            onboarding_status: "partial",
            days_since_update: Math.round(
              (Date.now() - (userData.updated_at?.toMillis?.() || Date.now())) /
                (24 * 60 * 60 * 1000)
            ),
          },
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
