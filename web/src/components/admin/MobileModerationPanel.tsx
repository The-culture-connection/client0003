"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const CATEGORY_VALUES = GROUP_CATEGORIES.filter((c) => c !== "__none__") as readonly string[];

function categoryFieldToUi(raw: unknown): string {
  const c = str(raw).trim();
  return CATEGORY_VALUES.includes(c) ? c : "__none__";
}

function groupCreatedMs(data: Record<string, unknown>): number {
  const c = data.Created;
  if (
    c &&
    typeof c === "object" &&
    "toMillis" in c &&
    typeof (c as { toMillis: unknown }).toMillis === "function"
  ) {
    return (c as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function ModerationSnapshotView({ payload }: { payload: Record<string, unknown> }) {
  const user = (payload.user as Record<string, unknown>) ?? {};
  const feedPosts = Array.isArray(payload.feedPosts) ? payload.feedPosts : [];
  const eventsMobile = Array.isArray(payload.eventsMobile) ? payload.eventsMobile : [];
  const reportsAboutUser = Array.isArray(payload.reportsAboutUser)
    ? payload.reportsAboutUser
    : [];

  const displayName = [str(user.first_name), str(user.last_name)].filter(Boolean).join(" ").trim();
  const nameLine = displayName || str(user.display_name) || "—";
  const tribe = str(user.tribe) || str(user.industry) || "—";

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 text-sm py-1 border-b border-border/60 last:border-0">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="text-foreground break-words">{value || "—"}</span>
    </div>
  );

  return (
    <div className="space-y-5 text-foreground">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Member profile
        </h4>
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <Row label="Name" value={nameLine} />
          <Row label="Email" value={str(user.email)} />
          <Row label="Profession" value={str(user.profession)} />
          <Row label="Tribe" value={tribe} />
          <Row label="City / state" value={[str(user.city), str(user.state)].filter(Boolean).join(", ")} />
          <Row
            label="Flags"
            value={[
              user.account_banned === true ? "Account banned" : null,
              user.content_suspended === true ? "Content suspended" : null,
            ]
              .filter(Boolean)
              .join(" · ") || "None"}
          />
          {str(user.bio) ? (
            <div className="mt-2 pt-2 border-t border-border/60">
              <span className="text-xs text-muted-foreground font-medium">Bio</span>
              <p className="text-sm mt-1 whitespace-pre-wrap">{str(user.bio)}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Recent feed posts ({feedPosts.length})
        </h4>
        {feedPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent posts found.</p>
        ) : (
          <ul className="space-y-2">
            {(feedPosts as Record<string, unknown>[]).slice(0, 6).map((p, i) => (
              <li
                key={str(p.id) || String(i)}
                className="rounded-md border border-border/80 bg-background/40 px-3 py-2 text-sm"
              >
                <span className="text-xs text-muted-foreground font-mono">{str(p.id)}</span>
                <p className="mt-1 line-clamp-3 text-foreground">
                  {str(p.post_title) ||
                    str(p.post_details) ||
                    str(p.description) ||
                    str(p.body) ||
                    "(no text)"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Events (mobile) ({eventsMobile.length})
        </h4>
        {eventsMobile.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events found.</p>
        ) : (
          <ul className="space-y-2">
            {(eventsMobile as Record<string, unknown>[]).slice(0, 6).map((e, i) => (
              <li
                key={str(e.id) || String(i)}
                className="rounded-md border border-border/80 bg-background/40 px-3 py-2 text-sm"
              >
                <span className="font-medium text-foreground">{str(e.title) || "Event"}</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[str(e.date), str(e.time), str(e.approval_status)].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Other reports about this member ({reportsAboutUser.length})
        </h4>
        {reportsAboutUser.length === 0 ? (
          <p className="text-sm text-muted-foreground">None in snapshot.</p>
        ) : (
          <ul className="space-y-2">
            {(reportsAboutUser as Record<string, unknown>[]).slice(0, 5).map((r, i) => (
              <li
                key={str(r.id) || String(i)}
                className="rounded-md border border-border/80 bg-background/40 px-3 py-2 text-sm"
              >
                <span className="text-xs text-muted-foreground">{str(r.status)}</span>
                <p className="mt-1 line-clamp-2">{str(r.reason)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function createdMs(data: Record<string, unknown>): number {
  const c = data.created_at;
  if (
    c &&
    typeof c === "object" &&
    "toMillis" in c &&
    typeof (c as { toMillis: unknown }).toMillis === "function"
  ) {
    return (c as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function reportSort(
  a: QueryDocumentSnapshot<Record<string, unknown>>,
  b: QueryDocumentSnapshot<Record<string, unknown>>
): number {
  const da = a.data();
  const db = b.data();
  const af = str(da.staff_resolution) ? 1 : 0;
  const bf = str(db.staff_resolution) ? 1 : 0;
  if (af !== bf) return af - bf;
  return createdMs(db) - createdMs(da);
}

function isReportVisible(data: Record<string, unknown>): boolean {
  const sr = str(data.staff_resolution);
  if (sr === "ban" || sr === "unsuspend") return true;
  const s = str(data.status);
  return s === "open" || s === "investigating";
}

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
  const [modErr, setModErr] = useState<string | null>(null);

  const [mobileGroups, setMobileGroups] = useState<
    QueryDocumentSnapshot<Record<string, unknown>>[]
  >([]);
  const [mobileGroupsErr, setMobileGroupsErr] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRules, setEditRules] = useState("");
  const [editCategory, setEditCategory] = useState("__none__");
  const [editVisibility, setEditVisibility] = useState<"public" | "private">("public");
  const [editStatus, setEditStatus] = useState<"Open" | "Closed">("Open");
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberReason, setAddMemberReason] = useState("");
  const [removeMemberEmail, setRemoveMemberEmail] = useState("");
  const [manageBusy, setManageBusy] = useState<string | null>(null);
  const [manageMsg, setManageMsg] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "groups_mobile"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMobileGroupsErr(null);
        const docs = snap.docs as QueryDocumentSnapshot<Record<string, unknown>>[];
        docs.sort((a, b) => groupCreatedMs(b.data()) - groupCreatedMs(a.data()));
        setMobileGroups(docs);
      },
      (e) => setMobileGroupsErr(e.message)
    );
    return () => unsub();
  }, []);

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

  const visibleReports = useMemo(() => {
    const list = reports.filter((d) => isReportVisible(d.data()));
    list.sort(reportSort);
    return list;
  }, [reports]);

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
        if (gid) {
          setSelectedGroupId(gid);
        }
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

  const finalizeDecision = async (
    reportId: string,
    reportedUid: string,
    action: "ban" | "lift_content_suspension"
  ) => {
    const busyKey = `${reportId}:${action}`;
    setModErr(null);
    setModBusy(busyKey);
    try {
      await runCallable("moderateUserAccount", { uid: reportedUid, action });
      await updateDoc(doc(db, "user_reports", reportId), {
        status: "resolved",
        staff_resolution: action === "ban" ? "ban" : "unsuspend",
        resolved_at: serverTimestamp(),
        resolved_by: auth.currentUser?.uid ?? null,
        updated_at: serverTimestamp(),
      });
    } catch (e: unknown) {
      const err = e as { message?: string };
      setModErr(err.message ?? String(e));
    } finally {
      setModBusy(null);
    }
  };

  const applyGroupDocToEditor = (d: QueryDocumentSnapshot<Record<string, unknown>>) => {
    const data = d.data();
    setSelectedGroupId(d.id);
    setEditName(str(data.Name));
    setEditDescription(str(data.description));
    setEditRules(str(data.rulesText));
    setEditCategory(categoryFieldToUi(data.category));
    const vis = str(data.visibility).toLowerCase();
    setEditVisibility(vis === "private" ? "private" : "public");
    const st = str(data.Status);
    setEditStatus(st === "Closed" ? "Closed" : "Open");
    setManageMsg(null);
  };

  const handleSaveGroupMeta = async () => {
    if (!selectedGroupId || !editName.trim()) return;
    setManageBusy("meta");
    setManageMsg(null);
    try {
      await runCallable("adminUpdateMobileGroup", {
        groupId: selectedGroupId,
        name: editName.trim(),
        description: editDescription,
        rulesText: editRules,
        category: editCategory === "__none__" ? "" : editCategory,
        visibility: editVisibility,
        status: editStatus,
      });
      setManageMsg("Saved community details.");
    } catch (e: unknown) {
      const err = e as { message?: string };
      setManageMsg(err.message ?? String(e));
    } finally {
      setManageBusy(null);
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroupId || !addMemberEmail.trim()) return;
    setManageBusy("add");
    setManageMsg(null);
    try {
      const out = await runCallable("adminModifyMobileGroupMembers", {
        groupId: selectedGroupId,
        addRows: [
          {
            email: addMemberEmail.trim(),
            reportReason: addMemberReason.trim(),
          },
        ],
        removeUids: [],
        removeEmails: [],
      });
      const ua = (out.unresolvedAddEmails as string[]) ?? [];
      setAddMemberEmail("");
      setAddMemberReason("");
      setManageMsg(
        ua.length
          ? `No Auth user for: ${ua.join(", ")}`
          : "Member added."
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      setManageMsg(err.message ?? String(e));
    } finally {
      setManageBusy(null);
    }
  };

  const handleRemoveUid = async (uid: string) => {
    if (!selectedGroupId) return;
    setManageBusy(`rm:${uid}`);
    setManageMsg(null);
    try {
      await runCallable("adminModifyMobileGroupMembers", {
        groupId: selectedGroupId,
        addRows: [],
        removeUids: [uid],
        removeEmails: [],
      });
      setManageMsg("Member removed.");
    } catch (e: unknown) {
      const err = e as { message?: string };
      setManageMsg(err.message ?? String(e));
    } finally {
      setManageBusy(null);
    }
  };

  const handleRemoveByEmail = async () => {
    if (!selectedGroupId || !removeMemberEmail.trim()) return;
    setManageBusy("rmEmail");
    setManageMsg(null);
    try {
      const out = await runCallable("adminModifyMobileGroupMembers", {
        groupId: selectedGroupId,
        addRows: [],
        removeUids: [],
        removeEmails: [removeMemberEmail.trim()],
      });
      const ur = (out.unresolvedRemoveEmails as string[]) ?? [];
      setRemoveMemberEmail("");
      setManageMsg(
        ur.length
          ? `No Auth user for: ${ur.join(", ")}`
          : "Remove by email processed."
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      setManageMsg(err.message ?? String(e));
    } finally {
      setManageBusy(null);
    }
  };

  const selectedGroupData = selectedGroupId
    ? mobileGroups.find((g) => g.id === selectedGroupId)?.data()
    : undefined;
  const memberUids = Array.isArray(selectedGroupData?.GroupMembers)
    ? (selectedGroupData!.GroupMembers as string[])
    : [];

  return (
    <div className="space-y-10 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card className="p-6 border-border bg-card">
        <h2 className="text-lg font-semibold mb-2">Create mobile community</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Staff-created communities with <strong>public</strong> (anyone can join) or{" "}
          <strong>private</strong> (no self-join; add members by email). Optional placement
          list stores each email with the reason they were reported (audit trail in{" "}
          <code className="text-xs bg-muted px-1">placement_audit</code>).
        </p>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              className="mt-1"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              className="mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label>Rules (optional)</Label>
            <Textarea
              className="mt-1"
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Category</Label>
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
              <Label>Visibility</Label>
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
              <Label>Status</Label>
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
            <Label>Members by email + report reason</Label>
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
          >
            {groupBusy ? "Creating…" : "Create community"}
          </Button>
          {groupMsg ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{groupMsg}</p>
          ) : null}
        </div>
      </Card>

        <Card className="p-6 border-border bg-card">
          <h2 className="text-lg font-semibold mb-2">Manage mobile communities</h2>
          <p className="text-sm text-muted-foreground mb-4">
            All <code className="text-xs bg-muted px-1">groups_mobile</code> docs (live list). Select one to edit
            fields or membership. Updates use Cloud Functions so they work without Auth custom claims on your
            account.
          </p>
          {mobileGroupsErr ? (
            <p className="text-sm text-destructive mb-3">{mobileGroupsErr}</p>
          ) : null}
          <div className="space-y-4">
            <div>
              <Label>Communities</Label>
              <ScrollArea className="h-[200px] border border-border rounded-md mt-1">
                <ul className="p-2 space-y-1">
                  {mobileGroups.length === 0 ? (
                    <li className="text-sm text-muted-foreground px-2 py-3">No communities yet.</li>
                  ) : (
                    mobileGroups.map((g) => {
                      const data = g.data();
                      const label = str(data.Name) || g.id;
                      const sel = g.id === selectedGroupId;
                      return (
                        <li key={g.id}>
                          <button
                            type="button"
                            onClick={() => applyGroupDocToEditor(g)}
                            className={`w-full text-left text-sm rounded-md px-2 py-2 transition-colors ${
                              sel
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-muted"
                            }`}
                          >
                            <span className="font-medium line-clamp-1">{label}</span>
                            <span className="block text-xs opacity-80 font-mono truncate">{g.id}</span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </ScrollArea>
            </div>

            {selectedGroupId ? (
              <div className="space-y-4 pt-2 border-t border-border/60">
                <p className="text-xs text-muted-foreground font-mono break-all">Editing: {selectedGroupId}</p>
                <div>
                  <Label>Name</Label>
                  <Input
                    className="mt-1"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    className="mt-1"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Rules</Label>
                  <Textarea
                    className="mt-1"
                    value={editRules}
                    onChange={(e) => setEditRules(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Select value={editCategory} onValueChange={setEditCategory}>
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
                    <Label>Visibility</Label>
                    <Select
                      value={editVisibility}
                      onValueChange={(v) => setEditVisibility(v as "public" | "private")}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={editStatus}
                      onValueChange={(v) => setEditStatus(v as "Open" | "Closed")}
                    >
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
                <Button
                  type="button"
                  disabled={manageBusy !== null || !editName.trim()}
                  onClick={() => void handleSaveGroupMeta()}
                >
                  {manageBusy === "meta" ? "Saving…" : "Save community details"}
                </Button>

                <div className="space-y-2 pt-2 border-t border-border/60">
                  <Label>Members ({memberUids.length})</Label>
                  <ScrollArea className="h-[min(220px,40vh)] border border-border rounded-md">
                    <ul className="p-2 space-y-1">
                      {memberUids.length === 0 ? (
                        <li className="text-sm text-muted-foreground px-2">No members.</li>
                      ) : (
                        memberUids.map((uid) => (
                          <li
                            key={uid}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm px-2 py-1 rounded hover:bg-muted/60"
                          >
                            <span className="font-mono text-xs break-all">{uid}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={manageBusy !== null}
                              onClick={() => void handleRemoveUid(uid)}
                            >
                              {manageBusy === `rm:${uid}` ? "…" : "Remove"}
                            </Button>
                          </li>
                        ))
                      )}
                    </ul>
                  </ScrollArea>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Input
                      placeholder="Add by email"
                      value={addMemberEmail}
                      onChange={(e) => setAddMemberEmail(e.target.value)}
                    />
                    <Input
                      className="sm:flex-1"
                      placeholder="Audit reason (optional)"
                      value={addMemberReason}
                      onChange={(e) => setAddMemberReason(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={manageBusy !== null || !addMemberEmail.trim()}
                      onClick={() => void handleAddMember()}
                    >
                      {manageBusy === "add" ? "…" : "Add"}
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Remove by email"
                      value={removeMemberEmail}
                      onChange={(e) => setRemoveMemberEmail(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={manageBusy !== null || !removeMemberEmail.trim()}
                      onClick={() => void handleRemoveByEmail()}
                    >
                      {manageBusy === "rmEmail" ? "…" : "Remove by email"}
                    </Button>
                  </div>
                </div>

                {manageMsg ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{manageMsg}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a community to edit.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6 border-border bg-card">
        <h2 className="text-lg font-semibold mb-2">User reports (moderation)</h2>
        <p className="text-sm text-muted-foreground mb-4">
          <strong>Ban</strong> disables the account and suspends posting. <strong>Unsuspend</strong> clears content
          suspension only. Decisions are final for each report and update status in Firestore. Expand{" "}
          <strong>Profile &amp; activity</strong> for a readable summary.
        </p>
        {modErr ? (
          <p className="text-sm text-destructive mb-3" role="alert">
            {modErr}
          </p>
        ) : null}
        {reportsErr ? (
          <p className="text-sm text-destructive">{reportsErr}</p>
        ) : visibleReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports in the active queue.</p>
        ) : (
          <ul className="space-y-4">
            {visibleReports.map((d) => {
              const data = d.data();
              const reported = str(data.reported_user_id);
              const reason = str(data.reason);
              const st = str(data.status);
              const sr = str(data.staff_resolution);
              const finalized = sr === "ban" || sr === "unsuspend";
              const isOpen = expandedId === d.id;
              const busyBan = modBusy === `${d.id}:ban`;
              const busyUns = modBusy === `${d.id}:lift_content_suspension`;

              return (
                <li
                  key={d.id}
                  className={`rounded-lg border p-4 space-y-3 transition-colors ${
                    finalized
                      ? "border-muted-foreground/30 bg-muted/40 opacity-95"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">Report</span>
                        <Badge variant="outline" className="text-xs">
                          Status: {st}
                        </Badge>
                        {finalized ? (
                          <Badge
                            variant={sr === "ban" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {sr === "ban" ? "Final: banned" : "Final: posting restored"}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono break-all">
                        Reported UID: {reported || "—"}
                      </p>
                    </div>
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
                      {isOpen ? "Hide profile & activity" : "Profile & activity"}
                    </Button>
                  </div>

                  <p className="text-sm leading-relaxed">{reason || "—"}</p>

                  {!finalized && reported ? (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-border/60">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={modBusy !== null}
                        onClick={() => void finalizeDecision(d.id, reported, "ban")}
                      >
                        {busyBan ? "…" : "Ban"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={modBusy !== null}
                        onClick={() => void finalizeDecision(d.id, reported, "lift_content_suspension")}
                      >
                        {busyUns ? "…" : "Unsuspend"}
                      </Button>
                    </div>
                  ) : finalized ? (
                    <p className="text-xs text-muted-foreground pt-1 border-t border-border/60">
                      No further actions — decision recorded on this report.
                    </p>
                  ) : null}

                  {isOpen ? (
                    <div className="pt-2 border-t border-border/60">
                      {snapshotBusy === d.id ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
                      ) : snapshotById[d.id] === null ? (
                        <p className="text-sm text-destructive">Could not load profile snapshot.</p>
                      ) : snapshotById[d.id] ? (
                        <ModerationSnapshotView payload={snapshotById[d.id]!} />
                      ) : (
                        <p className="text-sm text-muted-foreground">Open this section to load details.</p>
                      )}
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
