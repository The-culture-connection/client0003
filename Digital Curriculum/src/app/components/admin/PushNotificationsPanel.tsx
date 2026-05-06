import { useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { functions } from "../../lib/firebase";

type PushActivityItem = {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  deep_link?: string;
  source?: string;
  success_count?: number;
  failure_count?: number;
  target_uids?: string[];
  created_at?: { toDate?: () => Date };
};

function asText(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function toLocalTime(v: unknown): string {
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate?: unknown }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toLocaleString();
  }
  return "—";
}

export function PushNotificationsPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("/home");
  const [audience, setAudience] = useState<"all" | "uids">("all");
  const [uidsText, setUidsText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<PushActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const parsedUids = useMemo(
    () =>
      uidsText
        .split(/[\s,]+/)
        .map((x) => x.trim())
        .filter(Boolean),
    [uidsText]
  );

  const loadActivity = async () => {
    setLoading(true);
    setError(null);
    try {
      const callable = httpsCallable(functions, "getPushNotificationActivity");
      const res = await callable({ limit: 80 });
      const data = res.data as { items?: PushActivityItem[] };
      setActivity(Array.isArray(data.items) ? data.items : []);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadActivity();
  }, []);

  const sendPush = async () => {
    setSending(true);
    setSendMsg(null);
    try {
      const callable = httpsCallable(functions, "adminSendPushNotification");
      const res = await callable({
        title: title.trim(),
        body: body.trim(),
        deepLink: deepLink.trim(),
        audience,
        uids: audience === "uids" ? parsedUids : [],
      });
      const out = res.data as { successCount?: number; failureCount?: number; audienceCount?: number };
      setSendMsg(
        `Sent. Audience: ${out.audienceCount ?? 0}, success: ${out.successCount ?? 0}, failed: ${out.failureCount ?? 0}.`
      );
      await loadActivity();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setSendMsg(err.message ?? String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 border-border bg-card">
        <h2 className="text-xl font-semibold text-foreground mb-2">Send app push notification</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Sends Firebase Cloud Messaging pushes to Expansion app users. Use app routes as deep links (examples:
          <code className="text-xs bg-muted px-1 ml-1">/events/abc123</code>,
          <code className="text-xs bg-muted px-1 ml-1">/messages/direct/UID</code>,
          <code className="text-xs bg-muted px-1 ml-1">/profile/achievements</code>).
        </p>
        <div className="space-y-3">
          <div>
            <Label className="text-foreground">Title</Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label className="text-foreground">Body</Label>
            <Textarea className="mt-1" value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={300} />
          </div>
          <div>
            <Label className="text-foreground">Deep link route</Label>
            <Input className="mt-1" value={deepLink} onChange={(e) => setDeepLink(e.target.value)} />
          </div>
          <div>
            <Label className="text-foreground">Audience</Label>
            <select
              className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-foreground"
              value={audience}
              onChange={(e) => setAudience(e.target.value as "all" | "uids")}
            >
              <option value="all">All app users with push tokens</option>
              <option value="uids">Specific user IDs</option>
            </select>
          </div>
          {audience === "uids" ? (
            <div>
              <Label className="text-foreground">User IDs (comma or newline separated)</Label>
              <Textarea
                className="mt-1"
                value={uidsText}
                onChange={(e) => setUidsText(e.target.value)}
                rows={3}
                placeholder="uid_1, uid_2"
              />
            </div>
          ) : null}
          <Button
            type="button"
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={sending || !title.trim() || !body.trim() || !deepLink.trim() || (audience === "uids" && parsedUids.length === 0)}
            onClick={() => void sendPush()}
          >
            {sending ? "Sending..." : "Send push"}
          </Button>
          {sendMsg ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sendMsg}</p> : null}
        </div>
      </Card>

      <Card className="p-6 border-border bg-card">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xl font-semibold text-foreground">Push notification activity</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadActivity()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">{loading ? "Loading..." : "No push activity yet."}</p>
        ) : (
          <ul className="space-y-3">
            {activity.map((row) => (
              <li key={row.id} className="rounded-md border border-border/80 bg-background/40 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{asText(row.type) || "push"}</Badge>
                  <Badge variant="secondary">{asText(row.source) || "unknown"}</Badge>
                  <span className="text-xs text-muted-foreground">{toLocalTime(row.created_at)}</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{asText(row.title)}</p>
                <p className="text-sm text-muted-foreground">{asText(row.body)}</p>
                <p className="text-xs text-muted-foreground font-mono break-all">deep_link: {asText(row.deep_link)}</p>
                <p className="text-xs text-muted-foreground">
                  success: {row.success_count ?? 0} · failed: {row.failure_count ?? 0} · users:{" "}
                  {Array.isArray(row.target_uids) ? row.target_uids.length : 0}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
