/**
 * Helpers for the clickable link buttons attached to an image slide.
 *
 * These live in `lib/` rather than beside SlideLinksEditor so the learner-facing
 * LessonSlideScreen can use them without dragging the admin editor dialog (and
 * its Dialog/Input/Label dependencies) into the student bundle.
 */

import type { SlideLink } from "./curriculum";

/**
 * Schemes a slide link may use. Everything else — `javascript:`, `data:`,
 * `vbscript:` — is rejected outright rather than passed into an href. Course
 * Builder is gated on a staff claim, not super-admin, so this is not a
 * "trusted author" surface.
 */
const ALLOWED_SCHEMES = ["http:", "https:", "mailto:", "tel:"];

/**
 * Hyperlinks pulled off a source deck routinely arrive bare ("www.score.org",
 * "score.org/mentors"). Those resolve as a RELATIVE path once they hit an
 * <a href>, which sends the learner to mortarmastersonline.com/www.score.org
 * and looks exactly like a dead button.
 *
 * Returns "" for anything unusable, so callers can filter on a falsy result.
 * Slide docs come out of Firestore through an unchecked cast, so the input may
 * be undefined however the type is declared — never assume a string here.
 */
export function normalizeSlideLinkUrl(raw?: string | null): string {
  const url = (raw ?? "").trim();
  if (!url) return "";

  // An in-app route ("/curriculum") or protocol-relative URL is fine as-is.
  if (url.startsWith("/")) return url;

  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  if (schemeMatch) {
    return ALLOWED_SCHEMES.includes(`${schemeMatch[1].toLowerCase()}:`) ? url : "";
  }
  return `https://${url}`;
}

/**
 * True when the URL points at a file the learner is meant to keep.
 *
 * Deliberately URL-only: this drives the `download` attribute, and matching on
 * the label would make a button captioned "Template Gallery" save the HTML page
 * instead of navigating to it. `downloadIconFor` is the looser, cosmetic test.
 */
export function isDownloadLink(link: SlideLink): boolean {
  return /\.(pdf|docx?|xlsx?|pptx?|zip|csv|txt|rtf)(\?|#|$)/i.test(
    normalizeSlideLinkUrl(link?.url)
  );
}

/**
 * Whether to show the download icon rather than the external-link icon. Looser
 * than `isDownloadLink` because getting an icon wrong costs nothing.
 */
export function showsDownloadIcon(link: SlideLink): boolean {
  if (isDownloadLink(link)) return true;
  return /download|canvas|template|worksheet|handout/i.test(
    `${link?.label ?? ""} ${link?.url ?? ""}`
  );
}
