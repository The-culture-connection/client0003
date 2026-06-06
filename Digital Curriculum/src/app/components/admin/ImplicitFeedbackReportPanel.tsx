import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Loader2, RefreshCw, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

type ContextType = "lesson" | "quiz" | "checkout" | "navigation" | "community" | "general";

const CONTEXT_OPTIONS: { value: ContextType | ""; label: string }[] = [
  { value: "", label: "All contexts" },
  { value: "lesson", label: "Lesson" },
  { value: "quiz", label: "Quiz" },
  { value: "checkout", label: "Checkout" },
  { value: "navigation", label: "Navigation" },
  { value: "community", label: "Community" },
  { value: "general", label: "General" },
];

interface SurveyReport {
  response_count: number;
  exposure_count: number;
  participation_rate: number | null;
  avg_slider_sentiment: number | null;
  reaction_breakdown: Record<string, number>;
  sentiment_trend: Array<{ date: string; avg_sentiment: number | null; count: number }>;
  top_confusion_signals: Array<{ label: string; count: number }>;
  by_context: Record<string, { count: number; breakdown: Record<string, number> }>;
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function utcDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function pct(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

export function ImplicitFeedbackReportPanel() {
  const [contextType, setContextType] = useState<ContextType | "">("");
  const [startDate, setStartDate] = useState(() => utcDaysAgo(30));
  const [endDate, setEndDate] = useState(utcToday);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SurveyReport | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, "getSurveyIntelligenceReport");
      const res = await fn({
        ...(contextType ? { context_type: contextType } : {}),
        date_range: { start: startDate, end: endDate },
      });
      setReport(res.data as SurveyReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load survey report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reactionChartData = report
    ? Object.entries(report.reaction_breakdown)
        .sort(([, a], [, b]) => b - a)
        .map(([label, count]) => ({ label, count }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="ctx-filter">Context</Label>
          <select
            id="ctx-filter"
            value={contextType}
            onChange={(e) => setContextType(e.target.value as ContextType | "")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {CONTEXT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="start-date">Start date</Label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="end-date">End date</Label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>

        <Button onClick={load} disabled={loading} size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Load report
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Responses", value: report.response_count },
              { label: "Exposures", value: report.exposure_count },
              { label: "Participation rate", value: pct(report.participation_rate) },
              { label: "Avg sentiment (slider)", value: report.avg_slider_sentiment != null ? report.avg_slider_sentiment.toFixed(1) + "/5" : "—" },
            ].map(({ label, value }) => (
              <Card key={label} className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
              </Card>
            ))}
          </div>

          {/* Reaction breakdown bar chart */}
          {reactionChartData.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Reaction breakdown</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={reactionChartData}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Sentiment trend line chart */}
          {report.sentiment_trend.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-4">Sentiment trend (slider responses)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={report.sentiment_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="avg_sentiment"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Top confusion signals */}
          {report.top_confusion_signals.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Top confusion signals</h3>
              <div className="divide-y divide-border text-sm">
                {report.top_confusion_signals.map(({ label, count }) => (
                  <div key={label} className="flex justify-between py-2">
                    <span className="text-foreground">{label}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* By context breakdown */}
          {Object.keys(report.by_context).length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">By context</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">Context</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Responses</th>
                      <th className="text-left py-2 font-medium text-muted-foreground pl-4">Top reactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.entries(report.by_context).map(([ctx, { count, breakdown }]) => {
                      const topReactions = Object.entries(breakdown)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3)
                        .map(([l, c]) => `${l} (${c})`)
                        .join(", ");
                      return (
                        <tr key={ctx}>
                          <td className="py-2 capitalize">{ctx}</td>
                          <td className="py-2 text-right tabular-nums">{count}</td>
                          <td className="py-2 pl-4 text-muted-foreground">{topReactions}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {!loading && !error && !report && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Click "Load report" to fetch survey intelligence data.
        </div>
      )}
    </div>
  );
}
