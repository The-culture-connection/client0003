import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {z} from "zod";
import {callableCorsAllowlist} from "../callableCorsAllowlist";
import {BREVO_API_KEY, sendBulkEmail} from "../email/brevoClient";
import {adminCustomAnnouncementParams} from "../email/buildEmailParams";
import {isTemplateConfigured} from "../email/sendTransactionalEmail";
import {resolveTemplateId} from "../email/brevoTemplates";
import {assertCallerIsNetworkAdmin} from "../helpers/assertNetworkAdmin";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const MAX_RECIPIENTS = 500;

const requestSchema = z.object({
  headline: z.string().min(1).max(200),
  message_body: z.string().min(1).max(20000),
  sender_name: z.string().min(1).max(120),
  cta_url: z.string().url().optional(),
  cta_label: z.string().max(80).optional(),
  emails: z.array(z.string().email()).max(MAX_RECIPIENTS).optional(),
  user_ids: z.array(z.string().min(1)).max(MAX_RECIPIENTS).optional(),
  role: z.string().min(1).optional(),
});

export const adminSendCustomAnnouncementEmail = onCall(
  {
    region: "us-central1",
    cors: callableCorsAllowlist,
    secrets: [BREVO_API_KEY],
    timeoutSeconds: 300,
  },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertCallerIsNetworkAdmin(callerUid);

    if (!isTemplateConfigured("admin_custom_announcement")) {
      throw new HttpsError(
        "failed-precondition",
        "Brevo template admin_custom_announcement is not configured."
      );
    }

    const parsed = requestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues.map((e) => e.message).join("; ")
      );
    }

    const {headline, message_body, sender_name, cta_url, cta_label, emails, user_ids, role} =
      parsed.data;

    if (!emails?.length && !user_ids?.length && !role) {
      throw new HttpsError(
        "invalid-argument",
        "Provide emails, user_ids, or role for the audience."
      );
    }

    if (role === "all") {
      throw new HttpsError("invalid-argument", "Broadcast to all users is not enabled.");
    }

    const recipientMap = new Map<string, {email: string; uid?: string; name?: string}>();

    if (emails?.length) {
      for (const raw of emails) {
        const email = raw.trim().toLowerCase();
        if (!recipientMap.has(email)) {
          recipientMap.set(email, {email});
        }
      }
    }

    if (user_ids?.length) {
      for (const id of user_ids) {
        // eslint-disable-next-line no-await-in-loop
        const snap = await db.collection("users").doc(id).get();
        const email = typeof snap.data()?.email === "string" ? snap.data()!.email.trim().toLowerCase() : "";
        if (!email) continue;
        const name =
          (typeof snap.data()?.displayName === "string" && snap.data()!.displayName) ||
          (typeof snap.data()?.name === "string" && snap.data()!.name) ||
          undefined;
        recipientMap.set(email, {email, uid: id, name});
      }
    }

    if (role) {
      const byRole = await db
        .collection("users")
        .where("roles", "array-contains", role)
        .limit(MAX_RECIPIENTS)
        .get();
      for (const docSnap of byRole.docs) {
        const email = typeof docSnap.data().email === "string" ? docSnap.data().email.trim().toLowerCase() : "";
        if (!email) continue;
        const name =
          (typeof docSnap.data().displayName === "string" && docSnap.data().displayName) ||
          (typeof docSnap.data().name === "string" && docSnap.data().name) ||
          undefined;
        recipientMap.set(email, {email, uid: docSnap.id, name});
      }
    }

    const entries = Array.from(recipientMap.values());
    if (entries.length === 0) {
      return {ok: true, sent: 0, failed: 0, recipientCount: 0};
    }
    if (entries.length > MAX_RECIPIENTS) {
      throw new HttpsError(
        "invalid-argument",
        `Audience too large (${entries.length}). Max ${MAX_RECIPIENTS}.`
      );
    }

    const recipients = entries.map((e) => e.email);
    const paramsPerUser: Record<string, Record<string, unknown>> = {};
    const recipientUidsByEmail: Record<string, string> = {};

    for (const entry of entries) {
      paramsPerUser[entry.email] = adminCustomAnnouncementParams({
        userEmail: entry.email,
        userName: entry.name,
        headline,
        message_body,
        sender_name,
        cta_url: cta_url ?? null,
        cta_label: cta_label ?? null,
      });
      if (entry.uid) recipientUidsByEmail[entry.email] = entry.uid;
    }

    const templateId = resolveTemplateId("admin_custom_announcement");
    const bulk = await sendBulkEmail({
      recipients,
      templateId,
      paramsPerUser,
      recipientUidsByEmail,
      tags: ["admin_custom"],
      preferenceCategory: "admin_messages",
    });

    await db.collection("email_campaigns").add({
      type: "admin_custom_announcement",
      sent_by_uid: callerUid,
      headline,
      sender_name,
      recipient_count: recipients.length,
      sent: bulk.sent,
      failed: bulk.failed,
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
