import { httpsCallable } from "firebase/functions";
import { startOfWeek, endOfWeek } from "date-fns";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import type { Timestamp } from "firebase/firestore";
import { functions } from "./firebase";
import type { CourseProgress } from "./courseProgress";
import type { SkillCertificate } from "./dataroom";

export type WeeklyActivityEventRow = {
  id: string;
  event_name: string;
  route_path: string | null;
  screen_name: string | null;
  created_at_ms: number | null;
  client_timestamp_ms: number | null;
  properties: Record<string, unknown>;
};

export type WeeklyActivityItem = {
  id: string;
  atMs: number;
  label: string;
  detail?: string;
  source: "analytics" | "certificate" | "course";
};

const HIDDEN_ANALYTICS_EVENTS = new Set<string>([
  WEB_ANALYTICS_EVENTS.SCREEN_SESSION_STARTED,
  WEB_ANALYTICS_EVENTS.SCREEN_SESSION_ENDED,
  WEB_ANALYTICS_EVENTS.DASHBOARD_PASSIVE_TIME_ON_SCREEN,
  WEB_ANALYTICS_EVENTS.LESSON_SURVEY_FIELD_CHANGED,
  WEB_ANALYTICS_EVENTS.LESSON_QUIZ_ANSWER_SELECTED,
  WEB_ANALYTICS_EVENTS.DATA_ROOM_FILE_SEARCH_CHANGED,
  WEB_ANALYTICS_EVENTS.DISCUSSIONS_SEARCH_CHANGED,
  WEB_ANALYTICS_EVENTS.SHOP_FILTER_CHANGED,
  WEB_ANALYTICS_EVENTS.SHOP_SIZE_CHANGED,
  WEB_ANALYTICS_EVENTS.CART_DROPDOWN_TOGGLED,
]);

const EVENT_LABELS: Record<string, string> = {
  [WEB_ANALYTICS_EVENTS.LESSON_COURSE_COMPLETED]: "Completed a course lesson path",
  [WEB_ANALYTICS_EVENTS.LESSON_QUIZ_PASSED]: "Passed a lesson quiz",
  [WEB_ANALYTICS_EVENTS.LESSON_QUIZ_FAILED]: "Quiz attempt did not pass",
  [WEB_ANALYTICS_EVENTS.LESSON_QUIZ_SUBMIT_CLICKED]: "Submitted a lesson quiz",
  [WEB_ANALYTICS_EVENTS.LESSON_SURVEY_SUBMIT_CLICKED]: "Submitted a lesson survey",
  [WEB_ANALYTICS_EVENTS.LESSON_CERTIFICATE_CREATED]: "Earned a certificate",
  [WEB_ANALYTICS_EVENTS.COURSE_DETAIL_START_LESSON_CLICKED]: "Started a lesson",
  [WEB_ANALYTICS_EVENTS.CURRICULUM_CONTINUE_CLICKED]: "Continued curriculum",
  [WEB_ANALYTICS_EVENTS.CURRICULUM_COURSE_CARD_CLICKED]: "Opened a course",
  [WEB_ANALYTICS_EVENTS.DASHBOARD_CONTINUE_LEARNING_CLICKED]: "Continued learning from dashboard",
  [WEB_ANALYTICS_EVENTS.EVENT_REGISTER_CLICKED]: "Registered for an event",
  [WEB_ANALYTICS_EVENTS.EVENT_UNREGISTER_CLICKED]: "Updated event registration",
  [WEB_ANALYTICS_EVENTS.COMMUNITY_DISCUSSION_PREVIEW_CLICKED]: "Viewed a discussion",
  [WEB_ANALYTICS_EVENTS.COMMUNITY_START_DISCUSSION_CLICKED]: "Started a discussion",
  [WEB_ANALYTICS_EVENTS.DISCUSSION_CREATE_SUBMIT_CLICKED]: "Posted a discussion",
  [WEB_ANALYTICS_EVENTS.DISCUSSION_REPLY_SUBMIT_CLICKED]: "Replied in a discussion",
  [WEB_ANALYTICS_EVENTS.DISCUSSION_LIKE_TOGGLED]: "Liked a discussion post",
  [WEB_ANALYTICS_EVENTS.GROUP_JOIN_CLICKED]: "Joined a group",
  [WEB_ANALYTICS_EVENTS.GROUP_MESSAGE_SEND_CLICKED]: "Sent a group message",
  [WEB_ANALYTICS_EVENTS.MORTAR_DM_MESSAGE_SENT]: "Sent a direct message",
  [WEB_ANALYTICS_EVENTS.SHOP_ADD_TO_CART_CLICKED]: "Added an item to cart",
  [WEB_ANALYTICS_EVENTS.DATA_ROOM_CERTIFICATE_DOWNLOAD_CLICKED]: "Downloaded a certificate",
  [WEB_ANALYTICS_EVENTS.DATA_ROOM_SURVEY_PDF_DOWNLOAD_CLICKED]: "Downloaded a survey PDF",
  [WEB_ANALYTICS_EVENTS.NOTIFICATION_ITEM_CLICKED]: "Opened a notification",
  [WEB_ANALYTICS_EVENTS.NAV_LINK_CLICKED]: "Navigated in MORTAR",
};

function humanizeEventName(eventName: string): string {
  if (EVENT_LABELS[eventName]) return EVENT_LABELS[eventName];
  return eventName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function eventDetail(eventName: string, props: Record<string, unknown>): string | undefined {
  const courseId = typeof props.course_id === "string" ? props.course_id : undefined;
  const lessonId = typeof props.lesson_id === "string" ? props.lesson_id : undefined;
  const eventId = typeof props.event_id === "string" ? props.event_id : undefined;
  const path = typeof props.path === "string" ? props.path : undefined;
  const label = typeof props.label === "string" ? props.label : undefined;
  const parts: string[] = [];
  if (label) parts.push(label);
  if (path) parts.push(path);
  if (courseId) parts.push(`Course ${courseId.slice(0, 8)}…`);
  if (lessonId) parts.push(`Lesson ${lessonId.slice(0, 8)}…`);
  if (eventId) parts.push(`Event ${eventId.slice(0, 8)}…`);
  if (parts.length === 0 && eventName === WEB_ANALYTICS_EVENTS.NAV_LINK_CLICKED) return undefined;
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function getCurrentWeekBoundsMs(now = new Date()): { weekStartMs: number; weekEndMs: number } {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  return { weekStartMs: weekStart.getTime(), weekEndMs: weekEnd.getTime() };
}

export async function fetchMyWeeklyActivityEvents(
  weekStartMs: number,
  weekEndMs: number
): Promise<WeeklyActivityEventRow[]> {
  const fn = httpsCallable(functions, "getMyWeeklyActivity");
  const res = await fn({ week_start_ms: weekStartMs, week_end_ms: weekEndMs });
  const data = res.data as { events?: WeeklyActivityEventRow[] };
  return Array.isArray(data.events) ? data.events : [];
}

function tsToMs(ts: Timestamp | undefined): number | null {
  if (!ts) return null;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  return null;
}

export function buildLocalWeeklyActivityItems(input: {
  weekStartMs: number;
  weekEndMs: number;
  certificates: SkillCertificate[];
  progressMap: Record<string, CourseProgress>;
  courseTitles: Record<string, string>;
}): WeeklyActivityItem[] {
  const items: WeeklyActivityItem[] = [];
  const inWeek = (ms: number | null) => ms != null && ms >= input.weekStartMs && ms <= input.weekEndMs;

  for (const cert of input.certificates) {
    const at = tsToMs(cert.createdAt);
    if (!inWeek(at)) continue;
    items.push({
      id: `cert-${cert.id}`,
      atMs: at!,
      label: "Certificate earned",
      detail: `${cert.skill} · ${cert.courseTitle}`,
      source: "certificate",
    });
  }

  for (const [courseId, progress] of Object.entries(input.progressMap)) {
    const completedAt = tsToMs(progress.completedAt);
    if (progress.completed && inWeek(completedAt)) {
      const title = input.courseTitles[courseId] ?? "Course";
      items.push({
        id: `course-complete-${courseId}`,
        atMs: completedAt!,
        label: "Completed a course",
        detail: title,
        source: "course",
      });
    }
  }

  return items;
}

export function analyticsRowsToWeeklyItems(rows: WeeklyActivityEventRow[]): WeeklyActivityItem[] {
  const items: WeeklyActivityItem[] = [];
  for (const row of rows) {
    if (HIDDEN_ANALYTICS_EVENTS.has(row.event_name)) continue;
    const atMs = row.created_at_ms ?? row.client_timestamp_ms;
    if (atMs == null) continue;
    items.push({
      id: `evt-${row.id}`,
      atMs,
      label: humanizeEventName(row.event_name),
      detail: eventDetail(row.event_name, row.properties),
      source: "analytics",
    });
  }
  return items;
}

export function mergeWeeklyActivityItems(
  analytics: WeeklyActivityItem[],
  local: WeeklyActivityItem[]
): WeeklyActivityItem[] {
  const byKey = new Map<string, WeeklyActivityItem>();
  for (const item of [...analytics, ...local]) {
    byKey.set(`${item.source}:${item.id}`, item);
  }
  return Array.from(byKey.values()).sort((a, b) => b.atMs - a.atMs);
}

export function summarizeWeeklyItems(items: WeeklyActivityItem[]): {
  total: number;
  learning: number;
  community: number;
  events: number;
} {
  let learning = 0;
  let community = 0;
  let events = 0;

  for (const item of items) {
    const t = item.label.toLowerCase();
    if (
      item.source === "certificate" ||
      item.source === "course" ||
      /lesson|quiz|curriculum|course|certificate|survey|learning/.test(t)
    ) {
      learning++;
    } else if (/discussion|group|message|community|direct/.test(t)) {
      community++;
    } else if (/event|registered|rsvp/.test(t)) {
      events++;
    } else {
      learning++;
    }
  }

  return { total: items.length, learning, community, events };
}
