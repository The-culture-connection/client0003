import { useCallback, useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Loader2, RefreshCw } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ScrollArea } from "../ui/scroll-area";
import { functions } from "../../lib/firebase";

type NumericMap = Record<string, number>;

interface DailySeriesRow {
  date_utc: string;
  dau: number;
  total_web_events: number;
  counts: NumericMap;
}

interface ReportingSnapshot {
  window_days: number;
  start_date_utc: string;
  end_date_utc: string;
  totals: { dau_sum: number; total_web_events: number; counts: NumericMap };
  daily_series?: DailySeriesRow[];
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

function pick(c: NumericMap, key: string): number {
  const v = c[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function pct(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function sumKeys(c: NumericMap, keys: string[]): number {
  return keys.reduce((s, k) => s + pick(c, k), 0);
}

const FRICTION_KEYS = [
  "auth_guard_redirect_unauthenticated",
  "onboarding_gate_redirect_incomplete_profile",
  "role_gate_redirect_denied",
  "dashboard_continue_url_invalid",
  "lesson_player_missing_query_params",
  "lesson_player_load_failed",
  "lesson_player_empty_content_viewed",
  "lesson_quiz_exhausted_viewed",
  "shop_add_to_cart_failed",
  "event_register_failed",
  "discussion_create_failed",
  "group_join_failed",
] as const;

const SHOP_INTENT_KEYS = [
  "shop_filter_changed",
  "shop_size_changed",
  "shop_add_to_cart_clicked",
  "cart_add_to_cart",
  "cart_dropdown_toggled",
  "cart_line_remove",
  "cart_continue_to_shop_clicked",
] as const;

const COMMUNITY_KEYS = [
  "community_discussion_preview_clicked",
  "community_start_discussion_clicked",
  "community_hero_rsvp_clicked",
  "discussions_created",
  "discussion_replies",
  "discussion_like_toggled",
  "dms_sent",
  "group_message_send_clicked",
  "groups_joined",
  "discussion_category_selected",
  "discussion_draft_next_clicked",
  "mortar_dm_reply_thread_selected",
  "event_registrations",
  "event_unregistrations",
  "discussions_search_changed",
] as const;

const LEARNING_KEYS = [
  "lessons_started",
  "curriculum_course_card_clicks",
  "lesson_slide_next_clicked",
  "lesson_slide_previous_clicked",
  "lesson_quiz_view_opened",
  "lesson_quiz_answer_selected",
  "lesson_quiz_submit_clicked",
  "quizzes_passed",
  "quizzes_failed",
  "lesson_quiz_try_again_clicked",
  "lesson_survey_field_changed",
  "lesson_survey_submit_clicked",
  "lesson_close_clicked",
  "lessons_completed",
  "lesson_certificate_created",
] as const;

const ADMIN_ACTIVITY_KEYS = [
  "admin_course_builder_save_clicked",
  "admin_lesson_deck_publish_clicked",
  "admin_event_create_submitted",
  "admin_shop_item_created",
] as const;

function MetricTable({ rows }: { rows: { label: string; value: number }[] }) {
  return (
    <div className="rounded-md border border-border overflow-hidden text-sm">
      <table className="w-full text-left">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border last:border-0">
              <td className="px-3 py-2 text-muted-foreground">{r.label}</td>
              <td className="px-3 py-2 font-medium text-right tabular-nums">{r.value.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DailyTrendBars({
  title,
  series,
  keys,
}: {
  title: string;
  series: DailySeriesRow[];
  keys: string[];
}) {
  const points = series.map((row) => ({
    date: row.date_utc.slice(5),
    value: sumKeys(row.counts, keys),
  }));
  const max = Math.max(1, ...points.map((p) => p.value));
  const barMaxPx = 72;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="flex items-end gap-0.5 min-h-[88px]">
        {points.map((p) => (
          <div key={p.date} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${p.date}: ${p.value}`}>
            <div
              className="w-full max-w-[12px] mx-auto rounded-sm bg-accent/80"
              style={{ height: `${Math.max(3, (p.value / max) * barMaxPx)}px` }}
            />
            <span className="text-[9px] text-muted-foreground truncate w-full text-center">{p.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type RawRow = {
  id: string;
  event_name: string | null;
  user_id: string | null;
  route_path: string | null;
  screen_session_id: string | null;
  screen_name: string | null;
  created_at_ms: number | null;
  properties: unknown;
  source: string | null;
  ingested_via: string | null;
};

export function AdminGoalReportsPanel() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ReportingSnapshot | null>(null);

  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const [rawEvents, setRawEvents] = useState<RawRow[]>([]);

  const loadSnapshot = useCallback(async (windowDays: number) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, "getPhase5DashboardMetrics");
      const res = await fn({ days: windowDays, include_debug: false });
      const data = res.data as { success?: boolean; snapshot?: ReportingSnapshot };
      if (!data?.success || !data.snapshot) throw new Error("Missing analytics snapshot");
      setSnapshot(data.snapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load metrics");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot(days);
  }, [days, loadSnapshot]);

  const loadRaw = async () => {
    setRawLoading(true);
    setRawError(null);
    try {
      const fn = httpsCallable(functions, "queryAdminWebAnalyticsEvents");
      const res = await fn({ limit: 50 });
      const data = res.data as { success?: boolean; events?: RawRow[] };
      if (!data?.success || !Array.isArray(data.events)) throw new Error("Invalid raw response");
      setRawEvents(data.events);
    } catch (e) {
      setRawError(e instanceof Error ? e.message : "Failed to load raw events");
      setRawEvents([]);
    } finally {
      setRawLoading(false);
    }
  };

  const c = snapshot?.totals.counts ?? {};
  const series = snapshot?.daily_series ?? [];

  const frictionTotal = useMemo(() => sumKeys(c, [...FRICTION_KEYS]), [c]);

  const overviewRows = useMemo(
    () => [
      { label: "DAU (sum over window)", value: snapshot?.totals.dau_sum ?? 0 },
      { label: "Signups", value: pick(c, "signups") },
      { label: "Onboarding completions", value: pick(c, "onboarding_completions") },
      { label: "Lesson starts (rollup)", value: pick(c, "lessons_started") },
      { label: "Lesson completions", value: pick(c, "lessons_completed") },
      { label: "Discussions created", value: pick(c, "discussions_created") },
      { label: "DM messages sent", value: pick(c, "dms_sent") },
      { label: "Add to cart (shop + legacy)", value: pick(c, "shop_add_to_cart_clicked") + pick(c, "cart_add_to_cart") },
      { label: "Friction events (summed)", value: frictionTotal },
    ],
    [snapshot, c, frictionTotal]
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Reports</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Goal-oriented views over <code className="text-xs bg-muted px-1">daily_metrics</code> rollups and
              precomputed funnels. Layer A (raw events) is for QA only. Summaries match badge evaluation inputs
              where counters overlap (<code className="text-xs bg-muted px-1">user_analytics_summary</code>).
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
            <Button variant="outline" size="sm" onClick={() => void loadSnapshot(days)} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {snapshot ? (
          <p className="text-xs text-muted-foreground mt-3">
            Window: {snapshot.start_date_utc} → {snapshot.end_date_utc} ({snapshot.window_days} days, UTC)
          </p>
        ) : null}
      </Card>

      {error ? (
        <Card className="p-4 border-destructive/40 bg-destructive/10 text-destructive text-sm">{error}</Card>
      ) : null}

      {!loading && snapshot ? (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 max-w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="conversion">Conversion</TabsTrigger>
            <TabsTrigger value="learning">Learning</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="shop">Shop</TabsTrigger>
            <TabsTrigger value="friction">Friction</TabsTrigger>
            <TabsTrigger value="users">Users / segments</TabsTrigger>
            <TabsTrigger value="admin">Admin activity</TabsTrigger>
            <TabsTrigger value="raw">Raw explorer</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Daily overview (first wave)</h3>
              <p className="text-xs text-muted-foreground">
                Operational health: activity volume, completions, commerce intent, and summed friction signals.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricTable rows={overviewRows} />
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded border border-border p-2">
                      <span className="text-muted-foreground text-xs">Lesson completion rate</span>
                      <p className="text-lg font-semibold">{pct(snapshot.derived.lesson_completion_rate)}</p>
                    </div>
                    <div className="rounded border border-border p-2">
                      <span className="text-muted-foreground text-xs">Quiz pass rate</span>
                      <p className="text-lg font-semibold">{pct(snapshot.derived.quiz_pass_rate)}</p>
                    </div>
                  </div>
                  {series.length > 0 ? (
                    <DailyTrendBars title="Lesson completions by day" series={series} keys={["lessons_completed"]} />
                  ) : (
                    <p className="text-xs text-muted-foreground">Per-day series not available (deploy latest functions).</p>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="conversion" className="space-y-4">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">B6 — Auth & onboarding funnel (counters)</h3>
              <p className="text-xs text-muted-foreground">
                Median time-to-step requires session linking (Layer C). This tab lists volume counters that feed future
                conversion timing reports.
              </p>
              <div className="rounded border border-border p-3 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Sign-ups + sign-ins → onboarding done → DAU Σ:</span>{" "}
                  {snapshot.funnels.login_to_onboarding_to_dashboard.login} →{" "}
                  {snapshot.funnels.login_to_onboarding_to_dashboard.onboarding_completed} →{" "}
                  {snapshot.funnels.login_to_onboarding_to_dashboard.dashboard_active}
                </p>
              </div>
              <MetricTable
                rows={[
                  { label: "login submit attempted", value: pick(c, "login_submit_attempted") },
                  { label: "login sign ins (success)", value: pick(c, "login_sign_ins") },
                  { label: "login sign in failed", value: pick(c, "login_sign_in_failed") },
                  { label: "onboarding step viewed", value: pick(c, "onboarding_step_viewed") },
                  { label: "onboarding partial save", value: pick(c, "onboarding_partial_save_succeeded") },
                  { label: "onboarding skip", value: pick(c, "onboarding_skip_clicked") },
                  { label: "onboarding completion viewed", value: pick(c, "onboarding_completion_viewed") },
                  { label: "nav link clicked", value: pick(c, "nav_link_clicked") },
                ]}
              />
            </Card>
          </TabsContent>

          <TabsContent value="learning" className="space-y-4">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">B3 / B4 — Learning funnel & depth</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Funnel uses rolled-up counters (same source as Analytics tab). Supporting metrics below expand on
                lesson player and quiz behavior as they are written to <code className="text-xs bg-muted px-1">daily_metrics.counts</code>.
              </p>
              <div className="rounded border border-border p-3 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Dashboard → curriculum → lesson:</span>{" "}
                  {snapshot.funnels.dashboard_to_curriculum_to_lesson.dashboard} →{" "}
                  {snapshot.funnels.dashboard_to_curriculum_to_lesson.curriculum_engaged} →{" "}
                  {snapshot.funnels.dashboard_to_curriculum_to_lesson.lesson_started} (rates{" "}
                  {pct(snapshot.funnels.dashboard_to_curriculum_to_lesson.dashboard_to_curriculum_rate)} /{" "}
                  {pct(snapshot.funnels.dashboard_to_curriculum_to_lesson.curriculum_to_lesson_rate)})
                </p>
                <p>
                  <span className="text-muted-foreground">Lesson → completion:</span>{" "}
                  {snapshot.funnels.lesson_to_completion.lesson_started} → {snapshot.funnels.lesson_to_completion.lesson_completed}{" "}
                  ({pct(snapshot.funnels.lesson_to_completion.completion_rate)})
                </p>
              </div>
              <MetricTable
                rows={[...LEARNING_KEYS].map((k) => ({
                  label: k.replace(/_/g, " "),
                  value: pick(c, k),
                }))}
              />
              {series.length > 0 ? (
                <DailyTrendBars
                  title="Trend: quiz submits vs passes (daily)"
                  series={series}
                  keys={["lesson_quiz_submit_clicked", "quizzes_passed"]}
                />
              ) : null}
            </Card>
          </TabsContent>

          <TabsContent value="community" className="space-y-4">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">B2 — Community engagement</h3>
              <div className="rounded border border-border p-3 text-sm">
                <span className="text-muted-foreground">Surface → engagement:</span>{" "}
                {snapshot.funnels.community_to_engagement.community_visits} →{" "}
                {snapshot.funnels.community_to_engagement.engagements} (
                {pct(snapshot.funnels.community_to_engagement.engagement_rate)})
              </div>
              <MetricTable rows={[...COMMUNITY_KEYS].map((k) => ({ label: k.replace(/_/g, " "), value: pick(c, k) }))}
              />
              {series.length > 0 ? (
                <DailyTrendBars title="Discussions + replies (daily)" series={series} keys={["discussions_created", "discussion_replies"]} />
              ) : null}
            </Card>
          </TabsContent>

          <TabsContent value="shop" className="space-y-4">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">B1 — Shop intent & cart</h3>
              <div className="rounded border border-border p-3 text-sm">
                <span className="text-muted-foreground">Shop visits → add to cart:</span>{" "}
                {snapshot.funnels.shop_to_add_to_cart.shop_visits} → {snapshot.funnels.shop_to_add_to_cart.add_to_cart} (
                {pct(snapshot.funnels.shop_to_add_to_cart.add_to_cart_rate)})
              </div>
              <MetricTable rows={[...SHOP_INTENT_KEYS].map((k) => ({ label: k.replace(/_/g, " "), value: pick(c, k) }))} />
              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1">derived_cart_abandonment_24h</code> is reserved on{" "}
                <code className="bg-muted px-1">daily_metrics.derived</code>; wire-up is scheduled analytics (not yet surfaced here).
              </p>
              {series.length > 0 ? (
                <DailyTrendBars title="Add to cart (daily, shop + legacy keys)" series={series} keys={["shop_add_to_cart_clicked", "cart_add_to_cart"]} />
              ) : null}
            </Card>
          </TabsContent>

          <TabsContent value="friction" className="space-y-4">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">B5 — Drop-off / friction</h3>
              <p className="text-xs text-muted-foreground">
                Counts increment when authenticated clients emit these events. Pre-auth friction may appear only in
                raw explorer.
              </p>
              <MetricTable rows={[...FRICTION_KEYS].map((k) => ({ label: k.replace(/_/g, " "), value: pick(c, k) }))} />
              <p className="text-sm">
                <span className="text-muted-foreground">Total (window):</span>{" "}
                <span className="font-semibold tabular-nums">{frictionTotal.toLocaleString()}</span>
              </p>
              {series.length > 0 ? (
                <DailyTrendBars title="Friction events per day (summed)" series={series} keys={[...FRICTION_KEYS]} />
              ) : null}
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">B7 — Users / habits (summary-backed)</h3>
              <p className="text-xs text-muted-foreground">
                Cohort tables, lurker vs power segmentation, and badge eligibility dashboards share the same
                counters as <code className="text-xs bg-muted px-1">user_analytics_summary</code> — extended UI is
                planned; this panel surfaces headline risk signals from the Phase 5 snapshot.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded border border-border p-3">
                  Dormant summaries (7d+ inactive):{" "}
                  <span className="font-semibold">{snapshot.derived.churn_risk_indicators.dormant_users_7d}</span>
                </div>
                <div className="rounded border border-border p-3">
                  Low streak (≤1 day):{" "}
                  <span className="font-semibold">{snapshot.derived.churn_risk_indicators.low_streak_users}</span>
                </div>
                <div className="rounded border border-border p-3">
                  Engagement rate (engagement / DAU Σ):{" "}
                  <span className="font-semibold">{pct(snapshot.derived.engagement_rate)}</span>
                </div>
              </div>
              <MetricTable
                rows={[
                  { label: "Screen sessions started", value: pick(c, "screen_session_started") },
                  { label: "Screen sessions ended", value: pick(c, "screen_session_ended") },
                  { label: "Passive dashboard time events", value: pick(c, "dashboard_passive_time_on_screen") },
                  { label: "Data room file search", value: pick(c, "data_room_file_search_changed") },
                  { label: "Discussions search", value: pick(c, "discussions_search_changed") },
                  { label: "Notification clicks", value: pick(c, "notification_item_clicked") },
                  { label: "Notification mark read (backend)", value: pick(c, "notification_mark_read_backend") },
                  { label: "Onboarding nudges sent", value: pick(c, "onboarding_nudges_sent") },
                ]}
              />
            </Card>
          </TabsContent>

          <TabsContent value="admin" className="space-y-4">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Admin builder activity</h3>
              <MetricTable rows={[...ADMIN_ACTIVITY_KEYS].map((k) => ({ label: k.replace(/_/g, " "), value: pick(c, k) }))} />
            </Card>
          </TabsContent>

          <TabsContent value="raw" className="space-y-4">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Layer A — Raw event explorer</h3>
              <p className="text-xs text-muted-foreground">
                Recent normalized web events (<code className="bg-muted px-1">analytics_events</code>). Use to verify
                instrumentation and investigate anomalies. Not for executive reporting.
              </p>
              <Button variant="outline" size="sm" onClick={() => void loadRaw()} disabled={rawLoading}>
                {rawLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Load latest 50 events
              </Button>
              {rawError ? <p className="text-sm text-destructive">{rawError}</p> : null}
              {rawEvents.length > 0 ? (
                <ScrollArea className="h-[420px] rounded-md border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                      <tr>
                        <th className="p-2">Time</th>
                        <th className="p-2">Event</th>
                        <th className="p-2">User</th>
                        <th className="p-2">Route</th>
                        <th className="p-2">Screen</th>
                        <th className="p-2">Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawEvents.map((ev) => (
                        <tr key={ev.id} className="border-t border-border align-top">
                          <td className="p-2 whitespace-nowrap tabular-nums">
                            {ev.created_at_ms != null ? new Date(ev.created_at_ms).toISOString() : "—"}
                          </td>
                          <td className="p-2 font-mono break-all">{ev.event_name ?? "—"}</td>
                          <td className="p-2 font-mono break-all max-w-[120px]">{ev.user_id ?? "—"}</td>
                          <td className="p-2 break-all max-w-[140px]">{ev.route_path ?? "—"}</td>
                          <td className="p-2 break-all max-w-[120px]">{ev.screen_name ?? "—"}</td>
                          <td className="p-2 font-mono break-all max-w-[100px]">{ev.screen_session_id ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              ) : null}
              {rawEvents.length > 0 ? (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Sample properties JSON (first row)</summary>
                  <pre className="mt-2 p-2 rounded bg-muted overflow-x-auto max-h-48">
                    {JSON.stringify(rawEvents[0]?.properties ?? {}, null, 2)}
                  </pre>
                </details>
              ) : null}
            </Card>
          </TabsContent>
        </Tabs>
      ) : loading ? (
        <Card className="p-8 flex justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </Card>
      ) : null}
    </div>
  );
}
