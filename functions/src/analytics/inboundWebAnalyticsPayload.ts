/**
 * Zod validation for client → `ingestWebAnalytics` callable.
 */

import { z } from "zod";
import {
  isWebAnalyticsEventName,
  SNAKE_CASE_EVENT_NAME_RE,
  type WebAnalyticsEventName,
} from "./mortarAnalyticsContract";

const primitiveProp = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const propertiesSchema = z
  .record(z.string(), primitiveProp)
  .refine((o) => Object.keys(o).length <= 48, { message: "properties must have at most 48 keys" })
  .optional();

const clientSchema = z
  .object({
    platform: z.enum(["web", "ios", "android"]),
    app_version: z.string().max(64).optional(),
    locale: z.string().max(32).optional(),
  })
  .strict();

export const ingestWebAnalyticsInboundSchema = z
  .object({
    event_name: z
      .string()
      .min(1)
      .max(64)
      .regex(SNAKE_CASE_EVENT_NAME_RE, { message: "event_name must be snake_case [a-z][a-z0-9_]*" })
      .refine((s): s is WebAnalyticsEventName => isWebAnalyticsEventName(s), {
        message: "event_name is not an approved web analytics event",
      }),
    properties: propertiesSchema,
    client: clientSchema,
    session_id: z.string().min(8).max(128).optional(),
    screen_session_id: z.string().min(8).max(128).nullable().optional(),
    route_path: z.string().max(2048).nullable().optional(),
    screen_name: z.string().max(128).nullable().optional(),
    client_timestamp_ms: z.number().int().min(0).max(4102444800000).optional(),
    dedupe_key: z.string().min(4).max(128).optional(),
  })
  .strict();

export type IngestWebAnalyticsInbound = z.infer<typeof ingestWebAnalyticsInboundSchema>;
