import {Timestamp} from "firebase-admin/firestore";
import {
  ADMITTED_ALUMNI_NEXT_STEPS,
  DEFAULT_COURSE_BENEFIT,
  DEFAULT_COURSE_DISPLAY_NAME,
  DEFAULT_EXPANSION_APP_NAME,
  DEFAULT_EXPANSION_REDEEM_URL,
  DEFAULT_PLATFORM_URL,
  DEFAULT_SCHEDULE_HOURS,
  DEFAULT_SUPPORT_EMAIL,
} from "./emailConfig";
import type {CourseEmailContext} from "./resolveCourseEmailContext";
import {formatMeetingTimeLabel} from "../helpers/formatDateTime";

type JsonObject = Record<string, unknown>;

export function firstNameFrom(userName?: string | null, email?: string | null): string {
  const name = userName?.trim();
  // A stored "name" that is actually an email address must not be greeted
  // verbatim ("Hi jane.doe@example.com") — treat it as missing.
  if (name && !name.includes("@")) {
    const part = name.split(/\s+/)[0];
    if (part) return part;
  }
  const em = email?.trim();
  if (em && em.includes("@")) {
    const local = em.split("@")[0];
    if (local) return local;
  }
  return "there";
}

/**
 * Resolve a user's display name from their Firestore `users/{uid}` doc.
 * Onboarding stores `first_name`/`last_name`; `displayName`/`name` are legacy.
 */
export function displayNameFromUserDoc(
  data: Record<string, unknown> | undefined | null
): string | undefined {
  if (!data) return undefined;
  const first = typeof data.first_name === "string" ? data.first_name.trim() : "";
  const last = typeof data.last_name === "string" ? data.last_name.trim() : "";
  const full = [first, last].filter(Boolean).join(" ");
  if (full) return full;
  const dn = typeof data.displayName === "string" ? data.displayName.trim() : "";
  if (dn && !dn.includes("@")) return dn;
  const nm = typeof data.name === "string" ? data.name.trim() : "";
  if (nm && !nm.includes("@")) return nm;
  return undefined;
}

/** Deep link to the Curriculum page's Alumni Application section. */
export function graduationApplicationUrl(): string {
  const base = (sharedFooterParams().platform_url as string).replace(/\/$/, "");
  return `${base}/curriculum#alumni-application`;
}

export function sharedFooterParams(overrides?: {
  platform_url?: string;
  support_email?: string;
}): Pick<JsonObject, "platform_url" | "support_email"> {
  return {
    platform_url: overrides?.platform_url ?? DEFAULT_PLATFORM_URL,
    support_email: overrides?.support_email ?? DEFAULT_SUPPORT_EMAIL,
  };
}

export function graduationMeetingTimeSelectedParams(input: {
  first_name?: string;
  userName?: string;
  userEmail?: string;
  meeting_time: string;
  notes?: string | null;
}): JsonObject {
  return {
    first_name: input.first_name ?? firstNameFrom(input.userName, input.userEmail),
    meeting_time: formatMeetingTimeLabel(input.meeting_time),
    notes: (input.notes?.trim() || "See you at your graduation meeting."),
    application_url: graduationApplicationUrl(),
    ...sharedFooterParams(),
  };
}

export function graduationAdmittedToAlumniParams(input: {
  first_name?: string;
  userName?: string;
  userEmail?: string;
  next_steps?: string;
}): JsonObject {
  return {
    first_name: input.first_name ?? firstNameFrom(input.userName, input.userEmail),
    next_steps: input.next_steps?.trim() || ADMITTED_ALUMNI_NEXT_STEPS,
    application_url: graduationApplicationUrl(),
    ...sharedFooterParams(),
  };
}

export function graduationNotAdmittedParams(input: {
  first_name?: string;
  userName?: string;
  userEmail?: string;
  notes?: string | null;
}): JsonObject {
  return {
    first_name: input.first_name ?? firstNameFrom(input.userName, input.userEmail),
    notes: (input.notes?.trim() || "Please contact us if you have questions about this decision."),
    application_url: graduationApplicationUrl(),
    ...sharedFooterParams(),
  };
}

export function courseInactiveParams(input: {
  first_name?: string;
  userName?: string;
  userEmail?: string;
  course_name?: string;
  course_id?: string;
  resume_url?: string;
  next_lesson_name?: string;
  course_benefit?: string;
  progress_percent?: string;
  next_milestone?: string;
  time_to_next_badge?: string;
  courseContext?: CourseEmailContext;
}): JsonObject {
  const courseName = input.course_name?.trim() || DEFAULT_COURSE_DISPLAY_NAME;
  const ctx = input.courseContext;
  const base = sharedFooterParams().platform_url as string;
  const resume =
    input.resume_url?.trim() ||
    ctx?.resume_url ||
    `${base.replace(/\/$/, "")}/curriculum`;

  return {
    first_name: input.first_name ?? firstNameFrom(input.userName, input.userEmail),
    course_name: courseName,
    resume_url: resume,
    next_lesson_name: input.next_lesson_name?.trim() || ctx?.next_lesson_name || "your next lesson",
    course_benefit: input.course_benefit?.trim() || ctx?.course_benefit || DEFAULT_COURSE_BENEFIT,
    progress_percent: input.progress_percent?.trim() || ctx?.progress_percent || "0% Complete",
    next_milestone: input.next_milestone?.trim() || ctx?.next_milestone || "Your next lesson",
    time_to_next_badge: input.time_to_next_badge?.trim() || ctx?.time_to_next_badge || "30 minutes",
    ...sharedFooterParams(),
  };
}

export function mastersOnboardingWelcomeParams(input: {
  first_name?: string;
  userName?: string;
  userEmail: string;
  first_lesson_title?: string;
  start_url?: string;
  schedule_hours?: string;
  courseContext?: CourseEmailContext;
}): JsonObject {
  const shared = sharedFooterParams();
  const platformUrl = shared.platform_url as string;
  const ctx = input.courseContext;
  return {
    first_name: input.first_name ?? firstNameFrom(input.userName, input.userEmail),
    user_email: input.userEmail.trim(),
    first_lesson_title:
      input.first_lesson_title?.trim() || ctx?.first_lesson_title || "your first lesson",
    start_url: input.start_url?.trim() || ctx?.start_url || platformUrl,
    schedule_hours: input.schedule_hours?.trim() || DEFAULT_SCHEDULE_HOURS,
    ...shared,
  };
}

export function formatEventDate(date: Timestamp | Date | undefined | null, time?: string): string {
  if (!date) return time?.trim() || "See event page for date";
  const d = date instanceof Timestamp ? date.toDate() : date;
  const datePart = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const t = time?.trim();
  return t ? `${datePart} · ${t}` : datePart;
}

export function eventRegistrantParams(input: {
  first_name?: string;
  userName?: string;
  userEmail?: string;
  event_title: string;
  event_date: string;
  event_location?: string | null;
  message_body: string;
  event_id: string;
  rsvp_url?: string;
}): JsonObject {
  const base = sharedFooterParams().platform_url as string;
  return {
    first_name: input.first_name ?? firstNameFrom(input.userName, input.userEmail),
    event_title: input.event_title.trim(),
    event_date: input.event_date,
    event_location: input.event_location?.trim() || "See event page for location",
    message_body: plainMessageBody(input.message_body),
    rsvp_url:
      input.rsvp_url?.trim() ||
      `${base.replace(/\/$/, "")}/events/${input.event_id}`,
    ...sharedFooterParams(),
  };
}

/**
 * Params for an admin announcement to a conference's attendees.
 *
 * `conference_dates` and `conference_location` are pre-formatted by the caller
 * and fall back to neutral copy, because a conference can legitimately be
 * announced before its venue is locked in.
 */
export function conferenceAnnouncementParams(input: {
  first_name?: string;
  userName?: string;
  userEmail?: string;
  conference_name: string;
  conference_dates: string;
  conference_location?: string | null;
  headline: string;
  message_body: string;
  sender_name?: string | null;
  cta_url?: string | null;
  cta_label?: string | null;
}): JsonObject {
  const shared = sharedFooterParams();
  const platformUrl = shared.platform_url as string;
  return {
    first_name: input.first_name ?? firstNameFrom(input.userName, input.userEmail),
    conference_name: input.conference_name.trim(),
    conference_dates: input.conference_dates.trim() || "Dates to be announced",
    conference_location: input.conference_location?.trim() || "Location to be announced",
    headline: input.headline.trim(),
    message_body: plainMessageBody(input.message_body),
    sender_name: input.sender_name?.trim() || "MORTAR Team",
    // Default target is the web platform, so the default label must not promise
    // the mobile app. Admins can override both fields per send.
    cta_url: input.cta_url?.trim() || platformUrl,
    cta_label: input.cta_label?.trim() || "Open MORTAR",
    ...shared,
  };
}

export function adminCustomAnnouncementParams(input: {
  first_name?: string;
  userName?: string;
  userEmail?: string;
  headline: string;
  message_body: string;
  sender_name: string;
  cta_url?: string | null;
  cta_label?: string | null;
}): JsonObject {
  const shared = sharedFooterParams();
  const platformUrl = shared.platform_url as string;
  return {
    first_name: input.first_name ?? firstNameFrom(input.userName, input.userEmail),
    headline: input.headline.trim(),
    message_body: plainMessageBody(input.message_body),
    sender_name: input.sender_name.trim() || "MORTAR Team",
    cta_url: input.cta_url?.trim() || platformUrl,
    cta_label: input.cta_label?.trim() || "Open MORTAR",
    ...shared,
  };
}

function toExpiresAtDate(expires_at: Date | Timestamp | string): Date {
  if (expires_at instanceof Timestamp) return expires_at.toDate();
  if (expires_at instanceof Date) return expires_at;
  const parsed = new Date(expires_at);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Human-readable duration for "expire in …" copy (e.g. "48 hours", "14 days"). */
export function formatExpiresIn(expiresAt: Date): string {
  const ms = Math.max(0, expiresAt.getTime() - Date.now());
  const totalHours = Math.ceil(ms / 3_600_000);
  if (totalHours < 48) {
    return `${totalHours} hour${totalHours === 1 ? "" : "s"}`;
  }
  const totalDays = Math.ceil(ms / 86_400_000);
  return `${totalDays} day${totalDays === 1 ? "" : "s"}`;
}

export function appAccessCodeInviteParams(input: {
  first_name?: string;
  email: string;
  invite_code: string;
  expires_at: Date | Timestamp | string;
  app_name?: string;
  redeem_url?: string;
}): JsonObject {
  const expiresAtDate = toExpiresAtDate(input.expires_at);
  const expiresLabel = expiresAtDate.toLocaleString("en-US", {dateStyle: "medium", timeStyle: "short"});
  return {
    first_name: input.first_name ?? firstNameFrom(null, input.email),
    invite_code: input.invite_code.trim(),
    expires_at: expiresLabel,
    expires_in: formatExpiresIn(expiresAtDate),
    app_name: input.app_name?.trim() || DEFAULT_EXPANSION_APP_NAME,
    redeem_url: input.redeem_url?.trim() || DEFAULT_EXPANSION_REDEEM_URL,
    support_email: DEFAULT_SUPPORT_EMAIL,
  };
}

/**
 * Plain text for Brevo template params. Brevo escapes `{{ params.* }}` in templates,
 * so HTML tags in params render literally (e.g. visible `<p>test</p>`). Use
 * `white-space: pre-wrap` in the template body instead of injecting HTML here.
 */
export function plainMessageBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return trimmed;
}

/** @deprecated Prefer plainMessageBody for Brevo transactional templates. */
export function htmlOrPlainMessageBody(body: string): string {
  return plainMessageBody(body);
}

export function formatMoneyCents(cents: number | null | undefined, currency = "usd"): string {
  const n = Number(cents ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(n / 100);
}

function formatAddressPlain(addr: {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
} | null | undefined): string {
  if (!addr) return "—";
  const parts = [
    addr.name,
    addr.line1,
    addr.line2,
    [addr.city, addr.state, addr.postal_code].filter(Boolean).join(", "),
    addr.country,
  ].filter(Boolean);
  return parts.join("\n") || "—";
}

export function paymentShopConfirmedParams(input: {
  userEmail: string;
  userName?: string;
  order_id: string;
  order_lines_plain: string;
  amount_subtotal?: number | null;
  amount_tax?: number;
  amount_shipping?: number;
  amount_total?: number;
  currency?: string;
  shipping_address_plain?: {
    name?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
}): JsonObject {
  const currency = input.currency ?? "usd";
  return {
    first_name: firstNameFrom(input.userName, input.userEmail),
    order_id: input.order_id,
    order_lines_plain: input.order_lines_plain,
    amount_subtotal: formatMoneyCents(input.amount_subtotal, currency),
    amount_tax: formatMoneyCents(input.amount_tax, currency),
    amount_shipping: formatMoneyCents(input.amount_shipping, currency),
    amount_total: formatMoneyCents(input.amount_total, currency),
    shipping_address_plain: formatAddressPlain(input.shipping_address_plain),
    ...sharedFooterParams(),
  };
}

export function paymentEventConfirmedParams(input: {
  userEmail: string;
  userName?: string;
  order_id: string;
  event_title: string;
  event_date: string;
  event_location: string;
  event_id: string;
  amount_total?: number;
  currency?: string;
}): JsonObject {
  const base = sharedFooterParams().platform_url as string;
  return {
    first_name: firstNameFrom(input.userName, input.userEmail),
    order_id: input.order_id,
    event_title: input.event_title,
    event_date: input.event_date,
    event_location: input.event_location,
    events_url: `${base.replace(/\/$/, "")}/events/${input.event_id}`,
    amount_total: formatMoneyCents(input.amount_total, input.currency),
    ...sharedFooterParams(),
  };
}

export function conferenceTicketConfirmedParams(input: {
  userEmail: string;
  userName?: string;
  conference_name: string;
  ticket_code: string;
  conference_date: string;
  conference_location: string;
  code_active_label: string;
  order_id: string;
  amount_total?: number;
  currency?: string;
}): JsonObject {
  return {
    first_name: firstNameFrom(input.userName, input.userEmail),
    conference_name: input.conference_name,
    ticket_code: input.ticket_code,
    conference_date: input.conference_date,
    conference_location: input.conference_location,
    code_active_label: input.code_active_label,
    order_id: input.order_id,
    amount_total: formatMoneyCents(input.amount_total, input.currency),
    ...sharedFooterParams(),
  };
}

export function paymentModuleConfirmedParams(input: {
  userEmail: string;
  userName?: string;
  order_id: string;
  course_title: string;
  module_title: string;
  curriculum_url: string;
  amount_total?: number;
  currency?: string;
}): JsonObject {
  return {
    first_name: firstNameFrom(input.userName, input.userEmail),
    order_id: input.order_id,
    course_title: input.course_title,
    module_title: input.module_title,
    curriculum_url: input.curriculum_url,
    amount_total: formatMoneyCents(input.amount_total, input.currency),
    ...sharedFooterParams(),
  };
}

export function shopFulfillmentUpdateParams(input: {
  userEmail: string;
  userName?: string;
  order_id: string;
  fulfillment_status: string;
  tracking_line: string;
  order_lines_plain: string;
}): JsonObject {
  const base = sharedFooterParams().platform_url as string;
  return {
    first_name: firstNameFrom(input.userName, input.userEmail),
    order_id: input.order_id,
    fulfillment_status: input.fulfillment_status,
    tracking_line: input.tracking_line,
    order_lines_plain: input.order_lines_plain,
    shop_url: `${base.replace(/\/$/, "")}/shop`,
    ...sharedFooterParams(),
  };
}

export function adminRoleGrantedParams(input: {
  userEmail: string;
  userName?: string;
  role: string;
  granted_by_name: string;
}): JsonObject {
  return {
    first_name: firstNameFrom(input.userName, input.userEmail),
    role: input.role,
    granted_by_name: input.granted_by_name,
    ...sharedFooterParams(),
  };
}
