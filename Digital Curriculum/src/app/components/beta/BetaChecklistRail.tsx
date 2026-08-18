import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, ChevronDown } from "lucide-react";
import {
  BETA_STEPS,
  DASHBOARD_DWELL_SECONDS,
  evaluateBetaChecklist,
  isBetaTester,
  stampBetaChecklist,
  type BetaStepId,
  type BetaStepState,
} from "../../lib/betaChecklist";

/**
 * Beta tester checklist, parked in the empty gutter to the right of the
 * dashboard.
 *
 * Only rendered when the viewport is wide enough for that gutter to exist —
 * below the breakpoint the dashboard fills the width and there is nowhere to
 * put this without covering content. It sits above the floating feedback and DM
 * buttons rather than beside them, so nothing overlaps in the bottom corner.
 *
 * Nothing here is tickable by hand: each step reads its own completion out of
 * the data the tester's actions already produced.
 */

/** Below this the page has no side gutter, so the rail stays hidden. */
const MIN_VIEWPORT_FOR_RAIL = "(min-width: 1780px)";

/**
 * Whether the checklist is limited to accounts flagged `beta_tester`.
 *
 * Off for now — everyone with the room for it sees the checklist. Flip to true
 * to hand it back to flagged testers only; the flag check below is still wired
 * up, so that is the only change needed.
 */
const RESTRICT_TO_FLAGGED_TESTERS = false;

function useMediaQuery(queryString: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(queryString).matches
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(queryString);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [queryString]);

  return matches;
}

interface BetaChecklistRailProps {
  userId: string | undefined;
  /**
   * The dashboard's cached `users/{uid}` doc, read only by the
   * {@link RESTRICT_TO_FLAGGED_TESTERS} gate. Step evaluation deliberately
   * re-reads the document itself, because that cache is minutes old and several
   * steps are stamped onto exactly this doc.
   */
  userData: Record<string, unknown> | undefined;
}

export function BetaChecklistRail({ userId, userData }: BetaChecklistRailProps) {
  const hasRoom = useMediaQuery(MIN_VIEWPORT_FOR_RAIL);
  const [state, setState] = useState<BetaStepState | null>(null);
  const [openStep, setOpenStep] = useState<BetaStepId | null>(null);
  const dwellStamped = useRef(false);

  const tester = RESTRICT_TO_FLAGGED_TESTERS ? isBetaTester(userData) : true;

  const refresh = useCallback(async () => {
    if (!userId) return;
    setState(await evaluateBetaChecklist(userId));
  }, [userId]);

  useEffect(() => {
    if (!tester || !userId) return;
    void refresh();
  }, [tester, userId, refresh]);

  // "Look around the dashboard" leaves no trace of its own, so time spent here
  // is the honest signal. Stamped once, then never re-armed for this mount.
  useEffect(() => {
    if (!tester || !userId || !state || state.dashboard || dwellStamped.current) return;
    const timer = window.setTimeout(() => {
      dwellStamped.current = true;
      void stampBetaChecklist(userId, "dashboard_viewed_at").then(() => {
        setState((prev) => (prev ? { ...prev, dashboard: true } : prev));
      });
    }, DASHBOARD_DWELL_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [tester, userId, state]);

  if (!tester || !hasRoom || !state) return null;

  const done = BETA_STEPS.filter((s) => state[s.id]).length;
  const total = BETA_STEPS.length;
  const pct = Math.round((done / total) * 100);

  return (
    <aside
      aria-label="Beta testing checklist"
      className="fixed right-4 top-24 bottom-36 z-30 hidden w-[clamp(190px,12.5vw,235px)] flex-col
                 border border-white/10 bg-background/95 shadow-xl backdrop-blur
                 [@media(min-width:1780px)]:flex"
    >
      <div className="border-b border-white/10 px-3.5 py-3">
        <p className="font-technical text-[10px] uppercase tracking-[0.18em] text-verse">
          Beta checklist
        </p>
        <p className="mt-1 font-headline text-sm font-black uppercase leading-tight text-foreground">
          {done} of {total} done
        </p>
        <div
          className="mt-2 h-1 w-full bg-white/10"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% complete`}
        >
          <div className="h-full bg-verse transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Steps tick themselves once you have done them.
        </p>
      </div>

      <ol className="min-h-0 flex-1 overflow-y-auto">
        {BETA_STEPS.map((step, index) => {
          const complete = state[step.id];
          const open = openStep === step.id;
          return (
            <li key={step.id} className="border-b border-white/5 last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenStep(open ? null : step.id)}
                aria-expanded={open}
                className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-white/5
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verse/60"
              >
                {complete ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verse" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="font-technical mr-1.5 text-[10px] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={
                      complete
                        ? "text-[12.5px] leading-snug text-muted-foreground line-through"
                        : "text-[12.5px] leading-snug text-foreground"
                    }
                  >
                    {step.title}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open && (
                <div className="px-3.5 pb-3 pl-9">
                  <ul className="list-disc space-y-1 pl-3.5">
                    {step.detail.map((line) => (
                      <li key={line} className="text-[11.5px] leading-snug text-muted-foreground">
                        {line}
                      </li>
                    ))}
                  </ul>
                  {step.note && (
                    <p className="mt-2 border-l-2 border-verse/60 bg-white/[0.03] py-1.5 pl-2 pr-1 text-[11px] leading-snug text-muted-foreground">
                      <span className="font-technical mb-0.5 block text-[9.5px] uppercase tracking-wider text-verse">
                        {step.note.label}
                      </span>
                      {step.note.text}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="border-t border-white/10 px-3.5 py-2">
        <button
          type="button"
          onClick={() => void refresh()}
          className="font-technical text-[10px] uppercase tracking-wider text-muted-foreground
                     transition-colors hover:text-foreground focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-verse/60"
        >
          Refresh progress
        </button>
      </div>
    </aside>
  );
}
