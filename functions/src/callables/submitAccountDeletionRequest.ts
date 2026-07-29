/**
 * Account & data deletion requests (Google Play compliance).
 *
 * Play requires a publicly reachable page where someone can request deletion
 * *without* signing in or having the app installed — so this callable is
 * deliberately unauthenticated. It therefore treats its input as untrusted and
 * never reveals whether the supplied address belongs to a real account:
 * confirming that would turn the endpoint into an account-existence oracle for
 * anyone on the internet.
 *
 * Deletion is not performed here. The request is recorded for staff to action,
 * which keeps a human in the loop for financial records and abuse holds.
 */

import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {z} from "zod";
import {callableCorsAllowlist} from "../callableCorsAllowlist";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const COLLECTION = "account_deletion_requests";

const requestSchema = z.object({
  email: z.string().trim().email().max(320),
  reason: z.string().trim().max(2000).optional(),
  /** Free-text the requester gives so staff can find them if the email differs. */
  display_name: z.string().trim().max(200).optional(),
});

/**
 * Human-quotable reference, e.g. "DEL-7Q2M4X". Ambiguous characters (0/O, 1/I)
 * are excluded because people read these over the phone.
 */
function makeReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `DEL-${out}`;
}

export const submitAccountDeletionRequest = onCall(
  {region: "us-central1", invoker: "public", cors: callableCorsAllowlist},
  async (request) => {
    const parsed = requestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        "Enter a valid email address so we can identify your account."
      );
    }

    const {email, reason, display_name} = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Collapse repeat submissions: re-submitting returns the original reference
    // rather than opening a second ticket for the same person.
    const existing = await db
      .collection(COLLECTION)
      .where("normalized_email", "==", normalizedEmail)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existing.empty) {
      return {
        ok: true,
        reference: existing.docs[0].data().reference ?? existing.docs[0].id,
        duplicate: true,
      };
    }

    // Resolve the uid when one exists, purely so staff have it to act on. The
    // result is never returned to the caller (see the oracle note above).
    let matchedUid: string | null = null;
    try {
      const userMatch = await db
        .collection("users")
        .where("email", "==", normalizedEmail)
        .limit(1)
        .get();
      if (!userMatch.empty) matchedUid = userMatch.docs[0].id;
    } catch (err) {
      // A lookup failure must not block the request being recorded.
      logger.warn("deletion request: user lookup failed", {err});
    }

    const reference = makeReference();
    await db.collection(COLLECTION).add({
      reference,
      email,
      normalized_email: normalizedEmail,
      display_name: display_name ?? null,
      reason: reason ?? null,
      matched_uid: matchedUid,
      // Signed in when submitting? Recorded, but never trusted as proof.
      submitted_by_uid: request.auth?.uid ?? null,
      status: "pending",
      created_at: Timestamp.now(),
      handled_at: null,
      handled_by_uid: null,
      staff_notes: null,
    });

    logger.info("account deletion request recorded", {reference, hasAccount: !!matchedUid});

    // Identical response whether or not an account matched.
    return {ok: true, reference, duplicate: false};
  }
);
