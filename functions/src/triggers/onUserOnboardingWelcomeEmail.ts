import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue} from "firebase-admin/firestore";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {BREVO_API_KEY} from "../email/brevoClient";
import {mastersOnboardingWelcomeParams} from "../email/buildEmailParams";
import {DEFAULT_COURSE_ID} from "../email/emailConfig";
import {resolveCourseEmailContext} from "../email/resolveCourseEmailContext";
import {sendTransactionalEmail} from "../email/sendTransactionalEmail";

if (getApps().length === 0) {
  initializeApp();
}

function onboardingJustCompleted(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
): boolean {
  const beforeStatus = typeof before?.onboarding_status === "string" ? before.onboarding_status : "";
  const afterStatus = typeof after?.onboarding_status === "string" ? after.onboarding_status : "";
  return afterStatus === "complete" && beforeStatus !== "complete";
}

export const onUserOnboardingWelcomeEmail = onDocumentUpdated(
  {
    region: "us-central1",
    document: "users/{uid}",
    secrets: [BREVO_API_KEY],
  },
  async (event) => {
    const before = event.data?.before.data() as Record<string, unknown> | undefined;
    const after = event.data?.after.data() as Record<string, unknown> | undefined;
    if (!before || !after) return;

    if (!onboardingJustCompleted(before, after)) return;
    if (after.brevo_email_onboarding_welcome_sent_at) return;

    const uid = event.params.uid as string;
    const email =
      (typeof after.email === "string" && after.email.trim()) ||
      (typeof after.normalizedEmail === "string" && after.normalizedEmail.trim()) ||
      "";
    if (!email) {
      logger.warn("Onboarding welcome email skipped: no email on user", {uid});
      return;
    }

    const displayName =
      (typeof after.displayName === "string" && after.displayName) ||
      (typeof after.name === "string" && after.name) ||
      undefined;

    const courseContext = await resolveCourseEmailContext({
      courseId: DEFAULT_COURSE_ID,
      progress: null,
    });

    const params = mastersOnboardingWelcomeParams({
      userEmail: email,
      userName: displayName,
      courseContext,
    });

    const result = await sendTransactionalEmail("masters_onboarding_welcome", {
      to: email,
      recipientUid: uid,
      params,
      preferenceCategory: "course_nudges",
    });

    if (result.sent) {
      await event.data!.after.ref.update({
        brevo_email_onboarding_welcome_sent_at: FieldValue.serverTimestamp(),
      });
    }
  }
);
