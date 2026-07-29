/**
 * Admin-composed email to one conference's attendees.
 *
 * Audience is `conferences/{id}/attendees` — the same server-written list the
 * conference push triggers use — so a message can never leak to the wider user
 * base. Sending honours the recipient's `events` email preference via
 * [sendBulkEmail], which skips opted-out addresses.
 */

import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {z} from "zod";
import {callableCorsAllowlist} from "../callableCorsAllowlist";
import {BREVO_API_KEY, sendBulkEmail} from "../email/brevoClient";
import {conferenceAnnouncementParams, firstNameFrom} from "../email/buildEmailParams";
import {isTemplateConfigured} from "../email/sendTransactionalEmail";
import {resolveTemplateId} from "../email/brevoTemplates";
import {assertCallerIsNetworkAdmin} from "../helpers/assertNetworkAdmin";
import {nullishUndefined} from "../helpers/callableNullishZod";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const MAX_RECIPIENTS = 500;

const requestSchema = z.object({
  conference_id: z.string().min(1),
  headline: z.string().min(1).max(200),
  message_body: z.string().min(1).max(20000),
  sender_name: nullishUndefined(z.string().max(120).optional()),
  cta_url: nullishUndefined(z.string().max(500).optional()),
  cta_label: nullishUndefined(z.string().max(60).optional()),
});

const asString = (v: unknown): string =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : "";

const asDate = (v: unknown): Date | null =>
  v instanceof Timestamp ? v.toDate() : null;

const dayLabel = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

/** "Mon, June 1, 2026" or "Mon, June 1, 2026 – Wed, June 3, 2026". */
function formatConferenceDates(start: unknown, end: unknown): string {
  const s = asDate(start);
  const e = asDate(end);
  if (!s) return "";
  if (!e || dayLabel(e) === dayLabel(s)) return dayLabel(s);
  return `${dayLabel(s)} – ${dayLabel(e)}`;
}

export const adminSendConferenceEmail = onCall(
  {
    region: "us-central1",
    cors: callableCorsAllowlist,
    secrets: [BREVO_API_KEY],
    timeoutSeconds: 300,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertCallerIsNetworkAdmin(uid, {
      authToken: request.auth?.token as Record<string, unknown> | undefined,
    });

    if (!isTemplateConfigured("conference_announcement_to_attendees")) {
      throw new HttpsError(
        "failed-precondition",
        "Brevo template conference_announcement_to_attendees is not configured. " +
          "Create it in Brevo, then set its numeric ID in brevoTemplates.ts or " +
          "BREVO_TPL_CONFERENCE_ANNOUNCEMENT and redeploy."
      );
    }

    const parsed = requestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues.map((e) => e.message).join("; ")
      );
    }

    const {conference_id, headline, message_body, sender_name, cta_url, cta_label} =
      parsed.data;

    const confSnap = await db.collection("conferences").doc(conference_id).get();
    if (!confSnap.exists) {
      throw new HttpsError("not-found", "Conference not found.");
    }
    const conf = confSnap.data()!;
    const conferenceName = asString(conf.name) || "MORTAR Conference";
    const conferenceDates = formatConferenceDates(conf.startDate, conf.endDate);
    const conferenceLocation = asString(conf.location);

    const attendeesSnap = await db
      .collection("conferences")
      .doc(conference_id)
      .collection("attendees")
      .limit(MAX_RECIPIENTS + 1)
      .get();

    // No attendees yet is a normal state before codes are redeemed, not an error.
    if (attendeesSnap.empty) {
      return {ok: true, sent: 0, failed: 0, recipientCount: 0, attendeeCount: 0};
    }
    if (attendeesSnap.size > MAX_RECIPIENTS) {
      throw new HttpsError(
        "invalid-argument",
        `Too many attendees (${attendeesSnap.size}+). Max ${MAX_RECIPIENTS} per send.`
      );
    }

    const recipients: string[] = [];
    const paramsPerUser: Record<string, Record<string, unknown>> = {};
    const recipientUidsByEmail: Record<string, string> = {};

    for (const attendee of attendeesSnap.docs) {
      const attendeeUid = attendee.id;
      // eslint-disable-next-line no-await-in-loop
      const userSnap = await db.collection("users").doc(attendeeUid).get();
      const userData = userSnap.data();
      const email = asString(userData?.email);
      if (!email) continue;

      const normalized = email.toLowerCase();
      if (recipients.includes(normalized)) continue;

      const displayName =
        asString(userData?.displayName) || asString(userData?.name) || undefined;

      recipients.push(normalized);
      recipientUidsByEmail[normalized] = attendeeUid;
      paramsPerUser[normalized] = conferenceAnnouncementParams({
        userEmail: normalized,
        userName: displayName,
        first_name: firstNameFrom(displayName, normalized),
        conference_name: conferenceName,
        conference_dates: conferenceDates,
        conference_location: conferenceLocation,
        headline,
        message_body,
        sender_name,
        cta_url,
        cta_label,
      });
    }

    if (recipients.length === 0) {
      return {
        ok: true,
        sent: 0,
        failed: 0,
        recipientCount: 0,
        attendeeCount: attendeesSnap.size,
      };
    }

    const templateId = resolveTemplateId("conference_announcement_to_attendees");
    const bulk = await sendBulkEmail({
      recipients,
      templateId,
      paramsPerUser,
      recipientUidsByEmail,
      tags: ["conference_attendees", conference_id],
      preferenceCategory: "events",
    });

    await db.collection("email_campaigns").add({
      type: "conference_attendee_announcement",
      conference_id,
      conference_name: conferenceName,
      sent_by_uid: uid,
      recipient_count: recipients.length,
      attendee_count: attendeesSnap.size,
      sent: bulk.sent,
      failed: bulk.failed,
      headline,
      message_body_preview: message_body.slice(0, 500),
      created_at: Timestamp.now(),
    });

    return {
      ok: true,
      sent: bulk.sent,
      failed: bulk.failed,
      recipientCount: recipients.length,
      attendeeCount: attendeesSnap.size,
    };
  }
);
