import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {BREVO_API_KEY, sendEmail} from "../email/brevoClient";
import {
  displayNameFromUserDoc,
  firstNameFrom,
  formatEventDate,
} from "../email/buildEmailParams";
import {DEFAULT_SUPPORT_EMAIL} from "../email/emailConfig";

if (getApps().length === 0) {
  initializeApp();
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Raw-content HTML body (no Brevo template needed — see sendEmail's
 * subject/htmlContent path). Simple inline-styled markup so it renders the
 * same across email clients.
 */
function buildEventSubmittedHtml(input: {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
}): string {
  const title = escapeHtml(input.eventTitle);
  const date = escapeHtml(input.eventDate);
  const location = escapeHtml(input.eventLocation);
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background-color:#111111;border-radius:8px 8px 0 0;padding:20px 24px;text-align:center;">
      <span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:4px;">MORTAR</span>
    </div>
    <div style="background-color:#ffffff;border-radius:0 0 8px 8px;padding:28px 24px;color:#222222;font-size:15px;line-height:1.6;">
      <p style="margin:0 0 16px;">Hi ${escapeHtml(input.firstName)},</p>
      <p style="margin:0 0 16px;">
        Your event has been submitted and is pending review by the MORTAR team.
        We&rsquo;ll let you know when it&rsquo;s live.
      </p>
      <div style="background-color:#f7f7f7;border-radius:6px;padding:16px 20px;margin:0 0 16px;">
        <p style="margin:0 0 6px;font-weight:bold;">${title}</p>
        <p style="margin:0 0 6px;">${date}</p>
        <p style="margin:0;">${location}</p>
      </div>
      <p style="margin:0;">Thanks for helping build the MORTAR community!</p>
    </div>
    <p style="text-align:center;color:#888888;font-size:12px;margin:16px 0 0;">
      Questions? Contact us at
      <a href="mailto:${DEFAULT_SUPPORT_EMAIL}" style="color:#888888;">${DEFAULT_SUPPORT_EMAIL}</a>
    </p>
  </div>
</body>
</html>`;
}

/**
 * Confirmation email when a member submits an event from the mobile app
 * (`submitUserEventForApproval` writes `events_mobile` with
 * `approval_status: "pending"`; staff later publishes or declines it in
 * Digital Curriculum admin). Sends raw HTML content — no Brevo template setup
 * required.
 */
export const onEventSubmittedEmail = onDocumentCreated(
  {
    region: "us-central1",
    document: "events_mobile/{eventId}",
    secrets: [BREVO_API_KEY],
  },
  async (event) => {
    const eventId = event.params.eventId as string;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    // Only member submissions awaiting review; admin-published events skip.
    if (str(data.approval_status) !== "pending") return;
    // Guard against redelivery (at-least-once trigger semantics).
    if (data.brevo_email_submitted_sent_at) return;

    const creatorUid = str(data.created_by);
    if (!creatorUid) {
      logger.warn("Event submitted email skipped: missing created_by", {eventId});
      return;
    }

    let userDoc: Record<string, unknown> | undefined;
    try {
      const snap = await getFirestore().collection("users").doc(creatorUid).get();
      userDoc = snap.data();
    } catch (err) {
      logger.warn("Event submitted email skipped: could not load user", {eventId, creatorUid, err});
      return;
    }
    const email = str(userDoc?.email) || str(userDoc?.normalizedEmail);
    if (!email) {
      logger.warn("Event submitted email skipped: no email on user", {eventId, creatorUid});
      return;
    }

    const displayName = displayNameFromUserDoc(userDoc);
    const eventTitle = str(data.title) || "Your event";
    const eventDate = formatEventDate(
      data.date instanceof Timestamp ? data.date : null,
      str(data.time)
    );
    const eventLocation = str(data.location) || "See event page for location";

    const result = await sendEmail({
      to: email,
      recipientUid: creatorUid,
      subject: "MORTAR: Your event has been submitted",
      htmlContent: buildEventSubmittedHtml({
        firstName: firstNameFrom(displayName, email),
        eventTitle,
        eventDate,
        eventLocation,
      }),
      tags: ["event_submitted_confirmation"],
      preferenceCategory: "events",
    });

    if (result.success) {
      await event.data!.ref.update({
        brevo_email_submitted_sent_at: FieldValue.serverTimestamp(),
      });
    }
  }
);
