/**
 * Admin → Beta Testing.
 *
 * The triage queue for `beta_feedback`: what a tester wanted changed, which
 * screen they were on, and a screenshot of that screen taken before any report
 * UI appeared. Reports arrive from shake-to-report in the Expansion mobile app
 * and from the standing widget on Digital Curriculum.
 */

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import {
  Bug,
  ExternalLink,
  ImageOff,
  Monitor,
  Smartphone,
  X,
} from "lucide-react";
import { auth, db } from "../../lib/firebase";
import {
  BETA_FEEDBACK_COLLECTION,
  BETA_FEEDBACK_STATUSES,
  BETA_FEEDBACK_STATUS_LABELS,
  type BetaFeedbackReport,
  type BetaFeedbackStatus,
} from "../../lib/betaFeedback";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

/** Most recent reports held in memory; older ones stay in Firestore. */
const REPORT_LIMIT = 300;

const APP_CONFIG_COLLECTION = "app_config";
const APP_CONFIG_DOC = "beta_feedback";

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function toStatus(v: unknown): BetaFeedbackStatus {
  const s = str(v);
  return (BETA_FEEDBACK_STATUSES as readonly string[]).includes(s)
    ? (s as BetaFeedbackStatus)
    : "new";
}

function toReport(id: string, data: Record<string, unknown>): BetaFeedbackReport {
  return {
    id,
    comment: str(data.comment),
    screen: str(data.screen),
    screen_label: str(data.screen_label) || str(data.screen),
    route: str(data.route),
    source: data.source === "mobile" ? "mobile" : "web",
    trigger: str(data.trigger),
    status: toStatus(data.status),
    user_id: str(data.user_id),
    user_email: str(data.user_email),
    user_name: str(data.user_name),
    platform: str(data.platform),
    os_version: str(data.os_version),
    app_version: str(data.app_version),
    user_agent: str(data.user_agent),
    viewport_width: num(data.viewport_width),
    viewport_height: num(data.viewport_height),
    screenshot_url: str(data.screenshot_url) || null,
    screenshot_path: str(data.screenshot_path) || null,
    screenshot_error: str(data.screenshot_error) || null,
    admin_note: str(data.admin_note),
    created_at: (data.created_at as Timestamp) ?? null,
    updated_at: (data.updated_at as Timestamp) ?? null,
    resolved_by: str(data.resolved_by) || null,
  };
}

function formatWhen(ts: Timestamp | null): string {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_BADGE: Record<BetaFeedbackStatus, string> = {
  new: "bg-red-500/15 text-red-300 border-red-500/40",
  in_progress: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  wont_fix: "bg-white/5 text-muted-foreground border-white/15",
};

export function BetaTestingPanel() {
  const [reports, setReports] = useState<BetaFeedbackReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<BetaFeedbackStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "mobile" | "web">("all");
  const [screenFilter, setScreenFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [lightbox, setLightbox] = useState<BetaFeedbackReport | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const [shakeEnabled, setShakeEnabled] = useState(true);
  const [buttonEnabled, setButtonEnabled] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, BETA_FEEDBACK_COLLECTION),
      orderBy("created_at", "desc"),
      limit(REPORT_LIMIT)
    );
    return onSnapshot(
      q,
      (snap) => {
        setReports(snap.docs.map((d) => toReport(d.id, d.data() as Record<string, unknown>)));
        setLoading(false);
        setLoadError(null);
      },
      (e) => {
        setLoading(false);
        setLoadError(
          e.code === "permission-denied"
            ? "Permission denied reading beta_feedback. Deploy the latest Firestore rules to this project."
            : e.message
        );
      }
    );
  }, []);

  useEffect(() => {
    return onSnapshot(
      doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC),
      (snap) => {
        const data = snap.data();
        setShakeEnabled(typeof data?.shake_enabled === "boolean" ? data.shake_enabled : true);
        setButtonEnabled(typeof data?.button_enabled === "boolean" ? data.button_enabled : true);
      },
      () => {
        /* Missing doc or denied read — the apps default to on. */
      }
    );
  }, []);

  const screens = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of reports) {
      if (r.screen && !seen.has(r.screen)) seen.set(r.screen, r.screen_label || r.screen);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [reports]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (screenFilter !== "all" && r.screen !== screenFilter) return false;
      if (!needle) return true;
      return (
        r.comment.toLowerCase().includes(needle) ||
        r.screen_label.toLowerCase().includes(needle) ||
        r.route.toLowerCase().includes(needle) ||
        r.user_email.toLowerCase().includes(needle) ||
        r.user_name.toLowerCase().includes(needle)
      );
    });
  }, [reports, statusFilter, sourceFilter, screenFilter, search]);

  const newCount = useMemo(() => reports.filter((r) => r.status === "new").length, [reports]);

  async function changeStatus(report: BetaFeedbackReport, status: BetaFeedbackStatus) {
    setSavingId(report.id);
    try {
      await updateDoc(doc(db, BETA_FEEDBACK_COLLECTION, report.id), {
        status,
        updated_at: serverTimestamp(),
        ...(status === "resolved"
          ? { resolved_at: serverTimestamp(), resolved_by: auth.currentUser?.uid ?? "" }
          : {}),
      });
    } catch (e) {
      console.error("[beta_feedback] status update failed", e);
    } finally {
      setSavingId(null);
    }
  }

  async function saveNote(report: BetaFeedbackReport) {
    const note = noteDrafts[report.id] ?? report.admin_note;
    setSavingId(report.id);
    try {
      await updateDoc(doc(db, BETA_FEEDBACK_COLLECTION, report.id), {
        admin_note: note,
        updated_at: serverTimestamp(),
      });
      setNoteDrafts((d) => {
        const next = { ...d };
        delete next[report.id];
        return next;
      });
    } catch (e) {
      console.error("[beta_feedback] note update failed", e);
    } finally {
      setSavingId(null);
    }
  }

  async function saveConfig(next: { shake_enabled?: boolean; button_enabled?: boolean }) {
    setSavingConfig(true);
    try {
      await setDoc(doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC), next, { merge: true });
    } catch (e) {
      console.error("[beta_feedback] config update failed", e);
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Bug className="w-5 h-5 text-accent mt-0.5 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Beta tester reports</h2>
              <p className="text-sm text-muted-foreground max-w-2xl mt-1">
                Testers shake their phone on any screen in the Expansion app, or tap the bug
                button on Digital Curriculum, to send a note plus a screenshot of that screen
                taken before the report UI appeared.
              </p>
            </div>
          </div>
          <Badge className="bg-red-500/15 text-red-300 border border-red-500/40 shrink-0">
            {newCount} new
          </Badge>
        </div>

        <div className="mt-5 pt-4 border-t border-border/60 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Collection switches
          </p>
          <p className="text-xs text-muted-foreground">
            Turn these off when beta ends — the mobile app picks the change up live, without a
            store release. Written to{" "}
            <code className="text-[11px] bg-muted px-1">app_config/beta_feedback</code>.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant={shakeEnabled ? "secondary" : "outline"}
              size="sm"
              disabled={savingConfig}
              onClick={() => saveConfig({ shake_enabled: !shakeEnabled })}
            >
              Shake-to-report: {shakeEnabled ? "On" : "Off"}
            </Button>
            <Button
              variant={buttonEnabled ? "secondary" : "outline"}
              size="sm"
              disabled={savingConfig}
              onClick={() => saveConfig({ button_enabled: !buttonEnabled })}
            >
              Floating bug button: {buttonEnabled ? "On" : "Off"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as BetaFeedbackStatus | "all")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {BETA_FEEDBACK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {BETA_FEEDBACK_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Source</label>
            <Select
              value={sourceFilter}
              onValueChange={(v) => setSourceFilter(v as "all" | "mobile" | "web")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Both apps</SelectItem>
                <SelectItem value="mobile">Expansion mobile</SelectItem>
                <SelectItem value="web">Digital Curriculum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Screen</label>
            <Select value={screenFilter} onValueChange={setScreenFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All screens</SelectItem>
                {screens.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Search</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Comment, screen, tester…"
            />
          </div>
        </div>
      </Card>

      {loadError && (
        <Card className="p-4 border-destructive/50">
          <p className="text-sm text-destructive">{loadError}</p>
        </Card>
      )}

      {loading ? (
        <Card className="p-8">
          <p className="text-sm text-muted-foreground text-center">Loading reports…</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8">
          <p className="text-sm text-muted-foreground text-center">
            {reports.length === 0
              ? "No beta reports yet. Shake a phone in the Expansion app to file the first one."
              : "No reports match these filters."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {reports.length} report{reports.length === 1 ? "" : "s"}
            {reports.length >= REPORT_LIMIT ? ` (newest ${REPORT_LIMIT})` : ""}.
          </p>
          {filtered.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              busy={savingId === r.id}
              noteDraft={noteDrafts[r.id]}
              onNoteChange={(v) => setNoteDrafts((d) => ({ ...d, [r.id]: v }))}
              onSaveNote={() => saveNote(r)}
              onStatusChange={(s) => changeStatus(r, s)}
              onOpenShot={() => setLightbox(r)}
            />
          ))}
        </div>
      )}

      {lightbox?.screenshot_url && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Screenshot from ${lightbox.screen_label}`}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            aria-label="Close screenshot"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightbox.screenshot_url}
            alt={`Screenshot of ${lightbox.screen_label}`}
            className="max-h-[90vh] max-w-full object-contain rounded-lg border border-white/15"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function ReportCard({
  report,
  busy,
  noteDraft,
  onNoteChange,
  onSaveNote,
  onStatusChange,
  onOpenShot,
}: {
  report: BetaFeedbackReport;
  busy: boolean;
  noteDraft: string | undefined;
  onNoteChange: (v: string) => void;
  onSaveNote: () => void;
  onStatusChange: (s: BetaFeedbackStatus) => void;
  onOpenShot: () => void;
}) {
  const SourceIcon = report.source === "mobile" ? Smartphone : Monitor;
  const noteValue = noteDraft ?? report.admin_note;
  const noteDirty = noteDraft !== undefined && noteDraft !== report.admin_note;

  const who =
    [report.user_name, report.user_email].filter(Boolean).join(" · ") || report.user_id || "—";
  const device = [report.platform, report.os_version].filter(Boolean).join(" ");
  const build = report.app_version ? `build ${report.app_version}` : "";

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="sm:w-40 shrink-0">
          {report.screenshot_url ? (
            <button
              type="button"
              onClick={onOpenShot}
              className="block w-full rounded-lg overflow-hidden border border-white/10 hover:border-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Open full screenshot"
            >
              <img
                src={report.screenshot_url}
                alt={`Screenshot of ${report.screen_label}`}
                loading="lazy"
                className="w-full h-40 object-cover object-top bg-black"
              />
            </button>
          ) : (
            <div
              className="w-full h-40 rounded-lg border border-dashed border-white/15 flex flex-col items-center justify-center gap-1 text-muted-foreground"
              title={report.screenshot_error ?? "No screenshot on this report"}
            >
              <ImageOff className="w-5 h-5" />
              <span className="text-[11px]">No screenshot</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`border ${STATUS_BADGE[report.status]}`}>
              {BETA_FEEDBACK_STATUS_LABELS[report.status]}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <SourceIcon className="w-3 h-3" />
              {report.source === "mobile" ? "Expansion mobile" : "Digital Curriculum"}
            </Badge>
            {report.trigger && (
              <Badge variant="outline" className="text-[11px]">
                {report.trigger === "shake" ? "shaken" : "tapped"}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {formatWhen(report.created_at)}
            </span>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">{report.screen_label || "—"}</p>
            <p className="text-xs text-muted-foreground break-all">
              {report.route || report.screen}
            </p>
          </div>

          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {report.comment}
          </p>

          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="break-words">{who}</p>
            <p>
              {[device, build].filter(Boolean).join(" · ") || "—"}
              {report.viewport_width && report.viewport_height
                ? ` · ${report.viewport_width}×${report.viewport_height}`
                : ""}
            </p>
            {report.screenshot_error && (
              <p className="text-amber-400/80 break-words">
                Screenshot failed: {report.screenshot_error}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Select
              value={report.status}
              onValueChange={(v) => onStatusChange(v as BetaFeedbackStatus)}
              disabled={busy}
            >
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BETA_FEEDBACK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {BETA_FEEDBACK_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {report.screenshot_url && (
              <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                <a href={report.screenshot_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open image
                </a>
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Textarea
              value={noteValue}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Triage note (what we decided, ticket link…)"
              rows={2}
              className="text-sm resize-none"
              disabled={busy}
            />
            {noteDirty && (
              <Button size="sm" className="h-8 text-xs" onClick={onSaveNote} disabled={busy}>
                Save note
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
