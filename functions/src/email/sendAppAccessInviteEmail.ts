import * as logger from "firebase-functions/logger";
import {appAccessCodeInviteParams} from "./buildEmailParams";
import {sendTransactionalEmail} from "./sendTransactionalEmail";

export async function sendAppAccessInviteEmail(input: {
  to: string;
  inviteCode: string;
  expiresAt: Date;
  recipientUid?: string;
  firstName?: string;
  sendEmail?: boolean;
}): Promise<{sent: boolean}> {
  if (input.sendEmail === false) {
    return {sent: false};
  }

  const params = appAccessCodeInviteParams({
    email: input.to,
    first_name: input.firstName,
    invite_code: input.inviteCode,
    expires_at: input.expiresAt,
  });

  const result = await sendTransactionalEmail("app_access_code_invite", {
    to: input.to,
    recipientUid: input.recipientUid,
    params,
    preferenceCategory: "admin_messages",
  });

  if (!result.sent) {
    logger.warn("App access invite email not sent", {
      to: input.to,
      skipped: result.skipped,
    });
  }
  return {sent: result.sent};
}
