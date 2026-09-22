/**
 * Store listings for THE MORTARVERSE mobile app (the Flutter Expansion Network
 * app), plus the public download page that fronts them.
 *
 * Single source of truth for the web platform — import from here rather than
 * pasting a store URL into a page, so a re-listing (new Apple ID, new Android
 * applicationId) is a one-line change. The email side has its own copy in
 * `functions/src/email/emailConfig.ts`, because Brevo templates are rendered
 * server-side and cannot import from this bundle.
 */

/** Apple App Store listing. */
export const IOS_APP_STORE_URL =
  "https://apps.apple.com/us/app/the-mortarverse/id6761732245";

/**
 * Google Play listing. The `id` query parameter must match the Flutter app's
 * `applicationId` in `ExpansionNetworkApp/expansion_network/android/app/build.gradle`.
 */
export const ANDROID_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.expansionnetwork.expansion_network";

/**
 * Public, unauthenticated download page. Safe to paste into emails, socials, QR
 * codes and printed material — keep the path stable once it is out in the world.
 */
export const GET_THE_APP_PATH = "/get-the-app";

/** Product name as it appears in the stores. */
export const MOBILE_APP_NAME = "THE MORTARVERSE";

export type MobileOs = "ios" | "android" | "other";

/**
 * Best-effort OS sniff, used only to decide which store button to lead with.
 * Both stores are always rendered, so a wrong guess costs the visitor nothing.
 */
export function detectMobileOs(userAgent?: string): MobileOs {
  const ua = (
    userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent)
  ).toLowerCase();
  if (!ua) return "other";
  if (/android/.test(ua)) return "android";
  // iPadOS 13+ reports a desktop Safari UA, so fall back to the touch-point hint.
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (
    /macintosh/.test(ua) &&
    typeof navigator !== "undefined" &&
    navigator.maxTouchPoints > 1
  ) {
    return "ios";
  }
  return "other";
}

/** Absolute URL of the download page, for emails, QR codes and share sheets. */
export function getTheAppUrl(origin?: string): string {
  const base =
    origin ?? (typeof window === "undefined" ? "" : window.location.origin);
  return `${base.replace(/\/$/, "")}${GET_THE_APP_PATH}`;
}

/**
 * Public conference ticket entry point — the URL that goes behind a QR code.
 *
 * Opens the app directly when it is installed and link verification has
 * completed; otherwise the page at this path hands off to the store. Safe for
 * printed material, so keep the path stable once it is out in the world.
 *
 * Mirrors `kTicketsPath` / `ticketsShareUrl` in the Flutter app
 * (`lib/services/deep_link_resolver.dart`). The app only acts on links whose
 * host it claims, so these two must agree.
 */
export const TICKETS_PATH = "/tickets";

/** Conference ids are Firestore document ids; bound rather than trust input. */
const CONFERENCE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Absolute ticket URL. Pass [conferenceId] to point a QR at one event; omit it
 * for the general link, which resolves to whatever is on sale when scanned.
 *
 * An unusable id is dropped rather than interpolated, so a bad value yields the
 * general link instead of a dead one.
 */
export function ticketsUrl(conferenceId?: string, origin?: string): string {
  const base = (
    origin ?? (typeof window === "undefined" ? "" : window.location.origin)
  ).replace(/\/$/, "");
  const id = conferenceId?.trim();
  if (!id || !CONFERENCE_ID_RE.test(id)) return `${base}${TICKETS_PATH}`;
  return `${base}${TICKETS_PATH}?c=${encodeURIComponent(id)}`;
}
