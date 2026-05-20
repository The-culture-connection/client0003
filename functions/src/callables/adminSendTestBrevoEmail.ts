/**
 * Admin-only: send one transactional email via Brevo to verify API key, sender, and template.
 * Use after storing BREVO_API_KEY in Secret Manager and creating a template in Brevo.
 */

import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {z} from "zod";
import {callableCorsAllowlist} from "../callableCorsAllowlist";
import {BREVO_API_KEY, sendEmail} from "../email/brevoClient";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

async function assertCallerIsNetworkAdmin(uid: string): Promise<void> {
  const udoc = await db.collection("users").doc(uid).get();
  const roles: string[] = Array.isArray(udoc.data()?.roles) ? (udoc.data()?.roles as string[]) : [];
  const single = udoc.data()?.role as string | undefined;
  const all = single ? [single, ...roles] : roles;
  if (!all.some((r) => r === "Admin" || r === "superAdmin")) {
    throw new HttpsError("permission-denied", "Admin or superAdmin only.");
  }
}

const requestSchema = z.object({
  to: z.string().email(),
  templateId: z.number().int().positive(),
  params: z.record(z.unknown()).optional(),
});

export const adminSendTestBrevoEmail = onCall(
  {
    region: "us-central1",
    cors: callableCorsAllowlist,
    secrets: [BREVO_API_KEY],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    await assertCallerIsNetworkAdmin(uid);

    const parsed = requestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues.map((e) => e.message).join("; ")
      );
    }

    const {to, templateId, params} = parsed.data;
    const result = await sendEmail(
      {
        to,
        templateId,
        params: params ?? {},
        tags: ["admin_test"],
        recipientUid: uid,
      }
    );

    if (!result.success) {
      throw new HttpsError(
        "internal",
        "Brevo send did not succeed. Check Functions logs and Firestore email_activity."
      );
    }

    return {
      ok: true,
      messageId: result.messageId ?? null,
      statusCode: result.statusCode,
    };
  }
);
