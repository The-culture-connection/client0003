import { Card } from "../components/ui/card";
import { ShieldCheck } from "lucide-react";

/**
 * Public child safety / CSAE standards page.
 *
 * Google Play's Child Safety Standards policy requires apps in the Social
 * category to publish standards against child sexual abuse and exploitation and
 * to register a link to them in Play Console. Like /delete-account, this must be
 * reachable without signing in, so it lives outside AuthGuard — and the URL is
 * registered with Google, so it must not change.
 */

const SAFETY_EMAIL = "masters@wearemortar.com";

export function ChildSafetyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wide">
              MORTAR
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            Child safety standards
          </h1>
          <p className="mt-2 text-muted-foreground">
            Our standards against child sexual abuse and exploitation (CSAE),
            covering THE MORTARVERSE mobile app and the MORTAR web platform.
          </p>
        </div>

        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Our commitment
          </h2>
          <p className="text-sm text-muted-foreground">
            MORTAR has zero tolerance for child sexual abuse and exploitation. We
            prohibit it absolutely, on every part of our platform, with no
            exceptions and no warnings. Any account involved in it is removed
            permanently and reported to the authorities.
          </p>
          <p className="text-sm text-muted-foreground">
            MORTAR is a professional network for adult entrepreneurs. Our services
            are intended only for people aged 18 and over, and we do not knowingly
            permit anyone under 18 to create an account. If we learn that an
            account belongs to a minor, we remove it.
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            What is prohibited
          </h2>
          <p className="text-sm text-muted-foreground">
            The following are banned outright, whether shared in a post, a comment,
            a group, a direct message, a profile, or an uploaded image:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Child sexual abuse material (CSAM) — any depiction of a minor in a
              sexual context, real, edited, drawn, or generated
            </li>
            <li>
              Sexualising, or presenting in a sexual manner, any person who is or
              appears to be a minor
            </li>
            <li>
              Grooming — building a relationship with a minor for sexual purposes,
              or attempting to arrange sexual contact with a minor
            </li>
            <li>
              Sextortion — threatening to share a person&rsquo;s intimate imagery to
              coerce them
            </li>
            <li>Trafficking of minors, and any solicitation or advertisement of it</li>
            <li>
              Promoting, normalising, glorifying, or offering to supply any of the
              above, including links to it elsewhere
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            These rules apply regardless of intent, framing, or whether the content
            is described as fictional, artistic, or satirical.
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            How to report it
          </h2>
          <p className="text-sm text-muted-foreground">
            Reporting is available inside the app to every signed-in member, and by
            email to anyone:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              <span className="text-foreground">In the app</span> — open the
              member&rsquo;s profile and choose Report, or use the report option on
              any post or reply. You can describe the problem in your own words.
            </li>
            <li>
              <span className="text-foreground">By email</span> — write to{" "}
              <a className="underline" href={`mailto:${SAFETY_EMAIL}`}>
                {SAFETY_EMAIL}
              </a>{" "}
              with the subject &ldquo;Child safety&rdquo;. You do not need a MORTAR
              account to report to us.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Reports reach our staff directly. You will never be penalised for making
            a good-faith report, and we do not tell the reported person who reported
            them.
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">
              If a child is in immediate danger, contact your local emergency
              services first.
            </span>{" "}
            In the United States you can also report directly to the National Center
            for Missing &amp; Exploited Children (NCMEC) CyberTipline at{" "}
            <a
              className="underline"
              href="https://report.cybertip.org"
              target="_blank"
              rel="noreferrer"
            >
              report.cybertip.org
            </a>{" "}
            or 1-800-843-5678.
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            How we respond
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Reports of CSAE are treated as the highest priority and reviewed
              ahead of all other reports.
            </li>
            <li>Content we identify as CSAE is removed immediately.</li>
            <li>
              The account is suspended and permanently terminated, and we act to
              prevent the person returning.
            </li>
            <li>
              We report apparent CSAM to NCMEC, and cooperate with law enforcement
              requests.
            </li>
            <li>
              We preserve the relevant records as required by law so that an
              investigation is not compromised by our own deletion.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Because of the last point, a CSAE investigation may require us to retain
            records that would otherwise be erased under an account deletion
            request.
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Legal compliance and contact
          </h2>
          <p className="text-sm text-muted-foreground">
            We comply with applicable child safety and mandatory reporting laws in
            the jurisdictions where we operate, including United States federal
            reporting obligations for apparent child sexual abuse material.
          </p>
          <p className="text-sm text-muted-foreground">
            Our designated point of contact for child safety matters, including
            enquiries from law enforcement, Google, and other platforms, is{" "}
            <a className="underline" href={`mailto:${SAFETY_EMAIL}`}>
              {SAFETY_EMAIL}
            </a>
            .
          </p>
        </Card>

        <p className="pb-8 text-center text-sm text-muted-foreground">
          MORTAR · Cincinnati, Ohio
        </p>
      </div>
    </div>
  );
}
