import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {defineSecret} from "firebase-functions/params";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const EMAIL_ACTIVITY_COLLECTION = "email_activity";

/** Attach this secret to function options: `{secrets: [BREVO_API_KEY]}` */
export const BREVO_API_KEY = defineSecret("BREVO_API_KEY");

type JsonObject = Record<string, unknown>;

export type SendEmailInput = {
  to: string;
  recipientUid?: string;
  templateId: number;
  params?: JsonObject;
  tags?: string[];
  preferenceCategory?: "course_nudges" | "graduation_updates" | "events" | "admin_messages";
};

export type SendBulkEmailInput = {
  recipients: string[];
  templateId: number;
  paramsPerUser?: Record<string, JsonObject>;
  recipientUidsByEmail?: Record<string, string>;
  defaultParams?: JsonObject;
  tags?: string[];
  preferenceCategory?: "course_nudges" | "graduation_updates" | "events" | "admin_messages";
};

type EmailAttemptStatus = "sent" | "failed" | "skipped_preferences";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return "***";
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

function resolveBrevoApiKey(explicitApiKey?: string): string {
  const fromArg = explicitApiKey?.trim();
  if (fromArg) return fromArg;

  const fromEnv = process.env.BREVO_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  throw new Error(
    "Missing Brevo API key. Provide explicit apiKey or attach Secret Manager secret BREVO_API_KEY to function runtime."
  );
}

function shouldRetry(statusCode: number, message: string): boolean {
  if (statusCode === 429) return true;
  if (statusCode >= 500) return true;
  const m = message.toLowerCase();
  return m.includes("fetch failed") || m.includes("timeout") || m.includes("network");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function logEmailAttempt(params: {
  recipient: string;
  templateId: number;
  tags?: string[];
  status: EmailAttemptStatus;
  providerMessageId?: string;
  requestBody?: JsonObject;
  responseBody?: JsonObject | string;
  errorMessage?: string;
}): Promise<void> {
  await db.collection(EMAIL_ACTIVITY_COLLECTION).add({
    provider: "brevo",
    recipient: normalizeEmail(params.recipient),
    template_id: params.templateId,
    tags: params.tags ?? [],
    status: params.status,
    provider_message_id: params.providerMessageId ?? null,
    request_body: params.requestBody ?? null,
    response_body: params.responseBody ?? null,
    error_message: params.errorMessage ?? null,
    created_at: FieldValue.serverTimestamp(),
  });
}

type EmailPreferences = {
  email_opt_out_all?: boolean;
  email_pref_course_nudges?: boolean;
  email_pref_graduation_updates?: boolean;
  email_pref_events?: boolean;
  email_pref_admin_messages?: boolean;
};

async function resolvePreferences(
  recipientUid: string | undefined,
  recipientEmail: string
): Promise<EmailPreferences | null> {
  if (recipientUid?.trim()) {
    const snap = await db.collection("users").doc(recipientUid.trim()).get();
    return snap.exists ? (snap.data() as EmailPreferences) : null;
  }
  const byEmail = await db
    .collection("users")
    .where("email", "==", recipientEmail)
    .limit(1)
    .get();
  if (byEmail.empty) return null;
  return byEmail.docs[0].data() as EmailPreferences;
}

function preferenceKey(
  category: SendEmailInput["preferenceCategory"]
): keyof EmailPreferences | null {
  if (category === "course_nudges") return "email_pref_course_nudges";
  if (category === "graduation_updates") return "email_pref_graduation_updates";
  if (category === "events") return "email_pref_events";
  if (category === "admin_messages") return "email_pref_admin_messages";
  return null;
}

async function canSendByPreferences(
  recipientUid: string | undefined,
  recipientEmail: string,
  category: SendEmailInput["preferenceCategory"]
): Promise<boolean> {
  const prefs = await resolvePreferences(recipientUid, recipientEmail);
  if (!prefs) return true;
  if (prefs.email_opt_out_all === true) return false;
  const key = preferenceKey(category);
  if (!key) return true;
  const value = prefs[key];
  if (typeof value === "boolean") return value;
  // Default to allowed when granular preference is unset.
  return true;
}

async function postBrevoEmail(
  payload: JsonObject,
  apiKey: string,
  maxAttempts = 3
): Promise<{statusCode: number; body: JsonObject | string}> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let parsed: JsonObject | string = text;
      try {
        parsed = JSON.parse(text) as JsonObject;
      } catch {
        // keep raw text
      }

      if (res.ok) {
        return {statusCode: res.status, body: parsed};
      }

      const message = typeof parsed === "string" ?
        parsed :
        String(parsed["message"] ?? `HTTP ${res.status}`);
      if (attempt < maxAttempts && shouldRetry(res.status, message)) {
        await sleep(300 * attempt);
        continue;
      }

      return {statusCode: res.status, body: parsed};
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxAttempts && shouldRetry(0, lastError.message)) {
        await sleep(300 * attempt);
        continue;
      }
      break;
    }
  }

  throw new Error(`Brevo request failed after retries: ${lastError?.message ?? "unknown error"}`);
}

export async function sendEmail(
  input: SendEmailInput,
  options?: {apiKey?: string; sender?: {name?: string; email: string}}
): Promise<{success: boolean; messageId?: string; statusCode: number}> {
  const to = normalizeEmail(input.to);
  const canSend = await canSendByPreferences(input.recipientUid, to, input.preferenceCategory);
  if (!canSend) {
    await logEmailAttempt({
      recipient: to,
      templateId: input.templateId,
      tags: input.tags,
      status: "skipped_preferences",
      requestBody: {
        preferenceCategory: input.preferenceCategory ?? null,
      },
      errorMessage: "Skipped due to user email preferences",
    });
    logger.info("Brevo sendEmail skipped by preferences", {
      recipient: maskEmail(to),
      templateId: input.templateId,
      category: input.preferenceCategory ?? "none",
    });
    return {success: false, statusCode: 0};
  }
  const apiKey = resolveBrevoApiKey(options?.apiKey);
  const payload: JsonObject = {
    templateId: input.templateId,
    to: [{email: to}],
    params: input.params ?? {},
    tags: input.tags ?? [],
    ...(options?.sender ? {sender: options.sender} : {}),
  };

  try {
    const {statusCode, body} = await postBrevoEmail(payload, apiKey);
    const messageId = typeof body === "object" && body !== null ?
      String((body as JsonObject)["messageId"] ?? "") :
      "";
    await logEmailAttempt({
      recipient: to,
      templateId: input.templateId,
      tags: input.tags,
      status: "sent",
      providerMessageId: messageId || undefined,
      requestBody: payload,
      responseBody: body,
    });
    logger.info("Brevo sendEmail success", {
      recipient: maskEmail(to),
      templateId: input.templateId,
      statusCode,
    });
    return {success: true, messageId: messageId || undefined, statusCode};
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await logEmailAttempt({
      recipient: to,
      templateId: input.templateId,
      tags: input.tags,
      status: "failed",
      requestBody: payload,
      errorMessage: err,
    });
    logger.error("Brevo sendEmail failed", {
      recipient: maskEmail(to),
      templateId: input.templateId,
      error: err,
    });
    return {success: false, statusCode: 0};
  }
}

export async function sendBulkEmail(
  input: SendBulkEmailInput,
  options?: {apiKey?: string; sender?: {name?: string; email: string}}
): Promise<{sent: number; failed: number}> {
  const uniqueRecipients = Array.from(
    new Set(input.recipients.map(normalizeEmail).filter((x) => x.length > 0))
  );
  let sent = 0;
  let failed = 0;

  for (const recipient of uniqueRecipients) {
    const params = input.paramsPerUser?.[recipient] ?? input.defaultParams ?? {};
    // eslint-disable-next-line no-await-in-loop
    const result = await sendEmail(
      {
        to: recipient,
        recipientUid: input.recipientUidsByEmail?.[recipient],
        templateId: input.templateId,
        params,
        tags: input.tags,
        preferenceCategory: input.preferenceCategory,
      },
      options
    );
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  logger.info("Brevo sendBulkEmail finished", {
    templateId: input.templateId,
    recipientCount: uniqueRecipients.length,
    sent,
    failed,
  });
  return {sent, failed};
}
