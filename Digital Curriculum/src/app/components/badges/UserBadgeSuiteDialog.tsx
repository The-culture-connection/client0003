import { useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, doc, onSnapshot, query } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ANALYTICS_COLLECTIONS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card } from "../ui/card";
import { Loader2, Medal } from "lucide-react";

const BADGE_DEFINITIONS = "badge_definitions";

type AwardMode = "one_time" | "repeatable" | string | undefined;

interface RuleShape {
  metric_key?: string;
  operator?: string;
  threshold?: number;
}

interface BadgeDefinitionDoc {
  id: string;
  name?: string;
  description?: string;
  image_url?: string;
  /** `digital_curriculum` | `expansion_mobile` | `both` — missing = both (legacy). */
  platform?: string;
  active?: boolean;
  award_mode?: AwardMode;
  rule?: RuleShape | null;
  /** Expansion legacy */
  criteria?: Record<string, unknown>;
}

interface AwardedDoc {
  times_awarded?: number;
  last_metric_value?: number;
}

interface ProgressEntry {
  metric_key?: string;
  metric_value?: number;
  times_awarded?: number;
}

function hasPhase6Rule(d: BadgeDefinitionDoc): boolean {
  const k = d.rule?.metric_key;
  return typeof k === "string" && k.length > 0;
}

function isActiveDef(d: BadgeDefinitionDoc): boolean {
  return d.active !== false;
}

function effectivePlatform(d: BadgeDefinitionDoc): string {
  const p = (d.platform ?? "").trim();
  if (p === "digital_curriculum" || p === "expansion_mobile" || p === "both") return p;
  return "both";
}

/** Digital Curriculum badge dialog: hide Expansion-only definitions from lists. */
function visibleOnDigitalCurriculum(d: BadgeDefinitionDoc): boolean {
  const p = effectivePlatform(d);
  return p === "digital_curriculum" || p === "both";
}

function nextGoalThreshold(def: BadgeDefinitionDoc, timesAwarded: number): number {
  const th = typeof def.rule?.threshold === "number" ? def.rule.threshold : 0;
  const op = def.rule?.operator;
  if (def.award_mode === "repeatable" && op === "gte" && th > 0) {
    return (Math.max(0, timesAwarded) + 1) * th;
  }
  return th > 0 ? th : 1;
}

function BadgeTile({
  title,
  description,
  imageUrl,
  footer,
}: {
  title: string;
  description?: string;
  imageUrl?: string;
  footer?: ReactNode;
}) {
  return (
    <Card className="p-3 flex gap-3 border-border bg-card/80">
      <div className="w-14 h-14 shrink-0 rounded-md bg-muted overflow-hidden flex items-center justify-center border border-border">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Medal className="w-6 h-6 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground text-sm leading-snug">{title}</p>
        {description ? (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
        ) : null}
        {footer ? <div className="mt-2 text-xs text-muted-foreground">{footer}</div> : null}
      </div>
    </Card>
  );
}

export interface UserBadgeSuiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null | undefined;
  /** Shown in header subtitle */
  accountLabel?: string | null;
}

export function UserBadgeSuiteDialog({ open, onOpenChange, userId, accountLabel }: UserBadgeSuiteDialogProps) {
  const [definitions, setDefinitions] = useState<BadgeDefinitionDoc[]>([]);
  const [progressByBadge, setProgressByBadge] = useState<Record<string, ProgressEntry>>({});
  const [awardedMap, setAwardedMap] = useState<Record<string, AwardedDoc>>({});
  const [earnedLegacyIds, setEarnedLegacyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubDefs = onSnapshot(query(collection(db, BADGE_DEFINITIONS)), (snap) => {
      const rows: BadgeDefinitionDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BadgeDefinitionDoc, "id">) }));
      setDefinitions(rows);
      setLoading(false);
    });

    const progressRef = doc(db, ANALYTICS_COLLECTIONS.BADGE_PROGRESS, userId);
    const unsubProg = onSnapshot(progressRef, (snap) => {
      const d = snap.data() as Record<string, unknown> | undefined;
      const by = d?.by_badge;
      setProgressByBadge(by && typeof by === "object" && !Array.isArray(by) ? (by as Record<string, ProgressEntry>) : {});
    });

    const awardedCol = collection(db, ANALYTICS_COLLECTIONS.USER_BADGE_AWARDS, userId, "awarded");
    const unsubAwarded = onSnapshot(query(awardedCol), (snap) => {
      const m: Record<string, AwardedDoc> = {};
      for (const d of snap.docs) {
        m[d.id] = d.data() as AwardedDoc;
      }
      setAwardedMap(m);
    });

    const userRef = doc(db, "users", userId);
    const unsubUser = onSnapshot(userRef, (snap) => {
      const u = snap.data() as Record<string, unknown> | undefined;
      const earned = u?.badges && typeof u.badges === "object" && !Array.isArray(u.badges) ? (u.badges as { earned?: unknown }).earned : undefined;
      setEarnedLegacyIds(Array.isArray(earned) ? (earned as string[]) : []);
    });

    return () => {
      unsubDefs();
      unsubProg();
      unsubAwarded();
      unsubUser();
    };
  }, [open, userId]);

  const { earned, inProgress, available } = useMemo(() => {
    const earnedList: BadgeDefinitionDoc[] = [];
    const inProgList: BadgeDefinitionDoc[] = [];
    const availList: BadgeDefinitionDoc[] = [];
    const earnedIdSet = new Set<string>();

    const legacyOnly = earnedLegacyIds.filter((id) => !definitions.some((d) => d.id === id));
    for (const id of legacyOnly) {
      earnedList.push({
        id,
        name: id.replace(/_/g, " "),
        description: "From your profile (legacy or non–Phase-6 badge).",
      });
      earnedIdSet.add(id);
    }

    for (const def of definitions) {
      if (!isActiveDef(def)) continue;
      if (!visibleOnDigitalCurriculum(def)) continue;

      const aw = awardedMap[def.id];
      const pr = progressByBadge[def.id];
      const times = typeof aw?.times_awarded === "number" ? aw.times_awarded : pr?.times_awarded ?? 0;
      const metric =
        typeof pr?.metric_value === "number"
          ? pr.metric_value
          : typeof aw?.last_metric_value === "number"
            ? aw.last_metric_value
            : 0;
      const legacyEarned = earnedLegacyIds.includes(def.id);

      if (!hasPhase6Rule(def)) {
        if (legacyEarned && !earnedIdSet.has(def.id)) {
          earnedList.push(def);
          earnedIdSet.add(def.id);
        }
        continue;
      }

      if (times >= 1 || (def.award_mode !== "repeatable" && legacyEarned)) {
        if (!earnedIdSet.has(def.id)) {
          earnedList.push(def);
          earnedIdSet.add(def.id);
        }
        continue;
      }

      if (metric > 0) {
        inProgList.push(def);
        continue;
      }

      availList.push(def);
    }

    earnedList.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
    inProgList.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
    availList.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

    return { earned: earnedList, inProgress: inProgList, available: availList };
  }, [definitions, progressByBadge, awardedMap, earnedLegacyIds]);

  if (!userId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[min(88vh,900px)] overflow-y-auto gap-0 p-0">
        <div className="p-6 pb-2 border-b border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Medal className="w-5 h-5 text-accent shrink-0" />
              Badges
            </DialogTitle>
            <DialogDescription>
              {accountLabel
                ? `Signed in as ${accountLabel}. Earned badges sync from analytics and your profile.`
                : "Earned, in progress, and badges you can still unlock."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading badges…
            </div>
          ) : (
            <Tabs defaultValue="earned" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto gap-1 p-1">
                <TabsTrigger value="earned" className="text-xs sm:text-sm py-2">
                  Earned ({earned.length})
                </TabsTrigger>
                <TabsTrigger value="progress" className="text-xs sm:text-sm py-2">
                  In progress ({inProgress.length})
                </TabsTrigger>
                <TabsTrigger value="available" className="text-xs sm:text-sm py-2">
                  Available ({available.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="earned" className="mt-4 space-y-2 min-h-[200px]">
                {earned.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No badges yet. Complete lessons and community actions to earn your first ones.</p>
                ) : (
                  earned.map((def) => {
                    const aw = awardedMap[def.id];
                    const times = aw?.times_awarded ?? (earnedLegacyIds.includes(def.id) ? 1 : 0);
                    const footer =
                      def.award_mode === "repeatable" && times > 1 ? (
                        <span className="text-muted-foreground">Tiers earned: {times}</span>
                      ) : def.award_mode === "repeatable" && times === 1 ? (
                        <span className="text-muted-foreground">At least one tier completed</span>
                      ) : null;
                    return (
                      <BadgeTile
                        key={def.id}
                        title={def.name || def.id}
                        description={def.description}
                        imageUrl={def.image_url}
                        footer={footer}
                      />
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="progress" className="mt-4 space-y-2 min-h-[200px]">
                {inProgress.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Nothing in progress. Start the activities tied to an available badge to see progress here.
                  </p>
                ) : (
                  inProgress.map((def) => {
                    const pr = progressByBadge[def.id];
                    const aw = awardedMap[def.id];
                    const metric = pr?.metric_value ?? aw?.last_metric_value ?? 0;
                    const th = def.rule?.threshold ?? 0;
                    const times = aw?.times_awarded ?? pr?.times_awarded ?? 0;
                    const goal = nextGoalThreshold(def, times);
                    const pct = goal > 0 ? Math.min(100, Math.round((metric / goal) * 100)) : 0;
                    return (
                      <BadgeTile
                        key={def.id}
                        title={def.name || def.id}
                        description={def.description}
                        imageUrl={def.image_url}
                        footer={
                          <div className="space-y-1">
                            <p>
                              <span className="text-foreground font-medium">{metric}</span> / {goal}{" "}
                              <span className="text-muted-foreground">({def.rule?.metric_key})</span>
                            </p>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        }
                      />
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="available" className="mt-4 space-y-2 min-h-[200px]">
                {available.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No tracked badges left to unlock, or definitions have not been published yet.
                  </p>
                ) : (
                  available.map((def) => {
                    const th = def.rule?.threshold ?? 0;
                    const mk = def.rule?.metric_key ?? "";
                    return (
                      <BadgeTile
                        key={def.id}
                        title={def.name || def.id}
                        description={def.description}
                        imageUrl={def.image_url}
                        footer={
                          <p>
                            Need <span className="text-foreground font-medium">{th}</span>{" "}
                            <span className="text-muted-foreground">({mk}, {def.rule?.operator ?? "gte"})</span>
                            {def.award_mode === "repeatable" ? " per tier" : " to unlock"}
                          </p>
                        }
                      />
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
