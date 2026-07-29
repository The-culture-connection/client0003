"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Loader2, Bell, Mail } from "lucide-react";

/**
 * Admin announcement composer for a single conference.
 *
 * Both channels target `conferences/{id}/attendees` — the server-written list of
 * people who redeemed a ticket — so nothing here can reach the wider user base.
 *
 * Push and email are sent by two separate calls rather than one combined
 * callable, because they fail independently: email is gated on a Brevo template
 * that may not exist yet, and a failure there should not silently swallow a push
 * that already went out. The result line reports each channel separately.
 */

type PushResult = { successCount?: number; failureCount?: number; audienceCount?: number };
type EmailResult = {
  sent?: number;
  failed?: number;
  recipientCount?: number;
  attendeeCount?: number;
};

interface Props {
  conferenceId: string;
  conferenceName?: string;
}

export function ConferenceAnnouncePanel({ conferenceId, conferenceName }: Props) {
  const [attendeeCount, setAttendeeCount] = useState<number | null>(null);

  const [sendPush, setSendPush] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);

  const [headline, setHeadline] = useState("");
  const [message, setMessage] = useState("");
  const [deepLink, setDeepLink] = useState("/conference/lobby");
  const [senderName, setSenderName] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Live attendee count, so an admin knows the real reach before sending.
  useEffect(() => {
    if (!conferenceId) return;
    const unsub = onSnapshot(
      collection(db, "conferences", conferenceId, "attendees"),
      (snap) => setAttendeeCount(snap.size),
      () => setAttendeeCount(null)
    );
    return () => unsub();
  }, [conferenceId]);

  const reset = useCallback(() => {
    setHeadline("");
    setMessage("");
    setCtaLabel("");
    setCtaUrl("");
  }, []);

  const send = async () => {
    setBusy(true);
    setError(null);
    setResults([]);
    const lines: string[] = [];

    // Push first: it is the cheaper call and the one most likely to succeed, so
    // a later email failure still leaves the admin with a clear partial result.
    if (sendPush) {
      try {
        const callable = httpsCallable(functions, "adminSendPushNotification");
        const res = await callable({
          title: headline.trim(),
          body: message.trim().slice(0, 300),
          deepLink: deepLink.trim(),
          audience: "conference",
          conference_id: conferenceId,
        });
        const out = res.data as PushResult;
        lines.push(
          `Push — reached ${out.audienceCount ?? 0} attendee(s): ${out.successCount ?? 0} delivered, ${out.failureCount ?? 0} failed.`
        );
      } catch (e: unknown) {
        lines.push(`Push failed — ${(e as { message?: string }).message ?? String(e)}`);
      }
    }

    if (sendEmail) {
      try {
        const callable = httpsCallable(functions, "adminSendConferenceEmail");
        const res = await callable({
          conference_id: conferenceId,
          headline: headline.trim(),
          message_body: message.trim(),
          sender_name: senderName.trim() || undefined,
          cta_label: ctaLabel.trim() || undefined,
          cta_url: ctaUrl.trim() || undefined,
        });
        const out = res.data as EmailResult;
        const skipped = (out.attendeeCount ?? 0) - (out.recipientCount ?? 0);
        lines.push(
          `Email — ${out.sent ?? 0} sent, ${out.failed ?? 0} failed` +
            (skipped > 0 ? ` (${skipped} attendee(s) had no email on file).` : ".")
        );
      } catch (e: unknown) {
        lines.push(`Email failed — ${(e as { message?: string }).message ?? String(e)}`);
      }
    }

    setResults(lines);
    if (lines.length > 0 && !lines.some((l) => l.includes("failed —"))) reset();
    setBusy(false);
  };

  const bodyTooLongForPush = sendPush && message.trim().length > 300;
  const canSend =
    !busy &&
    (sendPush || sendEmail) &&
    headline.trim().length > 0 &&
    message.trim().length > 0 &&
    (!sendPush || deepLink.trim().length > 0);

  return (
    <Card className="p-6 border-border bg-card mt-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-lg font-semibold text-foreground">
          Announce to attendees
        </h3>
        <span className="text-sm text-muted-foreground">
          {attendeeCount === null ? "—" : `${attendeeCount} attendee(s)`}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Sends only to people who redeemed a ticket for
        {conferenceName ? ` ${conferenceName}` : " this conference"}. Never to the
        whole user base.
      </p>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={sendPush}
              onChange={(e) => setSendPush(e.target.checked)}
            />
            <Bell className="h-4 w-4" /> Push notification
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            <Mail className="h-4 w-4" /> Email
          </label>
        </div>

        <div>
          <Label className="text-foreground">
            Headline {sendPush ? "(push title + email subject line)" : "(email subject line)"}
          </Label>
          <Input
            className="mt-1"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={120}
            placeholder="Doors open at 8:30"
          />
        </div>

        <div>
          <Label className="text-foreground">Message</Label>
          <Textarea
            className="mt-1"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Registration is on the second floor. Coffee is in the atrium."
          />
          {bodyTooLongForPush ? (
            <p className="text-xs text-amber-600 mt-1">
              {message.trim().length} characters — the push will be truncated to 300.
              The email sends in full.
            </p>
          ) : null}
        </div>

        {sendPush ? (
          <div>
            <Label className="text-foreground">Deep link route (push)</Label>
            <Input
              className="mt-1"
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              placeholder="/conference/lobby"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Where tapping the push lands. Examples:{" "}
              <code className="text-xs bg-muted px-1">/conference/lobby</code>,{" "}
              <code className="text-xs bg-muted px-1">/conference/schedule</code>,{" "}
              <code className="text-xs bg-muted px-1">/conference/community</code>.
            </p>
          </div>
        ) : null}

        {sendEmail ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-foreground">From name</Label>
              <Input
                className="mt-1"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="MORTAR Team"
              />
            </div>
            <div>
              <Label className="text-foreground">Button label</Label>
              <Input
                className="mt-1"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Open MORTAR"
              />
            </div>
            <div>
              <Label className="text-foreground">Button link</Label>
              <Input
                className="mt-1"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={!canSend}
          onClick={() => void send()}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...
            </>
          ) : (
            "Send announcement"
          )}
        </Button>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {results.length > 0 ? (
          <div className="space-y-1">
            {results.map((line) => (
              <p key={line} className="text-sm text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
