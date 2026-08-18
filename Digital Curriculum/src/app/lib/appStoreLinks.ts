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
