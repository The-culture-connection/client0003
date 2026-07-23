import { useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow, isSameDay } from "date-fns";
import { Activity, ChevronRight, Loader2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import type { CourseProgress } from "../../lib/courseProgress";
import type { SkillCertificate } from "../../lib/dataroom";
import {
  analyticsRowsToWeeklyItems,
  buildLocalWeeklyActivityItems,
  fetchMyWeeklyActivityEvents,
  getCurrentWeekBoundsMs,
  mergeWeeklyActivityItems,
  summarizeWeeklyItems,
  type WeeklyActivityItem,
} from "../../lib/weeklyActivity";

type WeeklyActivityWidgetProps = {
  userId: string | undefined;
  certificates: SkillCertificate[];
  progressMap: Record<string, CourseProgress>;
  courseTitles: Record<string, string>;
};

export function WeeklyActivityWidget({
  userId,
  certificates,
  progressMap,
  courseTitles,
}: WeeklyActivityWidgetProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<WeeklyActivityItem[]>([]);

  const { weekStartMs, weekEndMs } = useMemo(() => getCurrentWeekBoundsMs(), []);
  const weekLabel = useMemo(
    () =>
      `${format(weekStartMs, "MMM d")} – ${format(weekEndMs, "MMM d, yyyy")}`,
    [weekStartMs, weekEndMs]
  );

  const load = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const local = buildLocalWeeklyActivityItems({
        weekStartMs,
        weekEndMs,
        certificates,
        progressMap,
        courseTitles,
      });
      let analyticsItems: WeeklyActivityItem[] = [];
      try {
        const rows = await fetchMyWeeklyActivityEvents(weekStartMs, weekEndMs);
        analyticsItems = analyticsRowsToWeeklyItems(rows);
      } catch (e) {
        console.warn("Weekly analytics fetch failed; showing local activity only.", e);
      }
      setItems(mergeWeeklyActivityItems(analyticsItems, local));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load weekly activity.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId, weekStartMs, weekEndMs, certificates, progressMap, courseTitles]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => summarizeWeeklyItems(items), [items]);

  const groupedByDay = useMemo(() => {
    const groups: { day: Date; items: WeeklyActivityItem[] }[] = [];
    for (const item of items) {
      const day = new Date(item.atMs);
      const last = groups[groups.length - 1];
      if (last && isSameDay(last.day, day)) {
        last.items.push(item);
      } else {
        groups.push({ day, items: [item] });
      }
    }
    return groups;
  }, [items]);

  return (
    <>
      <Card
        className="p-5 bg-card border-border shadow-md cursor-pointer hover:border-accent/40 transition-colors"
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent/10">
              <Activity className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Weekly snapshot</h2>
              <p className="text-xs text-muted-foreground">{weekLabel}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading activity…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className="text-2xl font-bold text-foreground mb-1">
              {summary.total}
              <span className="text-base font-normal text-muted-foreground ml-2">
                {summary.total === 1 ? "activity" : "activities"}
              </span>
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{summary.learning} learning</span>
              <span>·</span>
              <span>{summary.community} community</span>
              <span>·</span>
              <span>{summary.events} events</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Click to see your full week</p>
          </>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Your week in MORTAR</DialogTitle>
            <p className="text-sm text-muted-foreground">{weekLabel}</p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading…
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No tracked activity this week yet. Lessons, events, discussions, and certificates
                will show up here as you use MORTAR.
              </p>
            ) : (
              <div className="space-y-6">
                {groupedByDay.map(({ day, items: dayItems }) => (
                  <div key={day.toISOString()}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {format(day, "EEEE, MMM d")}
                    </p>
                    <ul className="space-y-2">
                      {dayItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex gap-3 p-3 rounded-lg border border-border bg-muted/30"
                        >
                          <div className="shrink-0 text-xs text-muted-foreground w-14 pt-0.5">
                            {format(new Date(item.atMs), "h:mm a")}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            {item.detail ? (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {item.detail}
                              </p>
                            ) : null}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(item.atMs), { addSuffix: true })}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="button" variant="outline" className="mt-2 shrink-0" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
