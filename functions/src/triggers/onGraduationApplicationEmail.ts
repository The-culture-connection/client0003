import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {BREVO_API_KEY} from "../email/brevoClient";
import {
  displayNameFromUserDoc,
  graduationMeetingTimeSelectedParams,
  graduationNotAdmittedParams,
} from "../email/buildEmailParams";
import {sendTransactionalEmail} from "../email/sendTransactionalEmail";

if (getApps().length === 0) {
  initializeApp();
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * The application doc's `userName` is `displayName || email` from the client,
 * so it is often just the email address. Prefer the real name from the user's
 * profile doc (first_name/last_name saved during onboarding).
 */
async function resolveUserName(userId: string, fallback: string): Promise<string> {
  if (!userId) return fallback;
  try {
    const snap = await getFirestore().collection("users").doc(userId).get();
    const fromProfile = displayNameFromUserDoc(snap.data());
    return fromProfile || fallback;
  } catch (err) {
    logger.warn("Could not resolve user profile name for graduation email", {userId, err});
    return fallback;
  }
}

export const onGraduationApplicationEmail = onDocumentUpdated(
  {
    region: "us-central1",
    document: "GraduationApplications/{applicationId}",
    secrets: [BREVO_API_KEY],
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const applicationId = event.params.applicationId as string;
    const userEmail = str(after.userEmail);
    const userId = str(after.userId);
    const userName = str(after.userName);

    if (!userEmail) {
      logger.warn("Graduation email skipped: missing userEmail", {applicationId});
      return;
    }

    const prevStatus = str(before.status) || "pending";
    const nextStatus = str(after.status) || "pending";
    const prevTime = str(before.selectedTime);
    const nextTime = str(after.selectedTime);
    const notes = str(after.notes) || null;

    const meetingAlreadySent = Boolean(after.brevo_email_meeting_sent_at);
    const rejectAlreadySent = Boolean(after.brevo_email_rejected_sent_at);

    const meetingTimeNewlySet =
      nextTime.length > 0 && prevTime !== nextTime;

    if (meetingTimeNewlySet && !meetingAlreadySent) {
      const params = graduationMeetingTimeSelectedParams({
        userName: await resolveUserName(userId, userName),
        userEmail,
        meeting_time: nextTime,
        notes,
      });
      const result = await sendTransactionalEmail("graduation_meeting_time_selected", {
        to: userEmail,
        recipientUid: userId || undefined,
        params,
        preferenceCategory: "graduation_updates",
      });
      if (result.sent) {
        await event.data!.after.ref.update({
          brevo_email_meeting_sent_at: FieldValue.serverTimestamp(),
        });
      }
      return;
    }

    const rejectedNow = nextStatus === "rejected" && prevStatus !== "rejected";
    if (rejectedNow && !rejectAlreadySent) {
      const params = graduationNotAdmittedParams({
        userName: await resolveUserName(userId, userName),
        userEmail,
        notes,
      });
      const result = await sendTransactionalEmail("graduation_not_admitted", {
        to: userEmail,
        recipientUid: userId || undefined,
        params,
        preferenceCategory: "graduation_updates",
      });
      if (result.sent) {
        await event.data!.after.ref.update({
          brevo_email_rejected_sent_at: FieldValue.serverTimestamp(),
        });
      }
    }
  }
);
