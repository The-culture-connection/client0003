"use client";

import { useCallback, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type DashboardResp = {
  success: boolean;
  date_utc_today: string;
  date_utc_yesterday: string;
  daily_metrics_today: Record<string, unknown> | null;
  daily_metrics_yesterday: Record<string, unknown> | null;
  funnel_summary: Record<string, unknown>;
  friction_summary: Array<Record<string, unknown>>;
};

type RawPage = {
  success: boolean;
  events: Array<Record<string, unknown>>;
  next_cursor: string | null;
};

function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

export function MobileAnalyticsSummariesPanel() {
  const [dashboard, setDashboard] = useState<DashboardResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, "getAdminMobileAnalyticsDashboard");
      const res = await fn({});
      setDashboard(res.data as DashboardResp);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const downloadAllRaw = async () => {
    setExportBusy(true);
    setExportStatus(null);
    const all: Array<Record<string, unknown>> = [];
    let cursor: string | null = null;
    try {
      const fn = httpsCallable(functions, "queryAdminExpansionAnalyticsEvents");
      for (let page = 0; page < 200; page++) {
        const res = await fn({
          limit: 500,
          ...(cursor ? { start_after_id: cursor } : {}),
        });
        const d = res.data as RawPage;
        if (!d?.success || !Array.isArray(d.events)) break;
        all.push(...d.events);
        if (!d.next_cursor || d.events.length === 0) break;
        cursor = d.next_cursor;
      }
      const blob = new Blob([formatJson(all)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expansion_analytics_events_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus(`Downloaded ${all.length} events.`);
    } catch (e) {
      setExportStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setExportBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading mobile analytics summaries…</p>;
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>
          Retry
        </Button>
      </div>
    );
  }

  const today = dashboard?.daily_metrics_today;
  const counts =
    today && typeof today.counts === "object" && today.counts !== null && !Array.isArray(today.counts)
      ? (today.counts as Record<string, unknown>)
      : {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>
          Refresh summaries
        </Button>
        <Button size="sm" disabled={exportBusy} onClick={() => void downloadAllRaw()}>
          {exportBusy ? "Exporting…" : "Download raw expansion_analytics_events (JSON)"}
        </Button>
      </div>
      {exportStatus ? <p className="text-sm text-muted-foreground">{exportStatus}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 border-border">
          <h3 className="text-sm font-semibold text-foreground mb-2">Daily metrics (today)</h3>
          <p className="text-xs text-muted-foreground mb-2">{dashboard?.date_utc_today}</p>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">DAU (UTC day)</dt>
              <dd>{String(today?.dau ?? "—")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Mobile events</dt>
              <dd>{String(today?.total_expansion_mobile_events ?? "—")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Posts created</dt>
              <dd>{String(counts.posts_created ?? "—")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Messages sent</dt>
              <dd>{String(counts.messages_sent ?? "—")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Jobs / skills / RSVPs</dt>
              <dd className="text-right">
                {String(counts.jobs_created ?? 0)} / {String(counts.skills_created ?? 0)} /{" "}
                {String(counts.events_registered ?? 0)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-4 border-border">
          <h3 className="text-sm font-semibold text-foreground mb-2">Funnel summaries</h3>
          <p className="text-xs text-muted-foreground mb-2">
            Keys: auth, onboarding, matching, job_to_message, event_to_rsvp
          </p>
          <ScrollArea className="h-48 rounded border border-border p-2 bg-muted/30">
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-all">
              {formatJson(dashboard?.funnel_summary ?? {})}
            </pre>
          </ScrollArea>
        </Card>
      </div>

      <Card className="p-4 border-border">
        <h3 className="text-sm font-semibold text-foreground mb-2">Friction (error-style events)</h3>
        <ScrollArea className="h-56 rounded border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-2">event_name</th>
                <th className="p-2">total</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard?.friction_summary ?? []).map((row) => (
                <tr key={String(row.id)} className="border-b border-border/60">
                  <td className="p-2 font-mono">{String(row.id)}</td>
                  <td className="p-2">{String(row.total ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </Card>

      <Card className="p-4 border-border">
        <h3 className="text-sm font-semibold text-foreground mb-2">Yesterday (daily_metrics)</h3>
        <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-all max-h-40 overflow-auto">
          {formatJson(dashboard?.daily_metrics_yesterday ?? {})}
        </pre>
      </Card>
    </div>
  );
}
