/**
 * Prepares client → `ingestWebAnalytics` data so Zod/Firebase serialization never sees
 * `undefined` inside `properties` (Zod only allows string | number | boolean | null).
 */

import type { IngestWebAnalyticsRequest } from "@mortar/analytics-contract/mortarAnalyticsContract";

const LOCALE_MAX = 32;

export function prepareIngestWebAnalyticsRequest(body: IngestWebAnalyticsRequest): IngestWebAnalyticsRequest {
  const clone = JSON.parse(JSON.stringify(body)) as IngestWebAnalyticsRequest;
  if (clone.properties) {
    const next: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(clone.properties)) {
      if (v === undefined) continue;
      if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        next[k] = v;
      }
    }
    clone.properties = Object.keys(next).length ? next : {};
  }
  if (clone.client?.locale && clone.client.locale.length > LOCALE_MAX) {
    clone.client = { ...clone.client, locale: clone.client.locale.slice(0, LOCALE_MAX) };
  }
  return clone;
}
