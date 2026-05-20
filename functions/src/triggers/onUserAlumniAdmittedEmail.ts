import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue} from "firebase-admin/firestore";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {BREVO_API_KEY} from "../email/brevoClient";
import {graduationAdmittedToAlumniParams} from "../email/buildEmailParams";
import {sendTransactionalEmail} from "../email/sendTransactionalEmail";

if (getApps().length === 0) {
  initializeApp();
}

const ALUMNI_ROLE = "Digital Curriculum Alumni";

function roleList(data: Record<string, unknown> | undefined): string[] {
  if (!data) return [];
  const roles = Array.isArray(data.roles) ? (data.roles as string[]) : [];
  const single = typeof data.role === "string" ? data.role : "";
  return single ? [single, ...roles] : roles;
}

function hasAlumniRole(roles: string[]): boolean {
  return roles.includes(ALUMNI_ROLE);
}

export const onUserAlumniAdmittedEmail = onDocumentUpdated(
  {
    region: "us-central1",
    document: "users/{uid}",
    secrets: [BREVO_API_KEY],
  },
  async (event) => {
    const before = event.data?.before.data() as Record<string, unknown> | undefined;
    const after = event.data?.after.data() as Record<string, unknown> | undefined;
    if (!before || !after) return;

    const beforeRoles = roleList(before);
    const afterRoles = roleList(after);
    if (hasAlumniRole(beforeRoles) || !hasAlumniRole(afterRoles)) {
      return;
    }

    if (after.brevo_email_admitted_sent_at) {
      return;
    }

    const uid = event.params.uid as string;
    const email =
      (typeof after.email === "string" && after.email.trim()) ||
      (typeof after.normalizedEmail === "string" && after.normalizedEmail.trim()) ||
      "";
    if (!email) {
      logger.warn("Alumni admitted email skipped: no email on user", {uid});
      return;
    }

    const displayName =
      (typeof after.displayName === "string" && after.displayName) ||
      (typeof after.name === "string" && after.name) ||
      undefined;

    const params = graduationAdmittedToAlumniParams({
      userEmail: email,
      userName: displayName,
    });

    const result = await sendTransactionalEmail("graduation_admitted_to_alumni", {
      to: email,
      recipientUid: uid,
      params,
      preferenceCategory: "graduation_updates",
    });

    if (result.sent) {
      await event.data!.after.ref.update({
        brevo_email_admitted_sent_at: FieldValue.serverTimestamp(),
      });
    }
  }
);
