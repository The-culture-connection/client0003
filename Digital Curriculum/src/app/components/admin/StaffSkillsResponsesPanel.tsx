import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, type Timestamp } from "firebase/firestore";
import { ChevronDown, ChevronRight, Copy, Download, Loader2, RefreshCw, Search } from "lucide-react";
import { db } from "../../lib/firebase";
import type { StaffSkillsProfile } from "../../lib/staffSkills";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";

type Row = StaffSkillsProfile & { id: string; updated_at?: Timestamp; created_at?: Timestamp };

/**
 * Admin view of the staff Skills & Passions form (/staff-skills).
 * Reads `staff_skills_profiles` (staff-readable per firestore.rules), lets
 * admins search by name/skill/passion, see which skills come up most, open a
 * full response, and export everything to CSV.
 */
export function StaffSkillsResponsesPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, "staff_skills_profiles"));
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as StaffSkillsProfile) })) as Row[];
      list.sort((a, b) => (b.updated_at?.toMillis?.() ?? 0) - (a.updated_at?.toMillis?.() ?? 0));
      setRows(list);
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? "Could not load responses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return rows;
    return rows.filter((r) =>
      [r.full_name, r.title, r.team, r.email ?? "", ...(r.skills ?? []), ...(r.passions ?? []), r.workshop_topics]
        .join(" \n ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, q]);

  const topSkills = useMemo(() => tally(rows.flatMap((r) => r.skills ?? [])).slice(0, 15), [rows]);
  const topPassions = useMemo(() => tally(rows.flatMap((r) => r.passions ?? [])).slice(0, 15), [rows]);

  const formUrl = `${window.location.origin}/staff-skills`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-lg font-black uppercase tracking-wide text-foreground">
            Staff Skills &amp; Passions responses
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Answers to the staff questionnaire. Share the form link with staff; they sign in or create an account to fill it out.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="mr-2 h-4 w-4" />
            {copied ? "Link copied" : "Copy form link"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => downloadCsv(filtered)} disabled={!filtered.length}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-4 text-sm text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="py-4 text-muted-foreground">
          No responses yet. Send staff the form link: <span className="text-foreground">{formUrl}</span>
        </p>
      ) : (
        <>
          <div className="mb-5 grid gap-4 md:grid-cols-2">
            <TallyBox title={`Most common skills (${rows.length} responses)`} items={topSkills} onPick={setQuery} />
            <TallyBox title="Most common passions" items={topPassions} onPick={setQuery} />
          </div>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="bg-background pl-9"
              placeholder="Search by name, role, skill or passion"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Showing {filtered.length} of {rows.length}
          </p>

          <div className="space-y-2">
            {filtered.map((r) => {
              const isOpen = open === r.id;
              return (
                <div key={r.id} className="rounded-lg border border-border bg-muted/20">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : r.id)}
                    className="flex w-full items-start gap-3 p-3 text-left"
                  >
                    {isOpen ? (
                      <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium text-foreground">{r.full_name || r.email || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(r.updated_at)}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[r.title, r.team].filter(Boolean).join(" · ") || "No role given"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(r.skills ?? []).slice(0, isOpen ? undefined : 6).map((s) => (
                          <Badge key={s} variant="secondary">{s}</Badge>
                        ))}
                        {!isOpen && (r.skills?.length ?? 0) > 6 && (
                          <span className="text-xs text-muted-foreground">+{r.skills.length - 6} more</span>
                        )}
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <dl className="grid gap-3 border-t border-border px-10 py-4 text-sm sm:grid-cols-2">
                      <Detail label="Email">{r.email}</Detail>
                      <Detail label="LinkedIn">
                        {r.linkedin_url ? (
                          <a href={r.linkedin_url} target="_blank" rel="noreferrer" className="break-all text-foreground underline underline-offset-2 hover:text-accent">
                            {r.linkedin_url}
                          </a>
                        ) : null}
                      </Detail>
                      <Detail label="Passions" wide>
                        <div className="flex flex-wrap gap-1">
                          {(r.passions ?? []).map((p) => (
                            <Badge key={p} variant="outline">{p}</Badge>
                          ))}
                        </div>
                      </Detail>
                      <Detail label="Certifications" wide>{r.certifications}</Detail>
                      <Detail label="Workshop topics (60 min)" wide>{r.workshop_topics}</Detail>
                      <Detail label="Formats">{(r.training_formats ?? []).join(", ")}</Detail>
                      <Detail label="Audiences">{(r.audiences ?? []).join(", ")}</Detail>
                      <Detail label="Hours per month">{r.monthly_hours}</Detail>
                      <Detail label="OK to feature in marketing">
                        {r.ok_to_feature === "yes" ? "Yes" : r.ok_to_feature === "no" ? "No" : ""}
                      </Detail>
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

function TallyBox({
  title,
  items,
  onPick,
}: {
  title: string;
  items: [string, number][];
  onPick: (s: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None yet</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map(([label, n]) => (
            <button
              key={label}
              type="button"
              onClick={() => onPick(label)}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground hover:border-accent"
              title="Filter responses by this"
            >
              {label} <span className="text-muted-foreground">· {n}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-foreground">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function tally(list: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const s of list) m.set(s, (m.get(s) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function formatDate(t?: Timestamp): string {
  const d = t?.toDate?.();
  return d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
}

function downloadCsv(rows: Row[]) {
  const headers = [
    "Name", "Email", "Role", "Team", "LinkedIn", "Skills", "Passions", "Certifications",
    "Workshop topics", "Formats", "Audiences", "Hours per month", "OK to feature", "Last updated",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.full_name, r.email, r.title, r.team, r.linkedin_url,
      (r.skills ?? []).join("; "), (r.passions ?? []).join("; "), r.certifications, r.workshop_topics,
      (r.training_formats ?? []).join("; "), (r.audiences ?? []).join("; "), r.monthly_hours,
      r.ok_to_feature, r.updated_at?.toDate?.().toISOString() ?? "",
    ].map(esc).join(",")
  );
  const csv = [headers.map(esc).join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `staff-skills-passions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
