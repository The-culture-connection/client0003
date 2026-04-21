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
  derived_metrics_today: Record<string, unknown> | null;
  derived_metrics_yesterday: Record<string, unknown> | null;
  funnel_summary: Record<string, unknown>;
  friction_summary: Array<Record<string, unknown>>;
  notes?: { funnel_and_friction?: string; derived_metrics?: string };
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
  derived_metrics_by_date: Record<string, unknown>;
  funnel_summary: Record<string, unknown>;
  friction_summary: Array<Record<string, unknown>>;
  notes?: { funnel_and_friction?: string; derived_metrics?: string };
};

type AdminDerivedRunResp = {
  success: boolean;
  start_date_utc: string;
  end_date_utc: string;
  days_requested: number;
  phase4_derived_days: string[];
  phase5_derived_metrics_days: string[];
  skipped_no_daily_metrics: string[];
};

function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

function fmtPct(v: unknown): string {
  if (v == null || typeof v !== "number" || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtNum(v: unknown, digits = 2): string {
  if (v == null || typeof v !== "number" || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function fmtDrop(v: unknown): string {
  if (v == null || typeof v !== "number" || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(1)}% drop-off`;
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

type DayDerived = { date: string; doc: Record<string, unknown> };

function FriendlyDerivedMetricsReport({ days, title }: { days: DayDerived[]; title: string }) {
  if (days.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No <code className="text-xs">derived_metrics</code> rows for this range yet. Run the job for dates that have{" "}
        <code className="text-xs">daily_metrics</code>.
      </p>
    );
  }

  return (
    <div className="space-y-4 isolate">
      <p className="text-xs font-medium text-foreground">{title}</p>
      {days.map(({ date, doc }) => {
        const em = asRecord(doc.expansion_mobile);
        const density = asRecord(doc.per_user_density);
        const tt = asRecord(doc.time_to_first_activity) ?? asRecord(doc.time_to_first_signals);
        const fd = asRecord(doc.funnel_dropoffs_daily);
        return (
          <Card key={date} className="p-4 border-border space-y-3 bg-card shadow-sm relative z-0 overflow-hidden">
            <h4 className="text-sm font-semibold text-foreground">UTC {date}</h4>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <MetricRow label="Onboarding conversion rate" value={fmtPct(em?.onboarding_conversion_rate)} />
              <MetricRow label="Event RSVP rate" value={fmtPct(em?.event_rsvp_rate)} />
              <MetricRow label="Group join rate" value={fmtPct(em?.group_join_rate)} />
              <MetricRow label="Job → message rate" value={fmtPct(em?.job_to_message_rate)} />
              <MetricRow label="Match → message rate" value={fmtPct(em?.match_to_message_rate)} />
              <MetricRow label="Posts per user (÷ DAU)" value={fmtNum(density?.posts_per_dau)} />
              <MetricRow label="Messages per user (÷ DAU)" value={fmtNum(density?.messages_per_dau)} />
              <MetricRow
                label="First DM logged this UTC day (users)"
                value={String(tt?.users_first_direct_message_logged_this_utc_day ?? "—")}
              />
              <MetricRow
                label="First match msg click logged this UTC day (users)"
                value={String(tt?.users_first_match_message_click_logged_this_utc_day ?? "—")}
              />
            </div>
            {typeof tt?.note === "string" ? <p className="text-[11px] text-muted-foreground">{tt.note}</p> : null}
            <details className="text-xs border-t border-border pt-2">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                Raw derived_metrics JSON (this day)
              </summary>
              <pre className="mt-2 max-h-36 overflow-auto rounded border border-border bg-muted/40 p-2 text-[10px] leading-relaxed whitespace-pre-wrap break-all">
                {formatJson(doc)}
              </pre>
            </details>
            {fd ? (
              <div className="space-y-2 border-t border-border pt-2">
                <p className="text-xs font-medium text-foreground">Drop-off rates (from daily summary counts)</p>
                {Object.entries(fd).map(([funnelKey, section]) => {
                  const sec = asRecord(section);
                  if (!sec) return null;
                  const drops = Object.entries(sec).filter(([k]) => k.startsWith("drop_"));
                  if (drops.length === 0) return null;
                  return (
                    <div key={funnelKey} className="rounded border border-border/80 p-2 bg-muted/20">
                      <p className="text-[11px] font-mono text-muted-foreground mb-1">{funnelKey}</p>
                      <dl className="space-y-0.5">
                        {drops.map(([k, v]) => (
                          <MetricRow key={k} label={k.replace(/^drop_/, "")} value={fmtDrop(v)} />
                        ))}
                      </dl>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Card>
        );
      })}
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
  const [derivedRunBusy, setDerivedRunBusy] = useState(false);
  const [derivedRunError, setDerivedRunError] = useState<string | null>(null);
  const [derivedRunResult, setDerivedRunResult] = useState<AdminDerivedRunResp | null>(null);
  const [highlightDerivedDays, setHighlightDerivedDays] = useState<string[] | null>(null);
  const [phaseDownloadBusy, setPhaseDownloadBusy] = useState<null | "raw" | "p4" | "p5">(null);
  const [phaseDownloadStatus, setPhaseDownloadStatus] = useState<string | null>(null);

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

  const derivedDaysToShow = useMemo((): DayDerived[] => {
    const by = rangeSummaries?.derived_metrics_by_date;
    if (!by || typeof by !== "object") return [];
    const map = by as Record<string, unknown>;
    let keys = Object.keys(map).filter((k) => map[k] != null);
    if (highlightDerivedDays && highlightDerivedDays.length > 0) {
      const hi = new Set(highlightDerivedDays);
      keys = keys.filter((k) => hi.has(k));
    }
    keys.sort();
    return keys.map((date) => ({ date, doc: map[date] as Record<string, unknown> }));
  }, [rangeSummaries?.derived_metrics_by_date, highlightDerivedDays]);

  const fetchRangePack = useCallback(async (): Promise<RangeSummariesResp> => {
    const rangeFn = httpsCallable(functions, "getAdminMobileAnalyticsRangeSummaries");
    const rangeRes = await rangeFn({
      start_date_utc: rangeDates.start,
      end_date_utc: rangeDates.end,
    });
    return rangeRes.data as RangeSummariesResp;
  }, [rangeDates.start, rangeDates.end]);

  function triggerJsonDownload(payload: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

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

  const runDerivedMetricsForRange = async () => {
    setDerivedRunBusy(true);
    setDerivedRunError(null);
    setDerivedRunResult(null);
    try {
      const fn = httpsCallable(functions, "adminRunDerivedMetricsForUtcRange");
      const res = await fn({
        start_date_utc: rangeDates.start,
        end_date_utc: rangeDates.end,
      });
      const data = res.data as AdminDerivedRunResp;
      setDerivedRunResult(data);
      setHighlightDerivedDays(data.phase5_derived_metrics_days ?? []);
      await loadDashboard();
      await loadRangeSummaries();
    } catch (e) {
      setDerivedRunError(e instanceof Error ? e.message : String(e));
    } finally {
      setDerivedRunBusy(false);
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

  const downloadPhase23RawOnly = async () => {
    setPhaseDownloadBusy("raw");
    setPhaseDownloadStatus(null);
    const { afterMs, beforeMs } = utcRangeMillis(rangeDates.start, rangeDates.end);
    try {
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
      triggerJsonDownload(
        {
          export_label: "phase_2_3_expansion_analytics_events",
          generated_at: new Date().toISOString(),
          ingested_range_utc: {
            start_date: rangeDates.start,
            end_date: rangeDates.end,
            after_ms: afterMs,
            before_ms: beforeMs,
          },
          expansion_analytics_events: events,
        },
        `phase_2_3_raw_events_${rangeDates.start}_to_${rangeDates.end}.json`
      );
      setPhaseDownloadStatus(`Phase 2–3 raw: ${events.length} events (cap ${MAX_EVENTS}).`);
    } catch (e) {
      setPhaseDownloadStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setPhaseDownloadBusy(null);
    }
  };

  const downloadPhase4DerivedPack = async () => {
    setPhaseDownloadBusy("p4");
    setPhaseDownloadStatus(null);
    try {
      const pack = await fetchRangePack();
      triggerJsonDownload(
        {
          export_label: "phase_4_summaries",
          generated_at: new Date().toISOString(),
          range: { start_date_utc: pack.start_date_utc, end_date_utc: pack.end_date_utc },
          daily_metrics_by_date: pack.daily_metrics_by_date,
          funnel_summary: pack.funnel_summary,
          friction_summary: pack.friction_summary,
        },
        `phase_4_summaries_${rangeDates.start}_to_${rangeDates.end}.json`
      );
      setPhaseDownloadStatus("Phase 4 summary export downloaded.");
    } catch (e) {
      setPhaseDownloadStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setPhaseDownloadBusy(null);
    }
  };

  const downloadPhase5DerivedPack = async () => {
    setPhaseDownloadBusy("p5");
    setPhaseDownloadStatus(null);
    try {
      const pack = await fetchRangePack();
      triggerJsonDownload(
        {
          export_label: "phase_5_derived_metrics",
          generated_at: new Date().toISOString(),
          range: { start_date_utc: pack.start_date_utc, end_date_utc: pack.end_date_utc },
          derived_metrics_by_date: pack.derived_metrics_by_date,
        },
        `phase_5_derived_metrics_${rangeDates.start}_to_${rangeDates.end}.json`
      );
      setPhaseDownloadStatus("Phase 5 derived_metrics export downloaded.");
    } catch (e) {
      setPhaseDownloadStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setPhaseDownloadBusy(null);
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
          "Funnel and friction Firestore docs are cumulative since first write. Per-day activity lives in daily_metrics and in raw expansion_analytics_events."}{" "}
        {dashboard?.notes?.derived_metrics ? (
          <span className="block mt-2">{dashboard.notes.derived_metrics}</span>
        ) : null}
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
              <MetricRow
                label="expansion_first_direct_message_at"
                value={String(userSummary.expansion_first_direct_message_at ?? "—")}
              />
              <MetricRow
                label="expansion_first_match_message_click_at"
                value={String(userSummary.expansion_first_match_message_click_at ?? "—")}
              />
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

      {/* Phase 5 derived_metrics */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Phase 5 — derived metrics (from daily_metrics)</h3>
        <p className="text-xs text-muted-foreground mb-3 max-w-3xl">
          Stored in <code className="text-xs">derived_metrics/{"{YYYY-MM-DD}"}</code>. Nightly job fills{" "}
          <strong>yesterday</strong> after 01:30 UTC; &quot;today&quot; may be empty until then.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {(["yesterday", "today"] as const).map((which) => {
            const doc =
              which === "yesterday"
                ? (dashboard?.derived_metrics_yesterday as Record<string, unknown> | null | undefined)
                : (dashboard?.derived_metrics_today as Record<string, unknown> | null | undefined);
            const label = which === "yesterday" ? dashboard?.date_utc_yesterday : dashboard?.date_utc_today;
            const em = doc?.expansion_mobile as Record<string, unknown> | undefined;
            const density = doc?.per_user_density as Record<string, unknown> | undefined;
            const blend = doc?.web_curriculum_blend as Record<string, unknown> | undefined;
            return (
              <Card key={which} className="p-4 border-border space-y-2">
                <h4 className="text-xs font-semibold text-foreground capitalize">
                  derived_metrics — {which} ({label})
                </h4>
                {!doc ? (
                  <p className="text-xs text-muted-foreground">No document yet.</p>
                ) : (
                  <>
                    <dl className="space-y-1 text-sm">
                      <MetricRow label="Onboarding conversion" value={fmtPct(em?.onboarding_conversion_rate)} />
                      <MetricRow label="Status" value={String(em?.onboarding_status ?? "—")} />
                      <MetricRow label="Event RSVP rate" value={fmtPct(em?.event_rsvp_rate)} />
                      <MetricRow label="Group join rate" value={fmtPct(em?.group_join_rate)} />
                      <MetricRow label="Job → message rate" value={fmtPct(em?.job_to_message_rate)} />
                      <MetricRow label="Match → message rate" value={fmtPct(em?.match_to_message_rate)} />
                      <MetricRow label="Posts / DAU" value={fmtNum(density?.posts_per_dau)} />
                      <MetricRow label="Messages / DAU" value={fmtNum(density?.messages_per_dau)} />
                      <MetricRow label="Web onboarding / signups" value={fmtPct(blend?.onboarding_completion_over_signups)} />
                    </dl>
                    {em?.onboarding_insight ? (
                      <div className="text-xs border-t border-border pt-2 space-y-1">
                        <p>
                          <span className="text-muted-foreground">Insight:</span> {String(em.onboarding_insight)}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Action:</span> {String(em.onboarding_action)}
                        </p>
                      </div>
                    ) : null}
                    <details className="text-xs mt-2 border-t border-border pt-2">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                        Raw JSON (snapshot card)
                      </summary>
                      <pre className="mt-2 max-h-32 overflow-auto rounded border border-border bg-muted/40 p-2 text-[10px] whitespace-pre-wrap break-all">
                        {formatJson(doc)}
                      </pre>
                    </details>
                  </>
                )}
              </Card>
            );
          })}
        </div>
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
          Loads one <code className="text-xs">daily_metrics</code> document per UTC day. Full bundle export merges range
          summaries, raw events in the <code className="text-xs">ingested_at</code> window, and batched{" "}
          <code className="text-xs">user_analytics_summary</code>. Use the split downloads below for Phase 2–3 / 4 / 5 only.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Start (YYYY-MM-DD)</Label>
            <Input
              className="w-40 font-mono text-sm"
              value={rangeDates.start}
              onChange={(e) => {
                setHighlightDerivedDays(null);
                setRangeDates((r) => ({ ...r, start: e.target.value }));
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End (YYYY-MM-DD)</Label>
            <Input
              className="w-40 font-mono text-sm"
              value={rangeDates.end}
              onChange={(e) => {
                setHighlightDerivedDays(null);
                setRangeDates((r) => ({ ...r, end: e.target.value }));
              }}
            />
          </div>
          <Button size="sm" variant="secondary" disabled={rangeLoading} onClick={() => void loadRangeSummaries()}>
            {rangeLoading ? "Loading…" : "Load range summaries"}
          </Button>
          <Button size="sm" variant="outline" disabled={derivedRunBusy} onClick={() => void runDerivedMetricsForRange()}>
            {derivedRunBusy ? "Running…" : "Run Phase 4 + 5 derived for range"}
          </Button>
        </div>
        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3 overflow-hidden">
          <p className="text-xs text-muted-foreground">
            After <strong>Run Phase 4 + 5</strong>, metrics below reflect the job output (or load range summaries).
            “Time-to-first” style rows count users whose <strong>first-ever</strong> Expansion DM / match-message click was
            logged on that UTC day (not average latency from signup).
          </p>
          {derivedRunError ? <p className="text-sm text-destructive">{derivedRunError}</p> : null}
          {derivedDaysToShow.length > 0 ? (
            <div className="max-h-[min(28rem,70vh)] min-h-0 overflow-y-auto overflow-x-hidden rounded-md border border-border bg-background pr-1">
              <div className="p-2">
                <FriendlyDerivedMetricsReport
                  days={derivedDaysToShow}
                  title={
                    highlightDerivedDays && highlightDerivedDays.length > 0
                      ? "Derived metrics — days processed in the last admin run"
                      : "Derived metrics — all days with data in the loaded range"
                  }
                />
              </div>
            </div>
          ) : null}
          {derivedRunResult ? (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Technical job response</summary>
              <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-all rounded border border-border bg-background p-2 mt-2 max-h-32 overflow-auto">
                {formatJson(derivedRunResult)}
              </pre>
            </details>
          ) : null}
        </div>
        <div>
          <p className="text-xs font-medium text-foreground mb-2">Download by phase (uses range above)</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={phaseDownloadBusy !== null}
              onClick={() => void downloadPhase23RawOnly()}
            >
              {phaseDownloadBusy === "raw" ? "Downloading…" : "Phase 2–3 raw (events)"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={phaseDownloadBusy !== null}
              onClick={() => void downloadPhase4DerivedPack()}
            >
              {phaseDownloadBusy === "p4" ? "Downloading…" : "Phase 4 summaries"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={phaseDownloadBusy !== null}
              onClick={() => void downloadPhase5DerivedPack()}
            >
              {phaseDownloadBusy === "p5" ? "Downloading…" : "Phase 5 derived"}
            </Button>
            <Button size="sm" disabled={exportBusy || phaseDownloadBusy !== null} onClick={() => void downloadFullBundle()}>
              {exportBusy ? "Building…" : "Full bundle (all layers)"}
            </Button>
          </div>
          {phaseDownloadStatus ? <p className="text-sm text-muted-foreground mt-2">{phaseDownloadStatus}</p> : null}
        </div>
        {rangeError ? <p className="text-sm text-destructive">{rangeError}</p> : null}
        {exportStatus ? <p className="text-sm text-muted-foreground">{exportStatus}</p> : null}
        {rangeSummaries?.daily_metrics_by_date ? (
          <details className="rounded-md border border-border bg-muted/10 p-2">
            <summary className="cursor-pointer text-xs font-medium text-foreground select-none">
              Raw JSON — daily_metrics by date (collapsed)
            </summary>
            <pre className="mt-2 max-h-52 overflow-auto rounded border border-border bg-background p-2 text-[11px] whitespace-pre-wrap break-all">
              {formatJson(rangeSummaries.daily_metrics_by_date)}
            </pre>
          </details>
        ) : null}
        {rangeSummaries?.derived_metrics_by_date ? (
          <details className="rounded-md border border-border bg-muted/10 p-2">
            <summary className="cursor-pointer text-xs font-medium text-foreground select-none">
              Raw JSON — derived_metrics by date (collapsed)
            </summary>
            <pre className="mt-2 max-h-52 overflow-auto rounded border border-border bg-background p-2 text-[11px] whitespace-pre-wrap break-all">
              {formatJson(rangeSummaries.derived_metrics_by_date)}
            </pre>
          </details>
        ) : null}
      </Card>
    </div>
  );
}
