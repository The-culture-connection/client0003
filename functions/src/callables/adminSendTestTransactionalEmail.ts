/**
 * Admin-only: send a sample transactional email for any Brevo template key.
 * Builds realistic default params server-side; optional first_name override.
 * Skips user email preference checks so staff can verify templates in any inbox.
 */

import {getApps, initializeApp} from "firebase-admin/app";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {z} from "zod";
import {callableCorsAllowlist} from "../callableCorsAllowlist";
import {assertCallerIsNetworkAdmin} from "../helpers/assertNetworkAdmin";
import {BREVO_API_KEY} from "../email/brevoClient";
import {
  adminCustomAnnouncementParams,
  appAccessCodeInviteParams,
  courseInactiveParams,
  eventRegistrantParams,
  graduationAdmittedToAlumniParams,
  graduationMeetingTimeSelectedParams,
  graduationNotAdmittedParams,
} from "../email/buildEmailParams";
import {DEFAULT_COURSE_DISPLAY_NAME} from "../email/emailConfig";
import {sendTransactionalEmail} from "../email/sendTransactionalEmail";
import {BREVO_TEMPLATE_IDS, type BrevoTemplateKey, resolveTemplateId} from "../email/brevoTemplates";

if (getApps().length === 0) {
  initializeApp();
}

const TEMPLATE_KEYS = Object.keys(BREVO_TEMPLATE_IDS) as [BrevoTemplateKey, ...BrevoTemplateKey[]];

const requestSchema = z.object({
  to: z.string().email(),
  template_key: z.enum(TEMPLATE_KEYS),
  first_name: z.string().trim().min(1).max(80).optional(),
});

function preferenceCategoryForTemplate(
  key: BrevoTemplateKey
): "course_nudges" | "graduation_updates" | "events" | "admin_messages" | undefined {
  switch (key) {
  case "course_inactive_7_days":
  case "course_inactive_14_days":
    return "course_nudges";
  case "graduation_meeting_time_selected":
  case "graduation_admitted_to_alumni":
  case "graduation_not_admitted":
    return "graduation_updates";
  case "event_announcement_to_registrants":
    return "events";
  case "admin_custom_announcement":
  case "app_access_code_invite":
    return "admin_messages";
  default:
    return undefined;
  }
}

function buildSampleParams(
  templateKey: BrevoTemplateKey,
  to: string,
  firstName?: string
): Record<string, unknown> {
  const userEmail = to;
  const userName = firstName;

  switch (templateKey) {
  case "course_inactive_7_days":
    return courseInactiveParams({
      userEmail,
      userName,
      course_name: DEFAULT_COURSE_DISPLAY_NAME,
    });
  case "course_inactive_14_days":
    return courseInactiveParams({
      userEmail,
      userName,
      course_name: DEFAULT_COURSE_DISPLAY_NAME,
    });
  case "graduation_meeting_time_selected":
    return graduationMeetingTimeSelectedParams({
      userEmail,
      userName,
      meeting_time: "3/16/2026 at 2:30 PM",
      notes: "Test graduation meeting — Mortar admin email testing panel.",
    });
  case "graduation_admitted_to_alumni":
    return graduationAdmittedToAlumniParams({
      userEmail,
      userName,
    });
  case "graduation_not_admitted":
    return graduationNotAdmittedParams({
      userEmail,
      userName,
      notes: "Test message from admin email testing panel.",
    });
  case "event_announcement_to_registrants":
    return eventRegistrantParams({
      userEmail,
      userName,
      event_title: "Mortar Networking Mixer (Test)",
      event_date: "Wed, March 16, 2026 · 6:00 PM",
      event_location: "Mortar HQ — Cincinnati, OH",
      message_body: "This is a test event announcement from the admin email testing panel.",
      event_id: "test-event-id",
    });
  case "admin_custom_announcement":
    return adminCustomAnnouncementParams({
      userEmail,
      userName,
      headline: "Test announcement from Mortar admin",
      message_body: "This is a sample custom announcement sent from the admin email testing panel.",
      sender_name: "Mortar Team",
    });
  case "app_access_code_invite":
    return appAccessCodeInviteParams({
      email: userEmail,
      first_name: firstName,
      invite_code: "TEST-INVITE-1234",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  default:
    return {};
  }
}

export const adminSendTestTransactionalEmail = onCall(
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

    await assertCallerIsNetworkAdmin(uid, {
      authToken: (request.auth?.token as Record<string, unknown> | undefined) ?? undefined,
    });

    const parsed = requestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues.map((e) => e.message).join("; ")
      );
    }

    const {to, template_key, first_name} = parsed.data;
    const params = buildSampleParams(template_key, to, first_name);
    const templateId = resolveTemplateId(template_key);

    const result = await sendTransactionalEmail(template_key, {
      to,
      params,
      tags: ["admin_test", template_key],
      preferenceCategory: preferenceCategoryForTemplate(template_key),
      skipPreferenceCheck: true,
    });

    if (!result.sent) {
      throw new HttpsError(
        "internal",
        result.skipped ??
          "Brevo send did not succeed. Check Functions logs and Firestore email_activity."
      );
    }

    return {
      ok: true,
      template_key,
      template_id: templateId,
      to,
      messageId: result.messageId ?? null,
      params,
    };
  }
);

/** List templates available for admin testing (used by web panel). */
export const adminListTestEmailTemplates = onCall(
  {
    region: "us-central1",
    cors: callableCorsAllowlist,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    await assertCallerIsNetworkAdmin(uid, {
      authToken: (request.auth?.token as Record<string, unknown> | undefined) ?? undefined,
    });

    return {
      templates: TEMPLATE_KEYS.map((key) => ({
        key,
        template_id: BREVO_TEMPLATE_IDS[key],
        preference_category: preferenceCategoryForTemplate(key) ?? null,
      })),
    };
  }
);
