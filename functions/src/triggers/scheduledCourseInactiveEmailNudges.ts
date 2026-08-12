import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {BREVO_API_KEY} from "../email/brevoClient";
import {courseInactiveParams, displayNameFromUserDoc} from "../email/buildEmailParams";
import {DEFAULT_COURSE_DISPLAY_NAME, DEFAULT_COURSE_ID} from "../email/emailConfig";
import {resolveCourseEmailContext} from "../email/resolveCourseEmailContext";
import {sendTransactionalEmail} from "../email/sendTransactionalEmail";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const MS_DAY = 24 * 60 * 60 * 1000;
const BATCH_LIMIT = 120;

async function loadUserContact(uid: string): Promise<{
  email: string;
  userName?: string;
} | null> {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  const email = typeof d.email === "string" ? d.email.trim() : "";
  if (!email) return null;
  // Prefer the onboarding profile name (first_name/last_name) over legacy fields.
  const userName = displayNameFromUserDoc(d);
  return {email, userName};
}

export const scheduledCourseInactiveEmailNudges = onSchedule(
  {
    schedule: "0 10 * * *",
    timeZone: "America/New_York",
    region: "us-central1",
    maxInstances: 1,
    secrets: [BREVO_API_KEY],
  },
  async () => {
    const now = Date.now();
    const sevenCutoffMs = now - 7 * MS_DAY;

    const snap = await db
      .collection("courseProgress")
      .where("updatedAt", "<", Timestamp.fromMillis(sevenCutoffMs))
      .limit(BATCH_LIMIT)
      .get();

    let sent7 = 0;
    let sent14 = 0;
    let skipped = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (data.completed === true) {
        skipped++;
        continue;
      }

      const updatedMs = data.updatedAt?.toMillis?.() ?? 0;
      if (!updatedMs) {
        skipped++;
        continue;
      }

      const inactiveDays = (now - updatedMs) / MS_DAY;
      const sent7d = Boolean(data.brevo_email_inactive_7d_sent_at);
      const sent14d = Boolean(data.brevo_email_inactive_14d_sent_at);

      let templateKey: "course_inactive_14_days" | "course_inactive_7_days" | null = null;
      let sentField: string | null = null;

      if (inactiveDays >= 14 && !sent14d) {
        templateKey = "course_inactive_14_days";
        sentField = "brevo_email_inactive_14d_sent_at";
      } else if (inactiveDays >= 7 && inactiveDays < 14 && !sent7d) {
        templateKey = "course_inactive_7_days";
        sentField = "brevo_email_inactive_7d_sent_at";
      } else {
        skipped++;
        continue;
      }

      const uid = typeof data.userId === "string" ? data.userId : "";
      if (!uid) {
        skipped++;
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const contact = await loadUserContact(uid);
      if (!contact) {
        skipped++;
        continue;
      }

      const courseId =
        (typeof data.courseId === "string" && data.courseId.trim()) || DEFAULT_COURSE_ID;

      // eslint-disable-next-line no-await-in-loop
      const courseContext = await resolveCourseEmailContext({
        courseId,
        progress: data as Record<string, unknown>,
      });

      const courseName =
        (typeof data.courseDisplayName === "string" && data.courseDisplayName) ||
        DEFAULT_COURSE_DISPLAY_NAME;

      const params = courseInactiveParams({
        userEmail: contact.email,
        userName: contact.userName,
        course_name: courseName,
        course_id: courseId,
        courseContext,
      });

      // eslint-disable-next-line no-await-in-loop
      const result = await sendTransactionalEmail(templateKey, {
        to: contact.email,
        recipientUid: uid,
        params,
        preferenceCategory: "course_nudges",
      });

      if (result.sent && sentField) {
        // eslint-disable-next-line no-await-in-loop
        await docSnap.ref.update({
          [sentField]: FieldValue.serverTimestamp(),
        });
        if (templateKey === "course_inactive_14_days") sent14++;
        else sent7++;
      } else {
        skipped++;
      }
    }

    logger.info("Course inactive email nudges finished", {
      scanned: snap.size,
      sent7,
      sent14,
      skipped,
    });
  }
);
