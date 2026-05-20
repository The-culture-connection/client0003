import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {z} from "zod";
import {callableCorsAllowlist} from "../callableCorsAllowlist";
import {BREVO_API_KEY, sendBulkEmail} from "../email/brevoClient";
import {eventRegistrantParams, formatEventDate, firstNameFrom} from "../email/buildEmailParams";
import {isTemplateConfigured} from "../email/sendTransactionalEmail";
import {resolveTemplateId} from "../email/brevoTemplates";
import {assertCallerIsNetworkAdmin} from "../helpers/assertNetworkAdmin";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const MAX_RECIPIENTS = 500;

const requestSchema = z.object({
  event_id: z.string().min(1),
  /** `auto` merges registrants from `events` and `events_mobile` with the same id. */
  collection: z.enum(["events", "events_mobile", "auto"]).default("auto"),
  message_body: z.string().min(1).max(20000),
  event_location_override: z.string().max(500).optional(),
});

async function loadEventAndRegistrants(
  eventId: string,
  collection: "events" | "events_mobile" | "auto"
): Promise<{
  event: Record<string, unknown>;
  registered: string[];
  collectionsUsed: string[];
} | null> {
  const collectionsUsed: string[] = [];
  const toRead =
    collection === "auto" ? (["events", "events_mobile"] as const) : ([collection] as const);

  let event: Record<string, unknown> | null = null;
  const uidSet = new Set<string>();

  for (const col of toRead) {
    // eslint-disable-next-line no-await-in-loop
    const snap = await db.collection(col).doc(eventId).get();
    if (!snap.exists) continue;
    collectionsUsed.push(col);
    const d = snap.data()!;
    if (!event) event = d;
    const ru = Array.isArray(d.registered_users) ? (d.registered_users as string[]) : [];
    for (const id of ru) {
      if (typeof id === "string" && id.length > 0) uidSet.add(id);
    }
  }

  if (!event) return null;
  return {event, registered: Array.from(uidSet), collectionsUsed};
}

export const adminSendEventRegistrantEmail = onCall(
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

    if (!isTemplateConfigured("event_announcement_to_registrants")) {
      throw new HttpsError(
        "failed-precondition",
        "Brevo template event_announcement_to_registrants is not configured."
      );
    }

    const parsed = requestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues.map((e) => e.message).join("; ")
      );
    }

    const {event_id, collection, message_body, event_location_override} = parsed.data;
    const loaded = await loadEventAndRegistrants(event_id, collection);
    if (!loaded) {
      throw new HttpsError("not-found", "Event not found.");
    }

    const {event, registered, collectionsUsed} = loaded;

    if (registered.length === 0) {
      return {ok: true, sent: 0, failed: 0, recipientCount: 0};
    }
    if (registered.length > MAX_RECIPIENTS) {
      throw new HttpsError(
        "invalid-argument",
        `Too many registrants (${registered.length}). Max ${MAX_RECIPIENTS} per send.`
      );
    }

    const title = typeof event.title === "string" ? event.title : "Mortar Event";
    const eventDate = formatEventDate(
      event.date as Timestamp | undefined,
      typeof event.time === "string" ? event.time : undefined
    );
    const location =
      event_location_override?.trim() ||
      (typeof event.location === "string" ? event.location : "");

    const recipients: string[] = [];
    const paramsPerUser: Record<string, Record<string, unknown>> = {};
    const recipientUidsByEmail: Record<string, string> = {};

    for (const regUid of registered) {
      // eslint-disable-next-line no-await-in-loop
      const userSnap = await db.collection("users").doc(regUid).get();
      const email = typeof userSnap.data()?.email === "string" ? userSnap.data()!.email.trim() : "";
      if (!email) continue;

      const normalized = email.toLowerCase();
      if (recipients.includes(normalized)) continue;

      const displayName =
        (typeof userSnap.data()?.displayName === "string" && userSnap.data()!.displayName) ||
        (typeof userSnap.data()?.name === "string" && userSnap.data()!.name) ||
        undefined;

      recipients.push(normalized);
      recipientUidsByEmail[normalized] = regUid;
      paramsPerUser[normalized] = eventRegistrantParams({
        userEmail: normalized,
        userName: displayName,
        first_name: firstNameFrom(displayName, normalized),
        event_title: title,
        event_date: eventDate,
        event_location: location,
        message_body,
        event_id,
      });
    }

    const templateId = resolveTemplateId("event_announcement_to_registrants");
    const bulk = await sendBulkEmail({
      recipients,
      templateId,
      paramsPerUser,
      recipientUidsByEmail,
      tags: ["event_registrants", event_id],
      preferenceCategory: "events",
    });

    await db.collection("email_campaigns").add({
      type: "event_registrant_announcement",
      event_id,
      collection: collectionsUsed.join("+") || collection,
      sent_by_uid: uid,
      recipient_count: recipients.length,
      sent: bulk.sent,
      failed: bulk.failed,
      message_body_preview: message_body.slice(0, 500),
      created_at: Timestamp.now(),
    });

    return {
      ok: true,
      sent: bulk.sent,
      failed: bulk.failed,
      recipientCount: recipients.length,
    };
  }
);
