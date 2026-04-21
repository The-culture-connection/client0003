import { useCallback, useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type DashboardResp = {
  success: boolean;
  date_utc_today: string;
  date_utc_yesterday: string;
  daily_metrics_today: Record<string, unknown> | null;
  daily_metrics_yesterday: Record<string, unknown> | null;
  funnel_summary: Record<string, unknown>;
  friction_summary: Array<Record<string, unknown>>;
  notes?: { funnel_and_friction?: string };
};

type RawPage = {
  success: boolean;
  events: Array<Record<string, unknown>>;
  next_cursor: string | null;
};

type RangeSummariesResp = {
  success: boolean;
  start_date_utc: string;
  end_date_utc: string;
  daily_metrics_by_date: Record<string, unknown>;
  funnel_summary: Record<string, unknown>;
  friction_summary: Array<Record<string, unknown>>;
  notes?: { funnel_and_friction?: string };
};

function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

function utcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultRangeDates(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - 6));
  return { start: utcYmd(start), end: utcYmd(end) };
}

function utcRangeMillis(startYmd: string, endYmd: string): { afterMs: number; beforeMs: number } {
  const [ys, ms, ds] = startYmd.split("-").map((n) => parseInt(n, 10));
  const [ye, me, de] = endYmd.split("-").map((n) => parseInt(n, 10));
  return {
    afterMs: Date.UTC(ys, ms - 1, ds, 0, 0, 0, 0),
    beforeMs: Date.UTC(ye, me - 1, de, 23, 59, 59, 999),
  };
}

function readCounts(doc: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!doc) return {};
  const c = doc.counts;
  if (c && typeof c === "object" && !Array.isArray(c)) return c as Record<string, unknown>;
  return {};
}

const FUNNEL_IDS = ["auth", "onboarding", "matching", "job_to_message", "event_to_rsvp"] as const;

const USER_COUNT_KEYS = [
  "total_posts_created",
  "total_comments",
  "total_messages_sent",
  "total_groups_joined",
  "total_events_registered",
  "total_jobs_created",
  "total_skills_created",
  "total_matches_messaged",
  "onboarding_completed",
] as const;

const DAILY_ROLLUP_KEYS = [
  "posts_created",
  "messages_sent",
  "jobs_created",
  "skills_created",
  "events_registered",
  "new_users",
] as const;

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-mono tabular-nums">{value}</dd>
    </div>
  );
}

function FunnelCard({ id, data }: { id: string; data: unknown }) {
  const doc = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  const counts = readCounts(doc);
  const keys = Object.keys(counts).filter((k) => k !== "schema_version").sort();
  return (
    <Card className="p-4 border-border">
      <h4 className="text-sm font-semibold text-foreground mb-2 capitalize">{id.replace(/_/g, " ")}</h4>
      {keys.length === 0 ? (
        <p className="text-xs text-muted-foreground">No step counts yet.</p>
      ) : (
        <dl className="space-y-1 max-h-40 overflow-auto">
          {keys.map((k) => (
            <MetricRow key={k} label={k} value={String(counts[k] ?? "—")} />
          ))}
        </dl>
      )}
    </Card>
  );
}

export function MobileAnalyticsSummariesPanel() {
  const [dashboard, setDashboard] = useState<DashboardResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [rangeDates, setRangeDates] = useState(defaultRangeDates);
  const [rangeSummaries, setRangeSummaries] = useState<RangeSummariesResp | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [userIdInput, setUserIdInput] = useState("");
  const [userSummary, setUserSummary] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [userSummaryLoading, setUserSummaryLoading] = useState(false);
  const [userSummaryError, setUserSummaryError] = useState<string | null>(null);

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

  const todayCounts = useMemo(() => readCounts(dashboard?.daily_metrics_today ?? null), [dashboard]);
  const yesterdayCounts = useMemo(() => readCounts(dashboard?.daily_metrics_yesterday ?? null), [dashboard]);

  const loadRangeSummaries = async () => {
    setRangeLoading(true);
    setRangeError(null);
    try {
      const fn = httpsCallable(functions, "getAdminMobileAnalyticsRangeSummaries");
      const res = await fn({
        start_date_utc: rangeDates.start,
        end_date_utc: rangeDates.end,
      });
      setRangeSummaries(res.data as RangeSummariesResp);
    } catch (e) {
      setRangeError(e instanceof Error ? e.message : String(e));
    } finally {
      setRangeLoading(false);
    }
  };

  const loadUserSummary = async () => {
    const uid = userIdInput.trim();
    if (!uid) {
      setUserSummaryError("Enter a user id.");
      return;
    }
    setUserSummaryLoading(true);
    setUserSummaryError(null);
    try {
      const fn = httpsCallable(functions, "getAdminUserAnalyticsSummary");
      const res = (await fn({ user_id: uid })) as { data: { success: boolean; summary: Record<string, unknown> | null } };
      setUserSummary(res.data.summary ?? null);
    } catch (e) {
      setUserSummaryError(e instanceof Error ? e.message : String(e));
      setUserSummary(undefined);
    } finally {
      setUserSummaryLoading(false);
    }
  };

  const downloadFullBundle = async () => {
    setExportBusy(true);
    setExportStatus(null);
    const { afterMs, beforeMs } = utcRangeMillis(rangeDates.start, rangeDates.end);
    try {
      const rangeFn = httpsCallable(functions, "getAdminMobileAnalyticsRangeSummaries");
      const rangeRes = await rangeFn({
        start_date_utc: rangeDates.start,
        end_date_utc: rangeDates.end,
      });
      const rangePack = rangeRes.data as RangeSummariesResp;

      const events: Array<Record<string, unknown>> = [];
      let cursor: string | null = null;
      const queryFn = httpsCallable(functions, "queryAdminExpansionAnalyticsEvents");
      const MAX_EVENTS = 120_000;
      for (let page = 0; page < 400; page++) {
        const res = await queryFn({
          limit: 500,
          ingested_after_ms: afterMs,
          ingested_before_ms: beforeMs,
          ...(cursor ? { start_after_id: cursor } : {}),
        });
        const d = res.data as RawPage;
        if (!d?.success || !Array.isArray(d.events)) break;
        events.push(...d.events);
        if (events.length >= MAX_EVENTS) break;
        if (!d.next_cursor || d.events.length === 0) break;
        cursor = d.next_cursor;
      }

      const uids = [...new Set(events.map((e) => e.user_id).filter((x): x is string => typeof x === "string"))];
      const MAX_USERS = 5000;
      const uidBatch = uids.slice(0, MAX_USERS);
      const summaries: Record<string, Record<string, unknown> | null> = {};
      const batchFn = httpsCallable(functions, "batchGetUserAnalyticsSummaries");
      for (let i = 0; i < uidBatch.length; i += 200) {
        const chunk = uidBatch.slice(i, i + 200);
        if (chunk.length === 0) break;
        const r = (await batchFn({ user_ids: chunk })) as {
          data: { success: boolean; summaries: Record<string, Record<string, unknown> | null> };
        };
        Object.assign(summaries, r.data.summaries ?? {});
      }

      const bundle = {
        export_version: 1,
        generated_at: new Date().toISOString(),
        ingested_range_utc: { start_date: rangeDates.start, end_date: rangeDates.end, after_ms: afterMs, before_ms: beforeMs },
        notes: {
          funnel_and_friction_cumulative:
            rangePack.notes?.funnel_and_friction ??
            "funnel_summary and friction_summary are cumulative counters, not sliced per export window.",
          user_summaries:
            "user_analytics_summary rows are lifetime totals per user (Phase 4), paired with events that occurred in the selected ingested_at window.",
          truncation:
            events.length >= MAX_EVENTS
              ? `Events capped at ${MAX_EVENTS}; narrow the date range for a complete pull.`
              : uids.length > MAX_USERS
                ? `Only the first ${MAX_USERS} distinct user_ids received summary snapshots.`
                : null,
        },
        range_summaries: rangePack,
        expansion_analytics_events: events,
        user_analytics_summaries: summaries,
      };

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mobile_analytics_bundle_${rangeDates.start}_to_${rangeDates.end}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus(`Bundle saved (${events.length} events, ${Object.keys(summaries).length} user summaries).`);
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

  const today = dashboard?.daily_metrics_today as Record<string, unknown> | undefined;
  const yesterday = dashboard?.daily_metrics_yesterday as Record<string, unknown> | undefined;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground max-w-4xl">
        {dashboard?.notes?.funnel_and_friction ??
          "Funnel and friction Firestore docs are cumulative since first write. Per-day activity lives in daily_metrics and in raw expansion_analytics_events."}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>
          Refresh snapshot (today / yesterday)
        </Button>
      </div>

      {/* User analytics summary */}
      <Card className="p-4 border-border space-y-3">
        <h3 className="text-sm font-semibold text-foreground">User summary (user_analytics_summary)</h3>
        <p className="text-xs text-muted-foreground">
          Lifetime counters per Firebase Auth uid (mobile rollups + web rollups may share this document).
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="ma-user-id" className="text-xs">
              User ID
            </Label>
            <Input
              id="ma-user-id"
              className="w-72 font-mono text-sm"
              placeholder="Firebase uid"
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
            />
          </div>
          <Button size="sm" variant="secondary" disabled={userSummaryLoading} onClick={() => void loadUserSummary()}>
            {userSummaryLoading ? "Loading…" : "Load user summary"}
          </Button>
        </div>
        {userSummaryError ? <p className="text-sm text-destructive">{userSummaryError}</p> : null}
        {userSummary === null ? (
          <p className="text-xs text-muted-foreground">No summary document for this uid.</p>
        ) : userSummary ? (
          <div className="grid gap-2 md:grid-cols-2">
            <dl className="space-y-1">
              <MetricRow label="last_active_at" value={String(userSummary.last_active_at ?? "—")} />
              <MetricRow label="onboarding_completed_at" value={String(userSummary.onboarding_completed_at ?? "—")} />
              <MetricRow label="last_activity_utc_date" value={String(userSummary.last_activity_utc_date ?? "—")} />
              <MetricRow label="streak_days" value={String(userSummary.streak_days ?? "—")} />
              <MetricRow label="best_streak_days" value={String(userSummary.best_streak_days ?? "—")} />
            </dl>
            <dl className="space-y-1">
              {USER_COUNT_KEYS.map((k) => {
                const c = readCounts(userSummary);
                return <MetricRow key={k} label={k} value={String(c[k] ?? userSummary[k] ?? "—")} />;
              })}
            </dl>
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Full document (JSON)</p>
              <ScrollArea className="h-36 rounded border border-border p-2 bg-muted/30">
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-all">{formatJson(userSummary)}</pre>
              </ScrollArea>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Daily metrics — today & yesterday */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 border-border space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Daily metrics — today (UTC)</h3>
          <p className="text-xs text-muted-foreground">{dashboard?.date_utc_today}</p>
          <dl className="space-y-1">
            <MetricRow label="DAU" value={String(today?.dau ?? "—")} />
            <MetricRow label="total_expansion_mobile_events" value={String(today?.total_expansion_mobile_events ?? "—")} />
            {DAILY_ROLLUP_KEYS.map((k) => (
              <MetricRow key={k} label={k} value={String(todayCounts[k] ?? "—")} />
            ))}
          </dl>
          <p className="text-xs text-muted-foreground pt-2">Raw counts bag (includes raw_event.*)</p>
          <ScrollArea className="h-32 rounded border border-border p-2 bg-muted/30">
            <pre className="text-[11px] whitespace-pre-wrap break-all">{formatJson(todayCounts)}</pre>
          </ScrollArea>
        </Card>
        <Card className="p-4 border-border space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Daily metrics — yesterday (UTC)</h3>
          <p className="text-xs text-muted-foreground">{dashboard?.date_utc_yesterday}</p>
          <dl className="space-y-1">
            <MetricRow label="DAU" value={String(yesterday?.dau ?? "—")} />
            <MetricRow
              label="total_expansion_mobile_events"
              value={String(yesterday?.total_expansion_mobile_events ?? "—")}
            />
            {DAILY_ROLLUP_KEYS.map((k) => (
              <MetricRow key={k} label={k} value={String(yesterdayCounts[k] ?? "—")} />
            ))}
          </dl>
          <ScrollArea className="h-32 rounded border border-border p-2 bg-muted/30">
            <pre className="text-[11px] whitespace-pre-wrap break-all">{formatJson(yesterdayCounts)}</pre>
          </ScrollArea>
        </Card>
      </div>

      {/* Funnels */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Funnel summary (cumulative)</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {FUNNEL_IDS.map((id) => (
            <FunnelCard key={id} id={id} data={dashboard?.funnel_summary?.[id]} />
          ))}
        </div>
      </div>

      {/* Friction */}
      <Card className="p-4 border-border">
        <h3 className="text-sm font-semibold text-foreground mb-1">Friction summary</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Per error-style <code className="text-xs">event_name</code>: server-maintained <code className="text-xs">total</code>{" "}
          (not a ratio). Pair with daily <code className="text-xs">counts.raw_event.*</code> or the event export for
          context.
        </p>
        <ScrollArea className="h-64 rounded border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-2">event_name</th>
                <th className="p-2">total</th>
                <th className="p-2">updated_at</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard?.friction_summary ?? []).map((row) => (
                <tr key={String(row.id)} className="border-b border-border/60">
                  <td className="p-2 font-mono">{String(row.id)}</td>
                  <td className="p-2">{String(row.total ?? "—")}</td>
                  <td className="p-2 font-mono">{String(row.updated_at ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </Card>

      {/* Date range + export */}
      <Card className="p-4 border-border space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Date range (UTC) — summaries + export</h3>
        <p className="text-xs text-muted-foreground max-w-3xl">
          Loads one <code className="text-xs">daily_metrics</code> document per UTC day. Export merges range summaries, all
          raw events whose <code className="text-xs">ingested_at</code> falls in that window (paginated, max 120k), and{" "}
          <code className="text-xs">user_analytics_summary</code> for distinct user_ids seen (up to 5k users, 200 per
          batch call).
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Start (YYYY-MM-DD)</Label>
            <Input
              className="w-40 font-mono text-sm"
              value={rangeDates.start}
              onChange={(e) => setRangeDates((r) => ({ ...r, start: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End (YYYY-MM-DD)</Label>
            <Input
              className="w-40 font-mono text-sm"
              value={rangeDates.end}
              onChange={(e) => setRangeDates((r) => ({ ...r, end: e.target.value }))}
            />
          </div>
          <Button size="sm" variant="secondary" disabled={rangeLoading} onClick={() => void loadRangeSummaries()}>
            {rangeLoading ? "Loading…" : "Load range summaries"}
          </Button>
          <Button size="sm" disabled={exportBusy} onClick={() => void downloadFullBundle()}>
            {exportBusy ? "Building…" : "Download JSON bundle (summaries + events + user snapshots)"}
          </Button>
        </div>
        {rangeError ? <p className="text-sm text-destructive">{rangeError}</p> : null}
        {exportStatus ? <p className="text-sm text-muted-foreground">{exportStatus}</p> : null}
        {rangeSummaries?.daily_metrics_by_date ? (
          <ScrollArea className="h-48 rounded border border-border p-2 bg-muted/30">
            <pre className="text-[11px] whitespace-pre-wrap break-all">{formatJson(rangeSummaries.daily_metrics_by_date)}</pre>
          </ScrollArea>
        ) : null}
      </Card>
    </div>
  );
}
