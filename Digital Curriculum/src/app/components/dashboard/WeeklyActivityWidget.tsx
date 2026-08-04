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
import { verseThemeStyle } from "../../lib/verseTheme";
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

// MORTAR UI overhaul — unified dashboard accent (brick red).
const CARD_THEME = "#c1442a";

const DAY_MS = 86400000;

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

  // Activity count per day of the week (indexed from the week start, so it
  // works regardless of whether the week begins Sunday or Monday).
  const dayCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const item of items) {
      const idx = Math.floor((item.atMs - weekStartMs) / DAY_MS);
      if (idx >= 0 && idx < 7) counts[idx] += 1;
    }
    return counts;
  }, [items, weekStartMs]);
  const maxCount = Math.max(1, ...dayCounts);
  const activeDays = dayCounts.filter((c) => c > 0).length;
  const todayIdx = Math.floor((Date.now() - weekStartMs) / DAY_MS);

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
        className="rounded-none glass-card p-5 shadow-md cursor-pointer hover:border-verse/60 transition-colors"
        style={verseThemeStyle(CARD_THEME)}
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
            <div className="p-2 rounded-none bg-verse/10">
              <Activity className="w-5 h-5 text-verse" />
            </div>
            <div>
              <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground">
                <span className="font-technical text-xs text-verse mr-2 align-middle">07 /</span>Weekly snapshot
              </h2>
              <p className="font-technical text-[11px] uppercase tracking-wider text-muted-foreground">{weekLabel}</p>
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
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-headline font-black text-5xl leading-none text-verse mb-1">
                  {summary.total}
                </p>
                <p className="font-technical text-[11px] uppercase tracking-wider text-muted-foreground">
                  {summary.total === 1 ? "activity" : "activities"}
                  {summary.total > 0 && (
                    <>
                      {" "}· active {activeDays} of 7 days
                    </>
                  )}
                </p>
              </div>

              {/* 7-day mini bar chart — single hue (magnitude), baseline
                  stubs keep the week skeleton readable on empty days. */}
              <div className="flex items-end gap-[3px] h-16" aria-hidden={summary.total === 0}>
                {dayCounts.map((count, i) => {
                  const h = count === 0 ? 3 : Math.max(8, Math.round((count / maxCount) * 56));
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 w-4">
                      <div
                        title={`${format(new Date(weekStartMs + i * DAY_MS), "EEE")}: ${count} ${count === 1 ? "activity" : "activities"}`}
                        className={`w-3 rounded-none ${count === 0 ? "bg-white/15" : "bg-verse"}`}
                        style={{ height: `${h}px` }}
                      />
                      <span
                        className={`text-[9px] leading-none ${
                          i === todayIdx ? "text-verse font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(weekStartMs + i * DAY_MS), "EEEEE")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {summary.total === 0 ? (
              <p className="text-sm text-muted-foreground mt-3">
                No bricks laid yet this week — start a lesson and it shows up here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-3">
                {(
                  [
                    ["learning", summary.learning],
                    ["community", summary.community],
                    ["events", summary.events],
                  ] as const
                ).map(([key, count]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 rounded-none px-2.5 py-1 font-technical text-xs border border-white/10 bg-white/[0.04] text-foreground"
                  >
                    <span className="font-bold text-verse">{count}</span> {key}
                  </span>
                ))}
              </div>
            )}
            <p className="font-technical text-[11px] uppercase tracking-wider text-verse mt-3">Click to see your full week →</p>
          </>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="rounded-none max-w-lg max-h-[85vh] flex flex-col lesson-card-surface border-white/10"
          style={verseThemeStyle(CARD_THEME)}
        >
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wider">Your week in MORTAR</DialogTitle>
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
                    <p className="text-xs font-bold text-verse uppercase tracking-wider mb-2">
                      {format(day, "EEEE, MMM d")}
                    </p>
                    <ul className="space-y-2">
                      {dayItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex gap-3 p-3 rounded-none border border-white/10 bg-white/[0.04]"
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

          <Button
            type="button"
            variant="outline"
            className="mt-2 shrink-0 rounded-none border-verse text-verse hover:bg-verse/10"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
