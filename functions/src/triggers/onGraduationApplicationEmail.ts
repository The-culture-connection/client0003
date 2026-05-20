import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue} from "firebase-admin/firestore";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {BREVO_API_KEY} from "../email/brevoClient";
import {
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
        userName,
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
        userName,
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
