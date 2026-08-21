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
 * Public download page for THE MORTARVERSE mobile app — the one link to hand
 * out in emails, socials, QR codes and printed material.
 *
 * Public on purpose: someone who has not installed the app cannot be asked to
 * sign in first, so this lives outside AuthGuard alongside /delete-account and
 * /child-safety. It must not read any logged-in state, and the URL is meant to
 * be shared, so keep it stable.
 */

const SUPPORT_EMAIL = "masters@wearemortar.com";

/** Apple logo, drawn inline so the page has no external asset dependency. */
function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M16.365 1.43c0 1.14-.417 2.2-1.25 3.03-.996.99-2.2 1.57-3.29 1.48a3.36 3.36 0 0 1 1.28-2.98c.83-.86 2.15-1.48 3.26-1.53zM20.72 17.1c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.39 3.52-4.12 3.53-1.54.02-1.94-1-4.03-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.78-4.04-3.34C.16 15.9-.13 10.79 1.83 8.11c1.13-1.55 2.92-2.46 4.6-2.46 1.71 0 2.79 1 4.2 1 1.38 0 2.22-1 4.2-1 1.5 0 3.08.81 4.21 2.22-3.7 2.03-3.1 7.3.68 8.23z" />
    </svg>
  );
}

/** Google Play triangle, drawn inline for the same reason. */
function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="#34a853" d="M3.6 1.84 13.8 12 3.6 22.16a1.7 1.7 0 0 1-.6-1.3V3.14c0-.51.23-.98.6-1.3z" />
      <path fill="#4285f4" d="m13.8 12 3.02-3.01 3.72 2.1c.9.5.9 1.81 0 2.32l-3.72 2.1z" />
      <path fill="#fbbc04" d="M3.6 1.84a1.6 1.6 0 0 1 1.68-.06l11.54 6.5L13.8 12z" />
      <path fill="#ea4335" d="M3.6 22.16 13.8 12l3.02 3.01-11.54 6.5a1.6 1.6 0 0 1-1.68-.06z" />
    </svg>
  );
}

interface StoreButtonProps {
  href: string;
  store: "ios" | "android";
  eyebrow: string;
  label: string;
  /** The store matching the visitor's device gets the filled treatment. */
  primary: boolean;
}

function StoreButton({ href, store, eyebrow, label, primary }: StoreButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() =>
        trackEvent(WEB_ANALYTICS_EVENTS.MOBILE_APP_STORE_LINK_CLICKED, {
          store,
          is_suggested_store: primary,
        })
      }
      className={[
        "flex items-center gap-3 px-5 py-4 transition-all",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        primary
          ? "glow-brick bg-accent text-accent-foreground hover:bg-accent/90"
          : "border border-border bg-card text-foreground hover:border-accent",
      ].join(" ")}
    >
      {store === "ios" ? (
        <AppleGlyph className="h-7 w-7 shrink-0" />
      ) : (
        <PlayGlyph className="h-7 w-7 shrink-0" />
      )}
      <span className="min-w-0 text-left">
        <span className="block text-[11px] uppercase tracking-wide opacity-80">
          {eyebrow}
        </span>
        <span className="block text-base font-bold leading-tight">{label}</span>
      </span>
    </a>
  );
}

const WHAT_YOU_GET = [
  "A feed built for MORTAR founders — post wins, ask for help, hire and get hired",
  "Groups and direct messages with the people in your cohort",
  "Events and conference access, including the Conference Center",
  "Matching that puts the right operator in front of you",
] as const;

export function GetTheAppPage() {
  useScreenAnalytics("get_the_app");
  const os = detectMobileOs();

  const ios = (
    <StoreButton
      href={IOS_APP_STORE_URL}
      store="ios"
      eyebrow="Download on the"
      label="App Store"
      primary={os !== "android"}
    />
  );
  const android = (
    <StoreButton
      href={ANDROID_PLAY_STORE_URL}
      store="android"
      eyebrow="Get it on"
      label="Google Play"
      primary={os === "android"}
    />
  );

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
            MORTAR
          </p>
          <h1 className="font-headline mt-2 text-3xl font-black uppercase leading-none tracking-tight text-foreground sm:text-4xl">
            Get {MOBILE_APP_NAME}
          </h1>
          <p className="mt-3 text-muted-foreground">
            The MORTAR alumni network, in your pocket. Free to download on iPhone
            and Android.
          </p>
        </div>

        {/* Store buttons — the visitor's own platform is listed first. */}
        <div className="grid gap-3 sm:grid-cols-2">
          {os === "android" ? (
            <>
              {android}
              {ios}
            </>
          ) : (
            <>
              {ios}
              {android}
            </>
          )}
        </div>

        <Card className="p-6">
          <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground">
            What&rsquo;s inside
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {WHAT_YOU_GET.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground">
            Signing in for the first time
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Install the app from your store above.</li>
            <li>
              Open it and enter the email address MORTAR has on file for you.
            </li>
            <li>
              If you are asked for an access code, enter the code from your
              invite email.
            </li>
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">
            The alumni network is invite-only. If you have completed MORTAR
            Masters and have not received a code, email{" "}
            <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            and we will sort it out.
          </p>
        </Card>

        <div className="space-y-2 pb-8 text-center text-sm text-muted-foreground">
          <p>
            Looking for the web platform?{" "}
            <a className="underline" href="/login">
              Sign in to Digital Curriculum
            </a>
          </p>
          <p className="text-xs">
            {/* Static file, not a route — see public/privacy.html. */}
            <a className="underline" href="/privacy.html">
              Privacy policy
            </a>{" "}
            ·{" "}
            <a className="underline" href="/delete-account">
              Delete your account
            </a>{" "}
            ·{" "}
            <a className="underline" href="/child-safety">
              Child safety
            </a>
          </p>
          <p className="text-xs">MORTAR · Cincinnati, Ohio</p>
        </div>
      </div>
    </div>
  );
}
