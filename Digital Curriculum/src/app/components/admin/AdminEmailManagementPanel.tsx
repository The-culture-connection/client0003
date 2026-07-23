import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Loader2, Mail } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { sendCustomAnnouncementEmail } from "../../lib/adminEmail";
import { useAuth } from "../auth/AuthProvider";

const AUDIENCE_ROLES = [
  "",
  "Digital Curriculum Students",
  "Digital Curriculum Alumni",
  "Admin",
] as const;

export function AdminEmailManagementPanel() {
  const { user } = useAuth();
  const [headline, setHeadline] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [senderName, setSenderName] = useState("MORTAR Team");
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Open MORTAR");
  const [emailsRaw, setEmailsRaw] = useState("");
  const [role, setRole] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const parsedEmails = emailsRaw
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes("@"));

  const handleSend = async () => {
    if (!headline.trim() || !messageBody.trim()) {
      setResult("Headline and message are required.");
      return;
    }
    if (!parsedEmails.length && !role) {
      setResult("Add at least one email address or choose a role audience.");
      return;
    }
    if (ctaUrl.trim() && !/^https?:\/\//i.test(ctaUrl.trim())) {
      setResult("CTA link must start with https:// (or leave it blank).");
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const out = await sendCustomAnnouncementEmail({
        headline: headline.trim(),
        messageBody: messageBody.trim(),
        senderName: senderName.trim() || "MORTAR Team",
        ctaUrl: ctaUrl.trim() || undefined,
        ctaLabel: ctaLabel.trim() || undefined,
        emails: parsedEmails.length ? parsedEmails : undefined,
        role: role || undefined,
      });
      const skipped = out.skipped_preferences ?? 0;
      if (out.recipientCount === 0) {
        setResult("No recipients matched. Check email addresses or role audience.");
      } else if (out.sent === 0) {
        setResult(
          `No emails were delivered (${out.failed} failed, ${skipped} skipped by user preferences). ` +
            "Check Firestore collection email_activity for this recipient.",
        );
      } else {
        setResult(
          `Sent ${out.sent} of ${out.recipientCount} recipients` +
            (skipped > 0 ? ` (${skipped} skipped — opted out of admin messages).` : "") +
            (out.failed > 0 ? ` (${out.failed} failed — check email_activity in Firestore).` : "."),
        );
      }
    } catch (e: unknown) {
      if (e instanceof FirebaseError) {
        setResult(`${e.code}: ${e.message}`);
      } else {
        const err = e as { message?: string };
        setResult(err.message ?? String(e));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <Mail className="w-6 h-6 text-accent shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Email Management</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Send a custom announcement via Brevo (<code className="text-xs bg-muted px-1 rounded">admin_custom_announcement</code>).
              Respects user email preferences. Other flows (graduation, course nudges, invites) are automatic from Cloud Functions.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-headline">Subject / headline</Label>
          <Input
            id="email-headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Important update for MORTAR students"
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email-sender">Sender name</Label>
          <Input
            id="email-sender"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            className="bg-background max-w-md"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email-body">Message</Label>
          <Textarea
            id="email-body"
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            rows={8}
            placeholder="Plain text or simple HTML paragraphs..."
            className="bg-background"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email-cta-url">CTA link (optional)</Label>
            <Input
              id="email-cta-url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://..."
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-cta-label">CTA button label</Label>
            <Input
              id="email-cta-label"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              className="bg-background"
            />
          </div>
        </div>
        <SeparatorSection />
        <div className="space-y-2">
          <Label htmlFor="email-list">Recipient emails (comma or newline separated)</Label>
          <Textarea
            id="email-list"
            value={emailsRaw}
            onChange={(e) => setEmailsRaw(e.target.value)}
            rows={4}
            placeholder="student@example.com, alumni@example.com"
            className="bg-background font-mono text-sm"
          />
          {parsedEmails.length > 0 && (
            <p className="text-xs text-muted-foreground">{parsedEmails.length} valid address(es) parsed.</p>
          )}
        </div>
        <div className="space-y-2 max-w-md">
          <Label htmlFor="email-role">Or send to role</Label>
          <select
            id="email-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
          >
            {AUDIENCE_ROLES.map((r) => (
              <option key={r || "none"} value={r}>
                {r || "— Select role —"}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={() => void handleSend()}
          disabled={sending}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Send announcement
            </>
          )}
        </Button>
        {result && <p className="text-sm text-muted-foreground">{result}</p>}
        {user?.email && (
          <p className="text-xs text-muted-foreground">Sending as admin {user.email}</p>
        )}
      </Card>
    </div>
  );
}

function SeparatorSection() {
  return (
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Audience</p>
  );
}
