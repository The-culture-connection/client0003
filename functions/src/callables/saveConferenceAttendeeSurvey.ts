/**
 * Authenticated: store the registration survey an attendee fills in before checkout.
 *
 * Written to `conferences/{conferenceId}/attendee_profiles/{uid}` at submit time —
 * *before* Stripe, not after fulfillment — so the attendee shows up in the admin
 * "Attendee activity" table the moment they answer, whether or not they go on to
 * pay. Whether they made it in is derived from `attendees/{uid}` at read time
 * rather than stored here, so it cannot go stale.
 *
 * Answers are also mirrored onto `users/{uid}` (see SURVEY_TO_USER_PROFILE) so the
 * next registration autofills the fields the curriculum profile never collected.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import {
  ANNUAL_GROSS_INCOME_OPTIONS,
  ATTENDEE_SURVEY_KEYS,
  CONFERENCE_ATTENDEE_PROFILES,
  EDUCATION_LEVEL_OPTIONS,
  SURVEY_TO_USER_PROFILE,
  SURVEY_TO_USER_PROFILE_IF_EMPTY,
} from "../conferenceAttendeeSurveyContract";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/** Generous ceiling — the form caps input length client-side; this is the backstop. */
const MAX_ANSWER_LEN = 300;

const required = z.string().min(1).max(MAX_ANSWER_LEN);
/**
 * Demographic questions accept "Prefer not to say", but an attendee who closes the
 * dropdown without choosing still has to pick something — the form enforces that.
 * Kept as free strings rather than enums so a self-described answer survives.
 */
const requiredChoice = z.string().min(1).max(MAX_ANSWER_LEN);

const schema = z.object({
  conference_id: z.string().min(1),
  answers: z.object({
    company_name: required,
    title: required,
    home_address: required,
    city: required,
    state: required,
    zip_code: required,
    email: z.string().min(3).max(MAX_ANSWER_LEN).email(),
    heard_about_us: required,
    phone_number: required,
    race_ethnicity: requiredChoice,
    gender: requiredChoice,
    annual_gross_income: z.enum(ANNUAL_GROSS_INCOME_OPTIONS),
    education_level: z.enum(EDUCATION_LEVEL_OPTIONS),
  }),
});

function trimmed(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export const saveConferenceAttendeeSurvey = onCall(
  { region: "us-central1", cors: callableCorsAllowlist },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const parsed = schema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    const { conference_id: conferenceId, answers } = parsed.data;

    const conferenceRef = db.collection("conferences").doc(conferenceId);
    const conferenceSnap = await conferenceRef.get();
    if (!conferenceSnap.exists) {
      throw new HttpsError("not-found", "That conference no longer exists.");
    }

    // Normalize once; every downstream write reads from here.
    const clean: Record<string, string> = {};
    for (const key of ATTENDEE_SURVEY_KEYS) {
      clean[key] = trimmed((answers as Record<string, unknown>)[key]);
    }

    const profileRef = conferenceRef
      .collection(CONFERENCE_ATTENDEE_PROFILES)
      .doc(uid);

    const [existing, userSnap] = await Promise.all([
      profileRef.get(),
      db.collection("users").doc(uid).get(),
    ]);
    const userData = userSnap.data() ?? {};

    const isFirstSubmission = !existing.exists;
    await profileRef.set(
      {
        ...clean,
        user_id: uid,
        conference_id: conferenceId,
        auth_email: request.auth?.token?.email ?? null,
        submission_count: FieldValue.increment(1),
        updated_at: FieldValue.serverTimestamp(),
        ...(isFirstSubmission ? { submitted_at: FieldValue.serverTimestamp() } : {}),
      },
      { merge: true }
    );

    // Mirror onto the curriculum profile so the next conference autofills.
    const userPatch: Record<string, unknown> = {};
    for (const [surveyKey, userKey] of Object.entries(SURVEY_TO_USER_PROFILE)) {
      if (clean[surveyKey]) userPatch[userKey] = clean[surveyKey];
    }
    for (const [surveyKey, userKey] of Object.entries(SURVEY_TO_USER_PROFILE_IF_EMPTY)) {
      if (clean[surveyKey] && !trimmed(userData[userKey])) {
        userPatch[userKey] = clean[surveyKey];
      }
    }
    if (Object.keys(userPatch).length > 0) {
      // Best-effort: a profile-mirror failure must not block the attendee's checkout.
      try {
        await db.collection("users").doc(uid).set(userPatch, { merge: true });
      } catch {
        // Intentionally swallowed — the survey itself is already committed.
      }
    }

    return {
      success: true,
      conference_id: conferenceId,
      user_id: uid,
      first_submission: isFirstSubmission,
    };
  }
);
