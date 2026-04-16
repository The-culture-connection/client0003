/**
 * Must NOT typecheck — invalid event_name (not snake_case / not in contract).
 * Run expecting tsc exit code !== 0.
 */
import type {LogAnalyticsEventRequest} from "../src/analytics/mortarAnalyticsContract";

const _invalid: LogAnalyticsEventRequest = {
  event_name: "BadCamelCase",
  client: {platform: "web"},
};

void _invalid;
