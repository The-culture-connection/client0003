import { useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Loader2, RefreshCw } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { functions } from "../../lib/firebase";

interface Phase5Snapshot {
  window_days: number;
  start_date_utc: string;
  end_date_utc: string;
  totals: {
    dau_sum: number;
    total_web_events: number;
    counts: Record<string, number>;
  };
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

  const load = async (windowDays: number) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, "getPhase5DashboardMetrics");
      const res = await fn({ days: windowDays });
      const data = res.data as { success?: boolean; snapshot?: Phase5Snapshot };
      if (!data?.success || !data.snapshot) {
        throw new Error("Missing analytics snapshot");
      }
      setSnapshot(data.snapshot);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load analytics metrics";
      setError(msg);
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

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
              Phase 5 derived metrics and funnels from centralized backend calculations.
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
            <div className="space-y-3 text-sm">
              <div className="rounded border border-border p-3">login → onboarding → dashboard: {snapshot.funnels.login_to_onboarding_to_dashboard.login} → {snapshot.funnels.login_to_onboarding_to_dashboard.onboarding_completed} → {snapshot.funnels.login_to_onboarding_to_dashboard.dashboard_active} (rates: {pct(snapshot.funnels.login_to_onboarding_to_dashboard.login_to_onboarding_rate)} / {pct(snapshot.funnels.login_to_onboarding_to_dashboard.onboarding_to_dashboard_rate)})</div>
              <div className="rounded border border-border p-3">dashboard → curriculum → lesson: {snapshot.funnels.dashboard_to_curriculum_to_lesson.dashboard} → {snapshot.funnels.dashboard_to_curriculum_to_lesson.curriculum_engaged} → {snapshot.funnels.dashboard_to_curriculum_to_lesson.lesson_started} (rates: {pct(snapshot.funnels.dashboard_to_curriculum_to_lesson.dashboard_to_curriculum_rate)} / {pct(snapshot.funnels.dashboard_to_curriculum_to_lesson.curriculum_to_lesson_rate)})</div>
              <div className="rounded border border-border p-3">lesson → completion: {snapshot.funnels.lesson_to_completion.lesson_started} → {snapshot.funnels.lesson_to_completion.lesson_completed} (rate: {pct(snapshot.funnels.lesson_to_completion.completion_rate)})</div>
              <div className="rounded border border-border p-3">community → engagement: {snapshot.funnels.community_to_engagement.community_visits} → {snapshot.funnels.community_to_engagement.engagements} (rate: {pct(snapshot.funnels.community_to_engagement.engagement_rate)})</div>
              <div className="rounded border border-border p-3">shop → add to cart: {snapshot.funnels.shop_to_add_to_cart.shop_visits} → {snapshot.funnels.shop_to_add_to_cart.add_to_cart} (rate: {pct(snapshot.funnels.shop_to_add_to_cart.add_to_cart_rate)})</div>
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
