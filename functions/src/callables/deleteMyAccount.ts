/**
 * In-app account deletion for a signed-in user (App Store Guideline 5.1.1(v)).
 *
 * Distinct from `submitAccountDeletionRequest`, which is the *public,
 * unauthenticated* form Google Play requires and which files a ticket for staff.
 * Apple requires deletion to be initiated and completed from inside the app
 * without customer-service steps ("Only offering to temporarily deactivate or
 * disable an account is insufficient"), and the caller here is already
 * authenticated, so there is nothing to verify by email — this executes.
 *
 * What it removes matches the published policy on the web deletion page:
 * the account and profile, authored content, messages, registrations, progress
 * and per-user analytics. Payment records, moderation reports filed *about*
 * other people, and aggregate counters are deliberately retained — see
 * RETAINED below.
 *
 * Ordering is deliberate: data first, Auth user last. If a step fails the
 * caller is still signed in and can retry; deleting Auth first would strand
 * orphaned data with no way to reach it.
 */

import {getApps, initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {
  Firestore,
  Query,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {z} from "zod";
import {callableCorsAllowlist} from "../callableCorsAllowlist";

if (getApps().length === 0) {
  initializeApp();
}

const db: Firestore = getFirestore();
const auth = getAuth();

const AUDIT_COLLECTION = "account_deletion_requests";

/**
 * Typed into the confirmation field by the user, and re-checked here so a
 * mis-wired client can never delete an account by accident.
 */
const CONFIRM_PHRASE = "DELETE";

const schema = z.object({
  confirm: z.literal(CONFIRM_PHRASE),
  reason: z.string().trim().max(2000).optional(),
});

/**
 * RETAINED, and why. Everything else belonging to the user is removed.
 *
 * - `shop_orders` / `payment_orders` — financial records we are required to
 *   keep for tax and accounting.
 * - `user_reports` the user *filed about someone else* — safety records; losing
 *   them would let a bad actor erase reports against others by deleting their
 *   own account. Reports filed *against* the deleted user go, since the subject
 *   no longer exists.
 * - `analytics_raw_events` / daily + derived aggregates — already
 *   non-identifying totals, and unpickable from a shared counter.
 */

type Failure = {step: string; error: string};

/** Deletes every document a query matches, in batches. Returns the count. */
async function deleteQuery(query: Query, batchSize = 300): Promise<number> {
  let total = 0;
  for (;;) {
    const snap = await query.limit(batchSize).get();
    if (snap.empty) return total;
    const batch = db.batch();
    // recursiveDelete would be needed for docs with their own subcollections;
    // those callers use deleteDocsRecursively below instead.
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    total += snap.size;
    if (snap.size < batchSize) return total;
  }
}

/**
 * Deletes matched documents *and* their subcollections. Slower than
 * [deleteQuery], so it is reserved for parents that actually have children
 * (a feed post has likes and replies; a job listing has nothing).
 */
async function deleteDocsRecursively(query: Query, batchSize = 100): Promise<number> {
  let total = 0;
  for (;;) {
    const snap = await query.limit(batchSize).get();
    if (snap.empty) return total;
    for (const doc of snap.docs) {
      await db.recursiveDelete(doc.ref);
    }
    total += snap.size;
    if (snap.size < batchSize) return total;
  }
}

/**
 * Runs one deletion step, recording rather than throwing on failure.
 *
 * A single unreachable collection (a missing collection-group index, say) must
 * not abandon the rest of the wipe half-done — the account still has to end up
 * deleted, and whatever could not be reached is reported on the audit record
 * for staff to finish.
 */
async function step(
  failures: Failure[],
  name: string,
  run: () => Promise<number>
): Promise<number> {
  try {
    return await run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("deleteMyAccount step failed", {step: name, error: message});
    failures.push({step: name, error: message});
    return 0;
  }
}

export const deleteMyAccount = onCall(
  {region: "us-central1", cors: callableCorsAllowlist},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in to delete your account.");
    }

    const parsed = schema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        `Confirmation required: send confirm: "${CONFIRM_PHRASE}".`
      );
    }

    // Captured before the profile goes, so the audit row is still identifiable.
    let email = "";
    let displayName = "";
    try {
      const userRecord = await auth.getUser(uid);
      email = userRecord.email ?? "";
      displayName = userRecord.displayName ?? "";
    } catch {
      // No Auth record (already partly deleted) — carry on with the data wipe.
    }
    try {
      const profile = await db.collection("users").doc(uid).get();
      const data = profile.data();
      if (data) {
        email = email || (typeof data.email === "string" ? data.email : "");
        const first = typeof data.first_name === "string" ? data.first_name : "";
        const last = typeof data.last_name === "string" ? data.last_name : "";
        displayName = displayName || `${first} ${last}`.trim();
      }
    } catch {
      // Best effort only.
    }

    const failures: Failure[] = [];
    let deleted = 0;

    // ---- Authored content in shared spaces -------------------------------
    // Posts carry likes and replies of their own, so they delete recursively.
    deleted += await step(failures, "feed_posts", () =>
      deleteDocsRecursively(db.collection("feed_posts").where("author_id", "==", uid))
    );
    deleted += await step(failures, "feed_post_replies", () =>
      deleteDocsRecursively(db.collectionGroup("replies").where("author_id", "==", uid))
    );
    deleted += await step(failures, "expansion_jobs", () =>
      deleteQuery(db.collection("expansion_jobs").where("author_id", "==", uid))
    );
    deleted += await step(failures, "expansion_skills", () =>
      deleteQuery(db.collection("expansion_skills").where("author_id", "==", uid))
    );
    deleted += await step(failures, "discussion_threads", () =>
      deleteDocsRecursively(db.collection("discussion_threads").where("author_uid", "==", uid))
    );
    deleted += await step(failures, "group_threads", () =>
      deleteDocsRecursively(db.collectionGroup("threads").where("author_id", "==", uid))
    );
    deleted += await step(failures, "group_thread_comments", () =>
      deleteDocsRecursively(db.collectionGroup("comments").where("author_id", "==", uid))
    );
    deleted += await step(failures, "group_messages", () =>
      deleteQuery(db.collectionGroup("Messages").where("Senderid", "==", uid))
    );
    deleted += await step(failures, "conference_community_posts", () =>
      deleteDocsRecursively(db.collectionGroup("community_posts").where("author_id", "==", uid))
    );
    deleted += await step(failures, "session_messages", () =>
      deleteQuery(db.collectionGroup("messages").where("sender_id", "==", uid))
    );
    deleted += await step(failures, "submitted_events", () =>
      deleteQuery(db.collection("events_mobile").where("created_by", "==", uid))
    );

    // ---- Direct messages -------------------------------------------------
    // Threads are 1:1, and the published policy says messages the user sent are
    // deleted — which for a two-person thread means the thread goes.
    deleted += await step(failures, "dm_threads", () =>
      deleteDocsRecursively(
        db.collection("dm_threads").where("participant_ids", "array-contains", uid)
      )
    );

    // ---- Conference participation ---------------------------------------
    // Walked per conference rather than by collection group: `attendees` and
    // `networkingProfiles` are keyed BY uid, and `documentId()` in a collection
    // group query matches full resource paths, not bare ids — so there is no
    // collection-group query for "the doc named {uid}". Conferences are few.
    deleted += await step(failures, "conference_participation", async () => {
      const conferences = await db.collection("conferences").select().get();
      let removed = 0;
      for (const conference of conferences.docs) {
        await db.recursiveDelete(conference.ref.collection("attendees").doc(uid));
        // Recursive: the profile owns a `swipes` subcollection.
        await db.recursiveDelete(conference.ref.collection("networkingProfiles").doc(uid));
        removed += 2;
        removed += await deleteQuery(
          conference.ref.collection("matches").where("users", "array-contains", uid)
        );
        removed += await deleteQuery(
          conference.ref.collection("checkinDays").where("uids", "array-contains", uid)
        );
      }
      return removed;
    });

    // ---- Progress, applications and per-user analytics -------------------
    deleted += await step(failures, "course_progress", () =>
      deleteQuery(db.collection("courseProgress").where("userId", "==", uid))
    );
    deleted += await step(failures, "quiz_attempts", () =>
      deleteQuery(db.collection("quiz_attempts").where("user_id", "==", uid))
    );
    deleted += await step(failures, "graduation_applications", () =>
      deleteQuery(db.collection("GraduationApplications").where("userId", "==", uid))
    );
    deleted += await step(failures, "survey_responses", () =>
      deleteQuery(db.collection("survey_responses").where("user_id", "==", uid))
    );
    deleted += await step(failures, "expansion_analytics_events", () =>
      deleteQuery(db.collection("expansion_analytics_events").where("user_id", "==", uid))
    );
    deleted += await step(failures, "beta_feedback", () =>
      deleteQuery(db.collection("beta_feedback").where("user_id", "==", uid))
    );
    // Reports filed *about* this user; ones they filed about others are kept.
    deleted += await step(failures, "reports_about_user", () =>
      deleteQuery(db.collection("user_reports").where("reported_user_id", "==", uid))
    );

    // Per-user documents keyed directly by uid.
    const uidKeyed = [
      "user_analytics_summary",
      "analytics_user_badges",
      "user_badges",
      "badge_progress",
      "mission_progress",
      "matching_summary",
    ];
    for (const collection of uidKeyed) {
      deleted += await step(failures, collection, async () => {
        await db.recursiveDelete(db.collection(collection).doc(uid));
        return 1;
      });
    }

    // ---- The profile itself, and everything under it ---------------------
    // Last of the data, because it is what identifies the account: if an
    // earlier step failed, this doc is how staff finish the job.
    deleted += await step(failures, "user_profile", async () => {
      await db.recursiveDelete(db.collection("users").doc(uid));
      return 1;
    });

    // ---- Audit trail -----------------------------------------------------
    // Written before the Auth user goes, so a failure here cannot leave a
    // deleted account with no record of who asked or what was missed.
    const reference = `DEL-APP-${uid.slice(0, 6).toUpperCase()}`;
    try {
      await db.collection(AUDIT_COLLECTION).add({
        reference,
        email,
        normalized_email: email.toLowerCase(),
        display_name: displayName || null,
        reason: parsed.data.reason ?? null,
        matched_uid: uid,
        submitted_by_uid: uid,
        source: "mobile_app_self_service",
        status: failures.length > 0 ? "completed_with_errors" : "completed",
        documents_deleted: deleted,
        failures: failures.length > 0 ? failures : null,
        created_at: Timestamp.now(),
        handled_at: Timestamp.now(),
        handled_by_uid: null,
        staff_notes:
          failures.length > 0 ?
            "Self-service deletion finished with errors — see `failures`." :
            "Deleted by the user from the mobile app.",
      });
    } catch (err) {
      logger.error("deleteMyAccount: audit write failed", {uid, err});
    }

    // ---- Sign-in access --------------------------------------------------
    // Revoked first so any live session dies even if the delete below fails.
    try {
      await auth.revokeRefreshTokens(uid);
    } catch (err) {
      logger.warn("deleteMyAccount: token revoke failed", {uid, err});
    }
    try {
      await auth.deleteUser(uid);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("deleteMyAccount: auth delete failed", {uid, error: message});
      // The account must not survive this call. Surfacing the failure lets the
      // app keep the user on the confirmation screen and tell them to retry,
      // rather than reporting success over a still-usable login.
      throw new HttpsError(
        "internal",
        "We removed your data but could not finish deleting your sign-in. " +
          "Please try again, or contact masters@wearemortar.com."
      );
    }

    logger.info("account self-deleted", {reference, deleted, failures: failures.length});
    return {ok: true, reference, documentsDeleted: deleted};
  }
);
