/**
 * Zod validation for client → `logAnalyticsEvent` callable.
 * Keep in sync with `mortarAnalyticsContract.ts` when adding client-ingestible events.
 */

import {z} from "zod";
import {
  isClientIngestibleEventName,
  SNAKE_CASE_EVENT_NAME_RE,
  type ClientIngestibleEventName,
} from "./mortarAnalyticsContract";

const primitiveProp = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const propertiesSchema = z
  .record(z.string(), primitiveProp)
  .refine((o) => Object.keys(o).length <= 48, {message: "properties must have at most 48 keys"})
  .optional();

const clientSchema = z
  .object({
    platform: z.enum(["web", "ios", "android"]),
    app_version: z.string().max(64).optional(),
    locale: z.string().max(32).optional(),
  })
  .strict();

export const logAnalyticsEventInboundSchema = z
  .object({
    event_name: z
      .string()
      .min(1)
      .max(64)
      .regex(SNAKE_CASE_EVENT_NAME_RE, {message: "event_name must be snake_case [a-z][a-z0-9_]*"})
      .refine((s): s is ClientIngestibleEventName => isClientIngestibleEventName(s), {
        message: "event_name is not an allowed client-ingestible event",
      }),
    properties: propertiesSchema,
    client: clientSchema,
    session_id: z.string().min(8).max(128).optional(),
    dedupe_key: z.string().min(4).max(128).optional(),
  })
  .strict();

export type LogAnalyticsEventInbound = z.infer<typeof logAnalyticsEventInboundSchema>;
