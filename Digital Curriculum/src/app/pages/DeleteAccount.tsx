import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

/**
 * Public account & data deletion request page (Google Play Data safety).
 *
 * Play requires this to be reachable without signing in and without the app
 * installed, so it sits outside AuthGuard and must not depend on any logged-in
 * state. It calls an unauthenticated callable rather than writing to Firestore
 * directly, so no public write path to the collection has to exist.
 */

const SUPPORT_EMAIL = "masters@wearemortar.com";

export function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const callable = httpsCallable(functions, "submitAccountDeletionRequest");
      const res = await callable({
        email: email.trim(),
        display_name: displayName.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      const out = res.data as { reference?: string };
      setReference(out.reference ?? "");
    } catch (e: unknown) {
      setError(
        (e as { message?: string }).message ??
          "We could not submit your request. Please email us instead."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (reference) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <Card className="mx-auto max-w-2xl p-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-green-600" />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Request received
              </h1>
              <p className="mt-2 text-muted-foreground">
                Your reference is{" "}
                <span className="font-mono font-semibold text-foreground">
                  {reference}
                </span>
                . Keep it for your records.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                We will confirm your identity by email before deleting anything,
                then complete the deletion within 30 days. If you do not hear
                from us, contact{" "}
                <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>{" "}
                quoting your reference.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

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
            Delete your account and data
          </h1>
          <p className="mt-2 text-muted-foreground">
            This form covers the MORTAR Alumni Network mobile app and the MORTAR
            web platform. You do not need to be signed in, or to have the app
            installed, to use it.
          </p>
          {/* Named explicitly because Google Play requires the deletion page to
              reference the app and developer as they appear in the listing. The
              URL registered with Play is the static /delete-account.html, which
              their non-JavaScript checker can actually read — keep both in step. */}
          <p className="mt-2 text-xs text-muted-foreground">
            MORTAR Alumni Network (com.expansionnetwork.expansion_network) is
            published by MORTAR, Cincinnati, Ohio.
          </p>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground">
            What gets deleted
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Your account, sign-in credentials, and profile, including your photo</li>
            <li>Posts, comments, replies, and discussion threads you created</li>
            <li>Direct messages you sent, and your group memberships</li>
            <li>Event, conference, and session registrations, and check-in history</li>
            <li>Badges, missions, and course or quiz progress</li>
            <li>Your networking profile, matches, and connection activity</li>
            <li>Usage analytics linked to your account</li>
          </ul>

          <h2 className="mt-6 text-lg font-semibold text-foreground">
            What we keep, and why
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              <span className="text-foreground">Purchase and payment records</span> —
              retained where we are legally required to keep financial records for
              tax and accounting purposes.
            </li>
            <li>
              <span className="text-foreground">Safety and moderation records</span> —
              retained where needed to resolve a dispute, investigate a report, or
              enforce our terms.
            </li>
            <li>
              <span className="text-foreground">Aggregated statistics</span> — totals
              and counts that no longer identify you, and cannot be traced back to
              you once your account is gone.
            </li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Deletion is permanent and cannot be undone. We complete requests within
            30 days.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Request deletion
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the email address on your MORTAR account. We will email you to
            confirm it is really you before anything is deleted.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="del-email" className="text-foreground">
                Email address on the account
              </Label>
              <Input
                id="del-email"
                type="email"
                autoComplete="email"
                className="mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <Label htmlFor="del-name" className="text-foreground">
                Name on the account <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="del-name"
                className="mt-1"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Helps us find you if you signed up with a different email"
              />
            </div>

            <div>
              <Label htmlFor="del-reason" className="text-foreground">
                Anything you want us to know <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="del-reason"
                className="mt-1"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                I understand this permanently deletes my account and the data listed
                above, and that it cannot be undone.
              </span>
            </label>

            <Button
              type="button"
              disabled={submitting || !confirmed || !email.trim()}
              onClick={() => void submit()}
            >
              {submitting ? "Submitting..." : "Request deletion"}
            </Button>

            {error ? (
              <p className="text-sm text-destructive">
                {error} You can also email{" "}
                <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            ) : null}
          </div>
        </Card>

        <p className="pb-8 text-center text-sm text-muted-foreground">
          Prefer email? Write to{" "}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          with the subject &ldquo;Account deletion&rdquo;.
        </p>
      </div>
    </div>
  );
}
