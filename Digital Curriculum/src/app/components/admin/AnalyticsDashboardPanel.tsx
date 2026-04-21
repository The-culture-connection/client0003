import { useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Loader2, RefreshCw, Download } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { functions } from "../../lib/firebase";

const RAW_EXPORT_PAGE = 500;
const MAX_RAW_EXPORT_ROWS = 100_000;

function utcDateStringShiftDays(from: Date, deltaDays: number): string {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function utcRangeInclusiveBounds(
  startDay: string,
  endDay: string
): { afterMs: number; beforeMs: number } {
  const [sy, sm, sd] = startDay.split("-").map(Number);
  const [ey, em, ed] = endDay.split("-").map(Number);
  const afterMs = Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0);
  const beforeMs = Date.UTC(ey, em - 1, ed, 23, 59, 59, 999);
  return { afterMs, beforeMs };
}

interface Phase5DebugPayload {
  uid: string;
  auth_path: "token" | "server_lookup";
  roles_token_raw: unknown;
  roles_token_normalized: string[];
  roles_auth_custom_claims_normalized: string[];
  roles_firestore_normalized: string[];
  window: { days: number; start_date_utc: string; end_date_utc: string };
  totals_counts: Record<string, number>;
  totals_counts_key_count: number;
}

interface Phase5Snapshot {
  window_days: number;
  start_date_utc: string;
  end_date_utc: string;
  totals: {
    dau_sum: number;
    total_web_events: number;
    counts: Record<string, number>;
  };
  /** Present when Cloud Functions snapshot includes per-day rows (goal reports / trends). */
  daily_series?: Array<{ date_utc: string; dau: number; total_web_events: number; counts: Record<string, number> }>;
  derived: {
    onboarding_completion_rate: number | null;
    lesson_completion_rate: number | null;
    quiz_pass_rate: number | null;
    engagement_rate: number | null;
    churn_risk_indicators: {
      dormant_users_7d: number;
      low_streak_users: number;
      churn_risk_ratio: number | null;
    };
  };
  funnels: {
    login_to_onboarding_to_dashboard: {
      login: number;
      onboarding_completed: number;
      dashboard_active: number;
      login_to_onboarding_rate: number | null;
      onboarding_to_dashboard_rate: number | null;
    };
    dashboard_to_curriculum_to_lesson: {
      dashboard: number;
      curriculum_engaged: number;
      lesson_started: number;
      dashboard_to_curriculum_rate: number | null;
      curriculum_to_lesson_rate: number | null;
    };
    lesson_to_completion: {
      lesson_started: number;
      lesson_completed: number;
      completion_rate: number | null;
    };
    community_to_engagement: {
      community_visits: number;
      engagements: number;
      engagement_rate: number | null;
    };
    shop_to_add_to_cart: {
      shop_visits: number;
      add_to_cart: number;
      add_to_cart_rate: number | null;
    };
  };
}

function pct(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

export function AnalyticsDashboardPanel() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Phase5Snapshot | null>(null);
  const [debugPayload, setDebugPayload] = useState<Phase5DebugPayload | null>(null);

  const [rawStart, setRawStart] = useState(() => utcDateStringShiftDays(new Date(), -7));
  const [rawEnd, setRawEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [rawExporting, setRawExporting] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const [rawProgress, setRawProgress] = useState<string | null>(null);

  const load = async (windowDays: number) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, "getPhase5DashboardMetrics");
      const res = await fn({ days: windowDays, include_debug: true });
      const data = res.data as {
        success?: boolean;
        snapshot?: Phase5Snapshot;
        debug?: Phase5DebugPayload;
      };
      if (!data?.success || !data.snapshot) {
        throw new Error("Missing analytics snapshot");
      }
      setSnapshot(data.snapshot);
      setDebugPayload(data.debug ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load analytics metrics";
      setError(msg);
      setSnapshot(null);
      setDebugPayload(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const downloadRawAnalyticsEvents = async () => {
    setRawError(null);
    setRawProgress(null);
    const { afterMs, beforeMs } = utcRangeInclusiveBounds(rawStart, rawEnd);
    if (Number.isNaN(afterMs) || Number.isNaN(beforeMs)) {
      setRawError("Use valid YYYY-MM-DD dates.");
      return;
    }
    if (beforeMs < afterMs) {
      setRawError("End date must be on or after start date.");
      return;
    }
    setRawExporting(true);
    try {
      const fn = httpsCallable(functions, "queryAdminAnalyticsEventsDateRange");
      const normalized: Record<string, unknown>[] = [];
      const legacy: Record<string, unknown>[] = [];

      for (const stream of ["normalized", "legacy"] as const) {
        let cursor: string | undefined;
        let page = 0;
        do {
          page += 1;
          setRawProgress(`${stream}… page ${page}`);
          const res = await fn({
            stream,
            created_after_ms: afterMs,
            created_before_ms: beforeMs,
            limit: RAW_EXPORT_PAGE,
            ...(cursor ? { start_after_id: cursor } : {}),
          });
          const d = res.data as {
            success?: boolean;
            events?: Record<string, unknown>[];
            next_cursor?: string | null;
          };
          if (!d.success || !Array.isArray(d.events)) {
            throw new Error("Invalid server response");
          }
          const bucket = stream === "normalized" ? normalized : legacy;
          bucket.push(...d.events);
          if (normalized.length + legacy.length > MAX_RAW_EXPORT_ROWS) {
            throw new Error(`Export exceeds ${MAX_RAW_EXPORT_ROWS} rows; narrow the date range.`);
          }
          if (!d.next_cursor || d.events.length === 0) break;
          cursor = d.next_cursor ?? undefined;
        } while (true);
      }

      const payload = {
        export_label: "analytics_events_raw_range",
        range: {
          start_date_utc: rawStart,
          end_date_utc: rawEnd,
          created_after_ms: afterMs,
          created_before_ms: beforeMs,
        },
        analytics_events_normalized_created_at: normalized,
        analytics_events_legacy_timestamp: legacy,
        counts: { normalized_created_at: normalized.length, legacy_timestamp: legacy.length },
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics_events_raw_${rawStart}_${rawEnd}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setRawProgress(`Done — ${normalized.length} normalized + ${legacy.length} legacy rows.`);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : e instanceof Error
            ? e.message
            : "Export failed";
      setRawError(msg);
      setRawProgress(null);
    } finally {
      setRawExporting(false);
    }
  };

  const topCounters = useMemo(() => {
    const c = snapshot?.totals.counts ?? {};
    return [
      { label: "Lessons started", value: c.lessons_started ?? 0 },
      { label: "Lessons completed", value: c.lessons_completed ?? 0 },
      { label: "Quiz passed", value: c.quizzes_passed ?? 0 },
      { label: "Quiz failed", value: c.quizzes_failed ?? 0 },
      { label: "Discussions created", value: c.discussions_created ?? 0 },
      { label: "DMs sent", value: c.dms_sent ?? 0 },
      { label: "Event registrations", value: c.event_registrations ?? 0 },
      { label: "Cart add-to-cart", value: c.cart_add_to_cart ?? 0 },
    ];
  }, [snapshot]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Phase 5 derived metrics and funnels from centralized backend calculations. A collapsible debug
              payload (roles + aggregated <code className="text-xs">totals.counts</code>) is included for live
              verification; remove when stable.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load(days)}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-1">Raw Firestore export</h3>
          <p className="text-xs text-muted-foreground mb-3 max-w-3xl">
            Download JSON for <code className="text-[11px] bg-muted px-1 rounded">analytics_events</code> using
            inclusive UTC calendar days. The file includes two passes: documents with{" "}
            <code className="text-[11px] bg-muted px-1 rounded">created_at</code> in range (web + normalized server
            writes), then documents with <code className="text-[11px] bg-muted px-1 rounded">timestamp</code> in range
            (older <code className="text-[11px] bg-muted px-1 rounded">event_type</code> rows). Callable{" "}
            <code className="text-[11px] bg-muted px-1 rounded">queryAdminAnalyticsEventsDateRange</code> (max 92 days
            per request; client pages until each stream is exhausted).
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="raw-export-start" className="text-xs text-muted-foreground">
                Start (UTC date)
              </Label>
              <input
                id="raw-export-start"
                type="date"
                value={rawStart}
                onChange={(e) => setRawStart(e.target.value)}
                disabled={rawExporting}
                className="px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="raw-export-end" className="text-xs text-muted-foreground">
                End (UTC date)
              </Label>
              <input
                id="raw-export-end"
                type="date"
                value={rawEnd}
                onChange={(e) => setRawEnd(e.target.value)}
                disabled={rawExporting}
                className="px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void downloadRawAnalyticsEvents()}
              disabled={rawExporting}
            >
              {rawExporting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download raw JSON
            </Button>
          </div>
          {rawError ? (
            <p className="text-xs text-destructive mt-2" role="alert">
              {rawError}
            </p>
          ) : null}
          {rawProgress ? <p className="text-xs text-muted-foreground mt-2">{rawProgress}</p> : null}
        </div>

        {snapshot ? (
          <p className="text-xs text-muted-foreground mt-3">
            Window: {snapshot.start_date_utc} to {snapshot.end_date_utc} ({snapshot.window_days} days)
          </p>
        ) : null}
      </Card>

      {error ? (
        <Card className="p-4 border-destructive/40 bg-destructive/10 text-destructive text-sm">
          {error}
        </Card>
      ) : null}

      {!loading && snapshot ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4"><p className="text-xs text-muted-foreground">DAU (sum)</p><p className="text-2xl font-semibold">{snapshot.totals.dau_sum}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted-foreground">Total web events</p><p className="text-2xl font-semibold">{snapshot.totals.total_web_events}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted-foreground">Onboarding completion rate</p><p className="text-2xl font-semibold">{pct(snapshot.derived.onboarding_completion_rate)}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted-foreground">Engagement rate</p><p className="text-2xl font-semibold">{pct(snapshot.derived.engagement_rate)}</p></Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Derived Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div className="rounded border border-border p-3">Lesson completion rate: <span className="font-semibold">{pct(snapshot.derived.lesson_completion_rate)}</span></div>
              <div className="rounded border border-border p-3">Quiz pass rate: <span className="font-semibold">{pct(snapshot.derived.quiz_pass_rate)}</span></div>
              <div className="rounded border border-border p-3">Churn risk ratio: <span className="font-semibold">{pct(snapshot.derived.churn_risk_indicators.churn_risk_ratio)}</span></div>
              <div className="rounded border border-border p-3">Dormant users (7d): <span className="font-semibold">{snapshot.derived.churn_risk_indicators.dormant_users_7d}</span></div>
              <div className="rounded border border-border p-3">Low streak users: <span className="font-semibold">{snapshot.derived.churn_risk_indicators.low_streak_users}</span></div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Funnels</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Counts come from rolled-up <code className="text-xs bg-muted px-1">daily_metrics.counts</code> (plus DAU sum for the third step below). After deploy, new events fill forward; historical days keep prior counters unless you backfill.
            </p>
            <div className="space-y-3 text-sm">
              <div
                className="rounded border border-border p-3"
                title="Step 1: signups + login_sign_ins. Step 3: sum of daily DAU (user-days), not unique users."
              >
                sign-ups + sign-ins → onboarding done → active user-days (DAU Σ):{" "}
                {snapshot.funnels.login_to_onboarding_to_dashboard.login} →{" "}
                {snapshot.funnels.login_to_onboarding_to_dashboard.onboarding_completed} →{" "}
                {snapshot.funnels.login_to_onboarding_to_dashboard.dashboard_active} (rates:{" "}
                {pct(snapshot.funnels.login_to_onboarding_to_dashboard.login_to_onboarding_rate)} /{" "}
                {pct(snapshot.funnels.login_to_onboarding_to_dashboard.onboarding_to_dashboard_rate)})
              </div>
              <div
                className="rounded border border-border p-3"
                title="Curriculum step = lesson start signals + course card clicks. Lesson = same lesson_started counter as rollup."
              >
                active user-days (DAU Σ) → curriculum signals → lesson starts:{" "}
                {snapshot.funnels.dashboard_to_curriculum_to_lesson.dashboard} →{" "}
                {snapshot.funnels.dashboard_to_curriculum_to_lesson.curriculum_engaged} →{" "}
                {snapshot.funnels.dashboard_to_curriculum_to_lesson.lesson_started} (rates:{" "}
                {pct(snapshot.funnels.dashboard_to_curriculum_to_lesson.dashboard_to_curriculum_rate)} /{" "}
                {pct(snapshot.funnels.dashboard_to_curriculum_to_lesson.curriculum_to_lesson_rate)})
              </div>
              <div className="rounded border border-border p-3">
                lesson starts → completions: {snapshot.funnels.lesson_to_completion.lesson_started} →{" "}
                {snapshot.funnels.lesson_to_completion.lesson_completed} (rate:{" "}
                {pct(snapshot.funnels.lesson_to_completion.completion_rate)})
              </div>
              <div
                className="rounded border border-border p-3"
                title="Visits include discussions search/category plus community hub preview/start/RSVP interactions."
              >
                community surface → deeper engagement: {snapshot.funnels.community_to_engagement.community_visits} →{" "}
                {snapshot.funnels.community_to_engagement.engagements} (rate:{" "}
                {pct(snapshot.funnels.community_to_engagement.engagement_rate)})
              </div>
              <div
                className="rounded border border-border p-3"
                title="Shop visits max(filter/size changes, add-to-cart) so add-to-cart without filter tweaks still counts."
              >
                shop visits → add to cart: {snapshot.funnels.shop_to_add_to_cart.shop_visits} →{" "}
                {snapshot.funnels.shop_to_add_to_cart.add_to_cart} (rate:{" "}
                {pct(snapshot.funnels.shop_to_add_to_cart.add_to_cart_rate)})
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Key Counters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {topCounters.map((x) => (
                <div key={x.label} className="rounded border border-border p-3">
                  <p className="text-muted-foreground">{x.label}</p>
                  <p className="text-lg font-semibold">{x.value}</p>
                </div>
              ))}
            </div>
          </Card>

          {debugPayload ? (
            <Card className="p-6">
              <details className="group">
                <summary className="cursor-pointer font-semibold text-foreground list-none [&::-webkit-details-marker]:hidden">
                  <span className="underline-offset-2 group-open:underline">Debug payload (from callable)</span>
                </summary>
                <p className="text-xs text-muted-foreground mt-2 mb-2">
                  Compare <code className="text-xs bg-muted px-1">auth_path</code>, role arrays, and{" "}
                  <code className="text-xs bg-muted px-1">totals_counts</code> with Firestore{" "}
                  <code className="text-xs bg-muted px-1">daily_metrics</code> for the same window.
                </p>
                <pre className="text-xs overflow-auto max-h-96 rounded border border-border bg-muted/30 p-3 text-foreground">
                  {JSON.stringify(debugPayload, null, 2)}
                </pre>
              </details>
            </Card>
          ) : null}
        </>
      ) : null}

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Loading analytics snapshot...
        </Card>
      ) : null}
    </div>
  );
}
