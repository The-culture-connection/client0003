/**
 * Must typecheck (valid LogAnalyticsEventRequest shape).
 * Run: npx tsc --noEmit --strict ... scripts/analytics-typecheck-positive.ts
 */
import type {LogAnalyticsEventRequest} from "../src/analytics/mortarAnalyticsContract";
import {ANALYTICS_EVENTS} from "../src/analytics/mortarAnalyticsContract";

const _valid: LogAnalyticsEventRequest = {
  event_name: ANALYTICS_EVENTS.PAGE_VIEW,
  client: {platform: "web"},
  properties: {route: "/test"},
};

void _valid;
