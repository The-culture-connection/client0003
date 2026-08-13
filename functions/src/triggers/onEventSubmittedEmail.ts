import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {BREVO_API_KEY} from "../email/brevoClient";
import {
  displayNameFromUserDoc,
  eventSubmittedConfirmationParams,
} from "../email/buildEmailParams";
import {sendTransactionalEmail} from "../email/sendTransactionalEmail";

if (getApps().length === 0) {
  initializeApp();
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** "Aug 20, 2026" from the event's `date`, falling back to its free-text `time`. */
function whenLabel(date: unknown, time: string): string {
  const d = date instanceof Timestamp ? date.toDate() : null;
  if (!d) return time;
  const day = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
  return time ? `${day} · ${time}` : day;
}

/**
 * Confirms a member-submitted event landed and is queued for review.
 *
 * Beta feedback: "Can we get an email confirmation that your event was
 * submitted?" — the mobile app showed a toast and nothing else, so a submitter
 * who closed the app had no record that it went anywhere.
 *
 * Fires only for member submissions (`approval_status: 'pending'`). Staff
 * publish events directly, with no approval_status and nothing to confirm.
 */
export const onEventSubmittedEmail = onDocumentCreated(
  {
    region: "us-central1",
    document: "events_mobile/{eventId}",
    secrets: [BREVO_API_KEY],
  },
  async (event) => {
    const snap = event.data;
    const data = snap?.data();
    if (!data) return;

    const eventId = event.params.eventId as string;
    if (str(data.approval_status) !== "pending") return;

    const createdBy = str(data.created_by);
    if (!createdBy) {
      logger.warn("Event submitted email skipped: no created_by", {eventId});
      return;
    }

    let userEmail = "";
    let userName = "";
    try {
      const userSnap = await getFirestore().collection("users").doc(createdBy).get();
      const userData = userSnap.data();
      userEmail = str(userData?.email);
      userName = displayNameFromUserDoc(userData) ?? "";
    } catch (err) {
      logger.warn("Could not read submitter profile for event email", {eventId, createdBy, err});
      return;
    }

    if (!userEmail) {
      logger.warn("Event submitted email skipped: submitter has no email", {eventId, createdBy});
      return;
    }

    const params = eventSubmittedConfirmationParams({
      userName,
      userEmail,
      event_title: str(data.title) || "Your event",
      event_when: whenLabel(data.date, str(data.time)),
      event_location: str(data.location) || null,
    });

    const result = await sendTransactionalEmail("event_submitted_confirmation", {
      to: userEmail,
      recipientUid: createdBy,
      params,
      preferenceCategory: "events",
    });

    // Stamped so a re-created doc (or a replayed event) can be told apart from
    // a genuine first send when reading the queue later.
    if (result.sent) {
      await snap!.ref.update({
        brevo_email_submitted_sent_at: FieldValue.serverTimestamp(),
      });
    }
  }
);
