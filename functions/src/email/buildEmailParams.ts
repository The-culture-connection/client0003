import {Timestamp} from "firebase-admin/firestore";
import {
  ADMITTED_ALUMNI_NEXT_STEPS,
  DEFAULT_COURSE_DISPLAY_NAME,
  DEFAULT_EXPANSION_APP_NAME,
  DEFAULT_EXPANSION_REDEEM_URL,
  DEFAULT_PLATFORM_URL,
  DEFAULT_SUPPORT_EMAIL,
} from "./emailConfig";
import {formatMeetingTimeLabel} from "../helpers/formatDateTime";

type JsonObject = Record<string, unknown>;

export function firstNameFrom(userName?: string | null, email?: string | null): string {
  const name = userName?.trim();
  if (name) {
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
}): JsonObject {
  const courseName = input.course_name?.trim() || DEFAULT_COURSE_DISPLAY_NAME;
  const base = sharedFooterParams().platform_url as string;
  const resume =
    input.resume_url?.trim() ||
    `${base.replace(/\/$/, "")}/curriculum`;

  return {
    first_name: input.first_name ?? firstNameFrom(input.userName, input.userEmail),
    course_name: courseName,
    resume_url: resume,
    ...sharedFooterParams(),
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
    sender_name: input.sender_name.trim() || "Mortar Team",
    cta_url: input.cta_url?.trim() || platformUrl,
    cta_label: input.cta_label?.trim() || "Open Mortar",
    ...shared,
  };
}

export function appAccessCodeInviteParams(input: {
  first_name?: string;
  email: string;
  invite_code: string;
  expires_at: Date | Timestamp | string;
  app_name?: string;
  redeem_url?: string;
}): JsonObject {
  let expiresLabel: string;
  if (input.expires_at instanceof Timestamp) {
    expiresLabel = input.expires_at.toDate().toLocaleString("en-US", {dateStyle: "medium", timeStyle: "short"});
  } else if (input.expires_at instanceof Date) {
    expiresLabel = input.expires_at.toLocaleString("en-US", {dateStyle: "medium", timeStyle: "short"});
  } else {
    expiresLabel = String(input.expires_at);
  }
  return {
    first_name: input.first_name ?? firstNameFrom(null, input.email),
    invite_code: input.invite_code.trim(),
    expires_at: expiresLabel,
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
