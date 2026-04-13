import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const GROUP_CATEGORIES = [
  "__none__",
  "Business & Entrepreneurship",
  "Marketing & Brand Growth",
  "Money, Funding & Resources",
  "Operations & Logistics",
  "Community & Networking",
  "Events & Opportunities",
  "Industry-Specific",
  "Wins, Lessons & Advice",
] as const;

type PlacementRow = { email: string; reportReason: string };

/** Expansion app: `groups_mobile` creation + `user_reports` moderation (Cloud Functions + Firestore). */
export function MobileModerationPanel() {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [rulesText, setRulesText] = useState("");
  const [category, setCategory] = useState("__none__");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [status, setStatus] = useState<"Open" | "Closed">("Open");
  const [placementRows, setPlacementRows] = useState<PlacementRow[]>([
    { email: "", reportReason: "" },
  ]);
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupMsg, setGroupMsg] = useState<string | null>(null);

  const [reports, setReports] = useState<
    QueryDocumentSnapshot<Record<string, unknown>>[]
  >([]);
  const [reportsErr, setReportsErr] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [snapshotById, setSnapshotById] = useState<
    Record<string, Record<string, unknown> | null>
  >({});
  const [snapshotBusy, setSnapshotBusy] = useState<string | null>(null);
  const [modBusy, setModBusy] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "user_reports"),
      orderBy("created_at", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReportsErr(null);
        setReports(snap.docs as QueryDocumentSnapshot<Record<string, unknown>>[]);
      },
      (e) => setReportsErr(e.message)
    );
    return () => unsub();
  }, []);

  const openReports = useMemo(
    () =>
      reports.filter((d) => {
        const s = String(d.data().status ?? "");
        return s === "open" || s === "investigating";
      }),
    [reports]
  );

  const runCallable = async (fn: string, data: Record<string, unknown>) => {
    const callable = httpsCallable(functions, fn);
    const res = await callable(data);
    return res.data as Record<string, unknown>;
  };

  const handleCreateGroup = async () => {
    setGroupBusy(true);
    setGroupMsg(null);
    try {
      const rows = placementRows
        .map((r) => ({
          email: r.email.trim(),
          reportReason: r.reportReason.trim(),
        }))
        .filter((r) => r.email.length > 0);
      const out = await runCallable("adminCreateMobileGroup", {
        name: groupName.trim(),
        description: description.trim() || undefined,
        rulesText: rulesText.trim() || undefined,
        category: category === "__none__" ? undefined : category,
        visibility,
        status,
        placementRows: rows,
      });
      if (out?.ok) {
        const unresolved = (out.unresolvedEmails as string[]) ?? [];
        const gid = out.groupId as string;
        setGroupMsg(
          `Created community ${gid}. Members added: ${out.memberCount as number}.` +
            (unresolved.length
              ? ` Unresolved emails (no Auth user): ${unresolved.join(", ")}`
              : "")
        );
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setGroupMsg(err.message ?? String(e));
    } finally {
      setGroupBusy(false);
    }
  };

  const loadSnapshot = async (reportedUid: string, reportId: string) => {
    const prev = snapshotById[reportId];
    if (prev !== undefined && prev !== null) {
      return;
    }
    setSnapshotBusy(reportId);
    try {
      const out = await runCallable("getUserModerationSnapshot", {
        uid: reportedUid,
      });
      setSnapshotById((m) => ({ ...m, [reportId]: out }));
    } catch {
      setSnapshotById((m) => ({ ...m, [reportId]: null }));
    } finally {
      setSnapshotBusy(null);
    }
  };

  const runModeration = async (
    reportedUid: string,
    action: "ban" | "lift_content_suspension" | "unban"
  ) => {
    const key = `${reportedUid}:${action}`;
    setModBusy(key);
    try {
      await runCallable("moderateUserAccount", { uid: reportedUid, action });
    } finally {
      setModBusy(null);
    }
  };

  return (
    <div className="space-y-10 max-w-4xl">
      <Card className="p-6 border-border bg-card">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Mobile communities (groups_mobile)
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Staff-created Expansion app communities with <strong>public</strong> (anyone can join) or{" "}
          <strong>private</strong> (no self-join; add members by email). Optional placement list stores
          each email with the reason they were reported (audit trail in{" "}
          <code className="text-xs bg-muted px-1">placement_audit</code>).
        </p>
        <div className="space-y-3">
          <div>
            <Label className="text-foreground">Name</Label>
            <Input
              className="mt-1"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div>
            <Label className="text-foreground">Description (optional)</Label>
            <Textarea
              className="mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label className="text-foreground">Rules (optional)</Label>
            <Textarea
              className="mt-1"
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === "__none__" ? "None" : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground">Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as "public" | "private")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — anyone can join</SelectItem>
                  <SelectItem value="private">Private — invite / staff adds only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "Open" | "Closed")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Members by email + report reason</Label>
            {placementRows.map((row, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="email@example.com"
                  value={row.email}
                  onChange={(e) => {
                    const next = [...placementRows];
                    next[i] = { ...next[i], email: e.target.value };
                    setPlacementRows(next);
                  }}
                />
                <Input
                  className="sm:flex-1"
                  placeholder="Reason reported (audit)"
                  value={row.reportReason}
                  onChange={(e) => {
                    const next = [...placementRows];
                    next[i] = { ...next[i], reportReason: e.target.value };
                    setPlacementRows(next);
                  }}
                />
                {placementRows.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setPlacementRows(placementRows.filter((_, j) => j !== i))
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setPlacementRows([...placementRows, { email: "", reportReason: "" }])
              }
            >
              Add row
            </Button>
          </div>

          <Button
            disabled={groupBusy || !groupName.trim()}
            onClick={() => void handleCreateGroup()}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {groupBusy ? "Creating…" : "Create community"}
          </Button>
          {groupMsg ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{groupMsg}</p>
          ) : null}
        </div>
      </Card>

      <Card className="p-6 border-border bg-card">
        <h2 className="text-xl font-semibold text-foreground mb-2">User reports (moderation)</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Open a report to load profile + recent activity (feed, events, prior reports).{" "}
          <strong>Ban</strong> disables Auth and sets <code className="text-xs bg-muted px-1">account_banned</code>{" "}
          + content suspension. <strong>Unsuspend</strong> clears{" "}
          <code className="text-xs bg-muted px-1">content_suspended</code> only.{" "}
          <strong>Unban</strong> re-enables Auth and clears ban + suspension.
        </p>
        {reportsErr ? (
          <p className="text-sm text-destructive">{reportsErr}</p>
        ) : openReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open or investigating reports.</p>
        ) : (
          <ul className="space-y-4">
            {openReports.map((d) => {
              const data = d.data();
              const reported = String(data.reported_user_id ?? "");
              const reason = String(data.reason ?? "");
              const st = String(data.status ?? "");
              const isOpen = expandedId === d.id;
              return (
                <li
                  key={d.id}
                  className="border border-border rounded-lg p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <span className="text-sm font-medium text-foreground">Status: {st}</span>
                    <Button
                      size="sm"
                      variant={isOpen ? "secondary" : "outline"}
                      onClick={() => {
                        setExpandedId(isOpen ? null : d.id);
                        if (!isOpen && reported) {
                          void loadSnapshot(reported, d.id);
                        }
                      }}
                    >
                      {isOpen ? "Hide detail" : "Profile & activity"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    Reported UID: {reported}
                  </p>
                  <p className="text-sm text-foreground">{reason}</p>
                  {isOpen ? (
                    <div className="space-y-3 pt-2">
                      {snapshotBusy === d.id ? (
                        <p className="text-sm text-muted-foreground">Loading snapshot…</p>
                      ) : snapshotById[d.id] === null ? (
                        <p className="text-sm text-destructive">Could not load snapshot.</p>
                      ) : snapshotById[d.id] ? (
                        <pre className="text-[11px] leading-snug overflow-auto max-h-72 p-3 rounded-md bg-muted text-foreground">
                          {JSON.stringify(snapshotById[d.id], null, 2)}
                        </pre>
                      ) : (
                        <p className="text-sm text-muted-foreground">Click to load.</p>
                      )}
                      {reported ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={modBusy !== null}
                            onClick={() => void runModeration(reported, "ban")}
                          >
                            {modBusy === `${reported}:ban` ? "…" : "Ban user"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={modBusy !== null}
                            onClick={() => void runModeration(reported, "lift_content_suspension")}
                          >
                            {modBusy === `${reported}:lift_content_suspension`
                              ? "…"
                              : "Unsuspend (lift posting)"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={modBusy !== null}
                            onClick={() => void runModeration(reported, "unban")}
                          >
                            {modBusy === `${reported}:unban` ? "…" : "Unban"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
