import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {BREVO_API_KEY, type EmailAttachment} from "../email/brevoClient";
import {
  displayNameFromUserDoc,
  graduationApplicationUrl,
  graduationMeetingTimeSelectedParams,
  graduationNotAdmittedParams,
} from "../email/buildEmailParams";
import {
  buildGraduationMeetingIcs,
  parseEasternMeetingTime,
} from "../email/graduationMeetingIcs";
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

/**
 * Calendar invite for the confirmed meeting time. The stored `selectedTime` is
 * an Eastern wall-clock string ("3/16/2026 at 9:00 AM"); when it can't be
 * parsed (legacy/free-form values) the email simply goes out without an
 * attachment — never throw over the .ics.
 */
function meetingIcsAttachment(
  applicationId: string,
  selectedTime: string
): EmailAttachment[] | undefined {
  try {
    const startUtc = parseEasternMeetingTime(selectedTime);
    if (!startUtc) {
      logger.warn("Graduation meeting .ics skipped: unparseable selectedTime", {
        applicationId,
        selectedTime,
      });
      return undefined;
    }
    const ics = buildGraduationMeetingIcs({
      applicationId,
      startUtc,
      applicationUrl: graduationApplicationUrl(),
    });
    return [{
      name: "mortar-pitch-meeting.ics",
      content: Buffer.from(ics, "utf8").toString("base64"),
    }];
  } catch (err) {
    logger.warn("Graduation meeting .ics skipped: build failed", {applicationId, err});
    return undefined;
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
        // Only the meeting-confirmation email carries the calendar invite.
        attachments: meetingIcsAttachment(applicationId, nextTime),
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
