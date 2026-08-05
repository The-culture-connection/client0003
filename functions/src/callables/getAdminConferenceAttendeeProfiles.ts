/**
 * Admin-only: every registration-survey response for one conference.
 *
 * Backs the survey column, the per-attendee drawer section and the
 * "Export attendee profiles" CSV in `ConferenceAnalyticsPanel`. The field list
 * travels with the response so the web app renders columns and CSV headers from
 * the contract in `conferenceAttendeeSurveyContract.ts` instead of a second copy
 * that can drift.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import {
  ATTENDEE_SURVEY_FIELDS,
  ATTENDEE_SURVEY_KEYS,
  CONFERENCE_ATTENDEE_PROFILES,
} from "../conferenceAttendeeSurveyContract";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

/** A conference with more responses than this is well past what one CSV should carry. */
const MAX_PROFILES = 20_000;

const schema = z.object({
  conference_id: z.string().min(1),
});

function normalizeRoles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((r): r is string => typeof r === "string")
    .map((r) => r.trim().toLowerCase())
    .filter((r) => r.length > 0);
}

async function assertAnalyticsAdmin(uid: string): Promise<void> {
  const [userRecord, userDoc] = await Promise.all([
    auth.getUser(uid),
    db.collection("users").doc(uid).get(),
  ]);
  const claimRoles = normalizeRoles(userRecord.customClaims?.roles);
  const docRoles = normalizeRoles(userDoc.data()?.roles);
  const merged = new Set<string>([...claimRoles, ...docRoles]);
  if (!merged.has("admin") && !merged.has("superadmin")) {
    throw new HttpsError("permission-denied", "Admin or superAdmin only");
  }
}

function millis(v: unknown): number | null {
  return v instanceof Timestamp ? v.toMillis() : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function displayNameFrom(data: FirebaseFirestore.DocumentData | undefined): string | null {
  if (!data) return null;
  const combined = `${str(data.first_name)} ${str(data.last_name)}`.trim();
  if (combined) return combined;
  return str(data.display_name) || null;
}

export const getAdminConferenceAttendeeProfiles = onCall(
  { region: "us-central1", cors: callableCorsAllowlist },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const parsed = schema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    const tokenRoles = normalizeRoles(request.auth?.token?.roles);
    if (!tokenRoles.includes("admin") && !tokenRoles.includes("superadmin")) {
      await assertAnalyticsAdmin(callerUid);
    }

    const conferenceId = parsed.data.conference_id;
    const conferenceRef = db.collection("conferences").doc(conferenceId);

    const snap = await conferenceRef
      .collection(CONFERENCE_ATTENDEE_PROFILES)
      .orderBy("submitted_at", "asc")
      .limit(MAX_PROFILES)
      .get();

    const uids = snap.docs.map((d) => d.id);

    // Identity + "did they actually get in?" in one pass each. `getAll` caps at
    // 10 refs per call for `in`-style reads, so both go out in chunks of 10.
    const userDocs = new Map<string, FirebaseFirestore.DocumentData | undefined>();
    const hasAccess = new Set<string>();
    for (let i = 0; i < uids.length; i += 10) {
      const chunk = uids.slice(i, i + 10);
      const [users, attendees] = await Promise.all([
        db.getAll(...chunk.map((u) => db.collection("users").doc(u))),
        db.getAll(...chunk.map((u) => conferenceRef.collection("attendees").doc(u))),
      ]);
      for (const s of users) userDocs.set(s.id, s.data());
      for (const s of attendees) if (s.exists) hasAccess.add(s.id);
    }

    const profiles = snap.docs.map((doc) => {
      const d = doc.data();
      const answers: Record<string, string> = {};
      for (const key of ATTENDEE_SURVEY_KEYS) answers[key] = str(d[key]);

      const submittedMs = millis(d.submitted_at);
      const updatedMs = millis(d.updated_at);
      const userData = userDocs.get(doc.id);

      return {
        user_id: doc.id,
        display_name: displayNameFrom(userData),
        account_email: str(userData?.email) || str(d.auth_email) || null,
        answers,
        has_attendee_access: hasAccess.has(doc.id),
        submission_count:
          typeof d.submission_count === "number" ? d.submission_count : 1,
        submitted_at_ms: submittedMs,
        updated_at_ms: updatedMs,
        submitted_at_iso: submittedMs ? new Date(submittedMs).toISOString() : null,
        updated_at_iso: updatedMs ? new Date(updatedMs).toISOString() : null,
      };
    });

    return {
      success: true,
      conference_id: conferenceId,
      fields: ATTENDEE_SURVEY_FIELDS,
      profiles,
      profile_count: profiles.length,
      truncated: profiles.length >= MAX_PROFILES,
      max_profiles: MAX_PROFILES,
    };
  }
);
