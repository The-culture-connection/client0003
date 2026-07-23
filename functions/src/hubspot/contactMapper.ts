/**
 * Maps a Firestore `users/{uid}` document to a HubSpot contact upsert input.
 *
 * v1 property set (see docs/HUBSPOT_INTEGRATION_PLAN.md §2.2):
 * standard: email, firstname, lastname, city, state
 * custom:   mortar_uid, mortar_roles, mortar_onboarding_status,
 *           mortar_membership_status, mortar_profile_completed,
 *           mortar_in_cohort, mortar_industry, mortar_signup_date,
 *           mortar_email_opt_out_all
 *
 * Rules:
 * - MORTAR-owned `mortar_*` properties are ALWAYS sent (empty string clears),
 *   because HubSpot doesn't support partial upserts with idProperty=email and
 *   MORTAR is the source of truth for these fields.
 * - Standard HubSpot properties (firstname, city, ...) are only sent when
 *   non-empty, so manual CRM edits to those aren't blanked by the sync.
 */

import {Timestamp} from "firebase-admin/firestore";
import type {HubspotContactInput} from "./hubspotClient";

/**
 * Firestore role string -> HubSpot `mortar_roles` option internal name.
 * Options are defined in HubSpot (plan §2.2.1). Unknown roles are skipped
 * (logged by the caller) rather than failing the contact.
 */
export const HUBSPOT_ROLE_OPTION_BY_FIRESTORE_ROLE: Record<string, string> = {
  "Admin": "admin",
  "superAdmin": "superadmin",
  "Digital Curriculum Students": "digital_curriculum_students",
  "Digital Curriculum Alumni": "digital_curriculum_alumni",
  "In Person Curriculum Students": "in_person_curriculum_students",
  "In Person Curriculum Alumni": "in_person_curriculum_alumni",
};

/** Valid dropdown values in HubSpot; anything else is sent as empty. */
const ONBOARDING_STATUS_OPTIONS = new Set(["needs_profile", "partial", "complete"]);
const MEMBERSHIP_STATUS_OPTIONS = new Set(["active", "removed"]);

export type MapUserResult = {
  input: HubspotContactInput;
  unknownRoles: string[];
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_SHAPE_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
/** Non-routable TLDs HubSpot rejects with INVALID_EMAIL (one bad row 400s the whole batch). */
const NON_ROUTABLE_TLDS = new Set(["local", "test", "invalid", "example", "localhost"]);

/**
 * True when HubSpot will accept this address as a contact email.
 * Seed/test fixtures like `seed.mock.u0@mortar-dev.local` fail this check.
 */
export function isHubspotSyncableEmail(email: string): boolean {
  if (!EMAIL_SHAPE_RE.test(email)) return false;
  const tld = email.slice(email.lastIndexOf(".") + 1).toLowerCase();
  return !NON_ROUTABLE_TLDS.has(tld);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolString(value: unknown): string {
  return value === true ? "true" : "false";
}

/**
 * HubSpot `date` properties require midnight-UTC millisecond timestamps.
 */
function toUtcMidnightMs(value: unknown): string {
  let ms = 0;
  if (value instanceof Timestamp) {
    ms = value.toMillis();
  } else if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as {toMillis?: unknown}).toMillis === "function"
  ) {
    ms = (value as {toMillis: () => number}).toMillis();
  } else if (typeof value === "number") {
    ms = value;
  }
  if (!ms || !Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return String(midnight);
}

/**
 * Map one user document to a batch-upsert input.
 * Returns null when the user has no usable email (nothing to key on).
 *
 * @param uid Firestore document id (authoritative uid).
 * @param data The `users/{uid}` document data.
 */
export function mapUserToHubspotContact(
  uid: string,
  data: Record<string, unknown>
): MapUserResult | null {
  const email = normalizeEmail(asString(data.email));
  if (!email || !isHubspotSyncableEmail(email)) return null;

  const properties: Record<string, string> = {};

  // --- Standard HubSpot properties: only when non-empty ---
  const firstName = asString(data.first_name);
  const lastName = asString(data.last_name);
  const displayName = asString(data.display_name);
  const fallbackFirst = !firstName && displayName ? displayName.split(/\s+/)[0] : "";
  const fallbackLast =
    !lastName && displayName ? displayName.split(/\s+/).slice(1).join(" ") : "";
  const city = asString(data.city);
  const state = asString(data.state);

  if (firstName || fallbackFirst) properties.firstname = firstName || fallbackFirst;
  if (lastName || fallbackLast) properties.lastname = lastName || fallbackLast;
  if (city) properties.city = city;
  if (state) properties.state = state;

  // --- MORTAR-owned properties: always sent ---
  properties.mortar_uid = uid;

  const rawRoles = Array.isArray(data.roles) ? (data.roles as unknown[]) : [];
  const unknownRoles: string[] = [];
  const roleOptions: string[] = [];
  for (const r of rawRoles) {
    const role = asString(r);
    if (!role) continue;
    const option = HUBSPOT_ROLE_OPTION_BY_FIRESTORE_ROLE[role];
    if (option) {
      if (!roleOptions.includes(option)) roleOptions.push(option);
    } else {
      unknownRoles.push(role);
    }
  }
  // Multi-checkbox values are semicolon-separated option internal names.
  properties.mortar_roles = roleOptions.join(";");

  const onboarding = asString(data.onboarding_status);
  properties.mortar_onboarding_status = ONBOARDING_STATUS_OPTIONS.has(onboarding) ?
    onboarding :
    "";

  const membership =
    typeof data.membership === "object" && data.membership !== null ?
      (data.membership as Record<string, unknown>) :
      {};
  const membershipStatus = asString(membership.status);
  properties.mortar_membership_status = MEMBERSHIP_STATUS_OPTIONS.has(membershipStatus) ?
    membershipStatus :
    "";

  properties.mortar_profile_completed = asBoolString(data.profile_completed);
  properties.mortar_in_cohort = asBoolString(data.not_in_cohort !== true);
  properties.mortar_industry = asString(data.industry);
  properties.mortar_signup_date = toUtcMidnightMs(data.created_at);
  properties.mortar_email_opt_out_all = asBoolString(data.email_opt_out_all);

  return {
    input: {idProperty: "email", id: email, properties},
    unknownRoles,
  };
}
