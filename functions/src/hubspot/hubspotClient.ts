/**
 * HubSpot API client for the nightly contact sync.
 *
 * Mirrors the Brevo client pattern: Secret Manager token, fetch with retry,
 * and activity logging to Firestore (`hubspot_sync_activity`).
 *
 * Docs: POST https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert
 * - Max 100 inputs per call.
 * - With idProperty=email, partial upserts are NOT supported — always send
 *   the full set of MORTAR-owned properties (contactMapper does this).
 */

import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {defineSecret} from "firebase-functions/params";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const HUBSPOT_BATCH_UPSERT_URL =
  "https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert";
const SYNC_ACTIVITY_COLLECTION = "hubspot_sync_activity";

/** HubSpot caps CRM batch endpoints at 100 inputs per request. */
export const HUBSPOT_BATCH_LIMIT = 100;

/** Attach this secret to function options: `{secrets: [HUBSPOT_PRIVATE_APP_TOKEN]}` */
export const HUBSPOT_PRIVATE_APP_TOKEN = defineSecret("HUBSPOT_PRIVATE_APP_TOKEN");

type JsonObject = Record<string, unknown>;

export type HubspotContactInput = {
  idProperty: "email";
  id: string;
  properties: Record<string, string>;
};

export type BatchUpsertResult = {
  ok: boolean;
  statusCode: number;
  upserted: number;
  errorMessage?: string;
};

function resolveHubspotToken(explicitToken?: string): string {
  const fromArg = explicitToken?.trim();
  if (fromArg) return fromArg;

  const fromEnv = process.env.HUBSPOT_PRIVATE_APP_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  throw new Error(
    "Missing HubSpot token. Attach Secret Manager secret HUBSPOT_PRIVATE_APP_TOKEN to the function runtime."
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

async function logSyncActivity(params: {
  action: string;
  status: "success" | "failed";
  batchSize?: number;
  statusCode?: number;
  errorMessage?: string;
  details?: JsonObject;
}): Promise<void> {
  try {
    await db.collection(SYNC_ACTIVITY_COLLECTION).add({
      provider: "hubspot",
      action: params.action,
      status: params.status,
      batch_size: params.batchSize ?? null,
      status_code: params.statusCode ?? null,
      error_message: params.errorMessage ?? null,
      details: params.details ?? null,
      created_at: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    // Activity logging must never break the sync itself.
    logger.warn("hubspot_sync_activity write failed", {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function postHubspot(
  url: string,
  payload: JsonObject,
  token: string,
  maxAttempts = 3
): Promise<{statusCode: number; body: JsonObject | string}> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "authorization": `Bearer ${token}`,
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
        // Honor Retry-After on 429 when present (seconds).
        const retryAfterSec = Number(res.headers.get("retry-after") ?? "0");
        const backoffMs = retryAfterSec > 0 ? retryAfterSec * 1000 : 500 * attempt;
        await sleep(backoffMs);
        continue;
      }

      return {statusCode: res.status, body: parsed};
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxAttempts && shouldRetry(0, lastError.message)) {
        await sleep(500 * attempt);
        continue;
      }
      break;
    }
  }

  throw new Error(
    `HubSpot request failed after retries: ${lastError?.message ?? "unknown error"}`
  );
}

/**
 * Upsert up to HUBSPOT_BATCH_LIMIT contacts by email.
 * Fails soft: returns ok=false rather than throwing, so one bad batch
 * never kills a whole sync run.
 */
export async function batchUpsertContacts(
  inputs: HubspotContactInput[],
  options?: {token?: string}
): Promise<BatchUpsertResult> {
  if (inputs.length === 0) {
    return {ok: true, statusCode: 0, upserted: 0};
  }
  if (inputs.length > HUBSPOT_BATCH_LIMIT) {
    throw new Error(
      `batchUpsertContacts received ${inputs.length} inputs; max is ${HUBSPOT_BATCH_LIMIT}. Chunk before calling.`
    );
  }

  const token = resolveHubspotToken(options?.token);

  try {
    const {statusCode, body} = await postHubspot(
      HUBSPOT_BATCH_UPSERT_URL,
      {inputs},
      token
    );

    // 200 = all done; 207 = multi-status (some rows may have errored).
    const ok = statusCode === 200 || statusCode === 201 || statusCode === 207;
    const bodyObj = typeof body === "object" && body !== null ? body : {};
    const results = Array.isArray(bodyObj["results"]) ?
      (bodyObj["results"] as unknown[]) :
      [];
    const errors = Array.isArray(bodyObj["errors"]) ?
      (bodyObj["errors"] as JsonObject[]) :
      [];
    const errorMessage = !ok ?
      (typeof body === "string" ? body : String(bodyObj["message"] ?? `HTTP ${statusCode}`)) :
      errors.length > 0 ?
        `${errors.length} row(s) rejected: ${String(errors[0]?.["message"] ?? "unknown")}` :
        undefined;

    await logSyncActivity({
      action: "batch_upsert_contacts",
      status: ok ? "success" : "failed",
      batchSize: inputs.length,
      statusCode,
      errorMessage,
      details: {result_count: results.length, error_count: errors.length},
    });

    if (!ok) {
      logger.error("HubSpot batch upsert failed", {
        statusCode,
        batchSize: inputs.length,
        error: errorMessage,
      });
    } else if (errors.length > 0) {
      logger.warn("HubSpot batch upsert partial errors", {
        statusCode,
        batchSize: inputs.length,
        errorCount: errors.length,
      });
    }

    return {
      ok,
      statusCode,
      upserted: ok ? (results.length > 0 ? results.length : inputs.length) : 0,
      errorMessage,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await logSyncActivity({
      action: "batch_upsert_contacts",
      status: "failed",
      batchSize: inputs.length,
      errorMessage: err,
    });
    logger.error("HubSpot batch upsert threw", {batchSize: inputs.length, error: err});
    return {ok: false, statusCode: 0, upserted: 0, errorMessage: err};
  }
}
