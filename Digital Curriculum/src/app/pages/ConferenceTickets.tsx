import { useEffect, useRef, useState } from "react";
import { Card } from "../components/ui/card";
import { useScreenAnalytics } from "../analytics/useScreenAnalytics";
import { trackEvent } from "../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import {
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
  MOBILE_APP_NAME,
  detectMobileOs,
} from "../lib/appStoreLinks";

/**
 * Landing page for the conference ticket link — the URL behind the QR codes
 * ("/tickets", optionally "?c=<conferenceId>" for one specific event).
 *
 * Most visitors never see this. When the app is installed and the platform's
 * link verification has completed, the OS opens THE MORTARVERSE directly and
 * this page is skipped entirely. It exists for everyone else:
 *
 * - No app installed — the point of the page. Send them to the store.
 * - App installed but link verification not yet live (a brand-new host, or
 *   Android before it has fetched assetlinks.json) — the custom-scheme nudge
 *   below still opens the app.
 * - Desktop — nothing to open; show the stores so they can scan later.
 *
 * Public on purpose: someone standing at a conference door with no account has
 * to be able to load it. It lives outside AuthGuard alongside /get-the-app and
 * /delete-account, and must not read any logged-in state. The URL is printed on
 * physical material, so keep it stable.
 */

/** Custom scheme registered by the app (iOS CFBundleURLSchemes, Android intent-filter). */
const APP_SCHEME = "mortaralumni";

/**
 * How long to wait for the app to take over before showing the store options.
 *
 * If the scheme handoff succeeds the browser is backgrounded and the timer
 * effectively never fires; if nothing is registered it fires and the visitor
 * gets the download page. Long enough not to flash past a successful open,
 * short enough not to feel broken.
 */
const APP_OPEN_GRACE_MS = 1200;

export function ConferenceTicketsPage() {
  useScreenAnalytics("conference_tickets_link");

  const os = detectMobileOs();
  const isMobile = os === "ios" || os === "android";
  const storeUrl = os === "android" ? ANDROID_PLAY_STORE_URL : IOS_APP_STORE_URL;

  // Start in "trying" only on mobile — there is no app to open on desktop, and
  // a spinner that resolves to nothing reads as a broken page.
  const [attempting, setAttempting] = useState(isMobile);
  const attempted = useRef(false);

  const conferenceId = new URLSearchParams(window.location.search).get("c");
  const appUrl = conferenceId
    ? APP_SCHEME + "://tickets?c=" + encodeURIComponent(conferenceId)
    : APP_SCHEME + "://tickets";

  useEffect(() => {
    if (!isMobile || attempted.current) return;
    attempted.current = true;

    trackEvent(WEB_ANALYTICS_EVENTS.CONFERENCE_TICKET_LINK_OPENED, {
      os,
      is_targeted: Boolean(conferenceId),
    });

    // Best-effort handoff. If the scheme is not registered the browser either
    // does nothing or shows a dismissible error, and the grace timer below
    // reveals the store buttons — either way the visitor is not stuck.
    window.location.href = appUrl;

    const timer = window.setTimeout(() => setAttempting(false), APP_OPEN_GRACE_MS);
    return () => window.clearTimeout(timer);
    // Runs once: re-firing a scheme navigation on re-render would trap the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="text-center">
          <img
            src="/brand/red-trowell.png"
            alt=""
            aria-hidden="true"
            className="mx-auto mb-4 h-14 w-auto"
          />
          <p className="font-technical text-xs uppercase tracking-[0.2em] text-verse">
            MORTAR · Conference Center
          </p>
          <h1 className="font-headline mt-2 text-3xl font-black uppercase leading-none tracking-tight text-foreground sm:text-4xl">
            {attempting ? "Opening your tickets" : "Conference tickets"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {attempting
              ? "Handing you over to " + MOBILE_APP_NAME + "…"
              : "Conference tickets live in " +
                MOBILE_APP_NAME +
                ". Install it, open it, and the Conference Center will show you what is on sale."}
          </p>
        </div>

        {!attempting && (
          <>
            <div className="grid gap-3">
              <a
                href={storeUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  trackEvent(WEB_ANALYTICS_EVENTS.MOBILE_APP_STORE_LINK_CLICKED, {
                    store: os === "android" ? "android" : "ios",
                    is_suggested_store: true,
                  })
                }
                className="glow-brick flex items-center justify-center bg-accent px-5 py-4 font-headline text-sm font-black uppercase tracking-wider text-accent-foreground transition-all hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {isMobile
                  ? "Get " + MOBILE_APP_NAME
                  : "See " + MOBILE_APP_NAME + " in the stores"}
              </a>
              <a
                href="/get-the-app"
                className="flex items-center justify-center border border-border px-5 py-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Both download options and first-time sign-in help
              </a>
            </div>

            {isMobile && (
              <Card className="p-6">
                <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground">
                  Already have the app?
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  It should have opened automatically. If it did not,{" "}
                  <a className="underline" href={appUrl}>
                    open it now
                  </a>
                  .
                </p>
              </Card>
            )}

            <Card className="p-6">
              <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground">
                What happens next
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Install the app and sign in, or create an account.</li>
                <li>
                  The Conference Center opens on the conferences currently on
                  sale.
                </li>
                <li>
                  Pick your ticket. Free events register on the spot; paid ones
                  go through checkout.
                </li>
                <li>
                  Already registered? You will land straight on your scannable
                  member card instead.
                </li>
              </ol>
            </Card>
          </>
        )}

        <div className="space-y-2 pb-8 text-center text-xs text-muted-foreground">
          <p>
            {/* Static file, not a route — see public/privacy.html. */}
            <a className="underline" href="/privacy.html">
              Privacy policy
            </a>{" "}
            ·{" "}
            <a className="underline" href="/get-the-app">
              Get the app
            </a>
          </p>
          <p>MORTAR · Cincinnati, Ohio</p>
        </div>
      </div>
    </div>
  );
}
