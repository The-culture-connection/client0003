import * as logger from "firebase-functions/logger";
import {sendEmail, type SendEmailInput} from "./brevoClient";
import {type BrevoTemplateKey, resolveTemplateId} from "./brevoTemplates";

export function isTemplateConfigured(key: BrevoTemplateKey): boolean {
  try {
    resolveTemplateId(key);
    return true;
  } catch {
    return false;
  }
}

export async function sendTransactionalEmail(
  templateKey: BrevoTemplateKey,
  input: Omit<SendEmailInput, "templateId">
): Promise<{sent: boolean; skipped?: string; messageId?: string}> {
  if (!isTemplateConfigured(templateKey)) {
    const msg = `Brevo template "${templateKey}" is not configured (set BREVO_TPL_* or brevoTemplates.ts).`;
    logger.warn(msg, {templateKey, to: input.to});
    return {sent: false, skipped: msg};
  }

  const templateId = resolveTemplateId(templateKey);
  const result = await sendEmail({
    ...input,
    templateId,
    tags: [...(input.tags ?? []), templateKey],
  });

  return {
    sent: result.success,
    messageId: result.messageId,
    skipped: result.success ? undefined : "send_failed_or_preferences",
  };
}
