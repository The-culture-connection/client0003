"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Loader2, Trash2, Plus, Check } from "lucide-react";

/**
 * Admin authoring for conference missions.
 *
 * A mission is evaluated by the same threshold engine as analytics badges — the
 * `rule` written here is the identical `{ metric_key, operator, threshold }`
 * shape. Two documents are kept in step:
 *
 *  - `badge_definitions/{badgeId}` — presentation only, deliberately WITHOUT a
 *    `rule`, so the badge evaluator skips it and only the mission can award it.
 *    Its presence is what makes the badge appear on the member badge wall.
 *  - `conference_missions/{missionId}` — the rule, plus `badge_id` pointing at
 *    that badge.
 */

const MISSIONS = "conference_missions";
const BADGE_DEFS = "badge_definitions";
const BADGE_BANK = "badge_bank";

/**
 * Counters the rollup maintains per conference. The stored `metric_key` is
 * `conf_<conferenceId>_<metric>` — see `conferenceCounterDelta` in
 * functions/src/analytics/summary/expansionMobileEventRollup.ts.
 */
const METRIC_OPTIONS = [
  { key: "sessions_attended", label: "Sessions attended (RSVP’d)" },
  { key: "connections_made", label: "Connections made (QR scans + matches)" },
  { key: "sponsors_visited", label: "Sponsor booths viewed (in-app)" },
  { key: "booths_scanned", label: "Sponsor booths scanned (QR at the booth)" },
  { key: "community_contributions", label: "Community posts + replies" },
  { key: "community_posts", label: "Community posts only" },
  { key: "community_replies", label: "Community replies only" },
  { key: "check_ins", label: "Daily check-ins" },
  { key: "session_messages_sent", label: "Session chat messages sent" },
] as const;

const ICON_OPTIONS = [
  { key: "session", label: "Calendar" },
  { key: "connect", label: "Handshake" },
  { key: "sponsor", label: "Storefront" },
  { key: "community", label: "Forum" },
  { key: "checkin", label: "Location pin" },
  { key: "chat", label: "Chat bubble" },
  { key: "trophy", label: "Trophy (default)" },
] as const;

const OPERATORS = ["gte", "gt", "eq", "lte", "lt"] as const;

interface MissionRow {
  id: string;
  conference_id?: string;
  title?: string;
  description?: string;
  icon_key?: string;
  badge_id?: string;
  active?: boolean;
  award_mode?: string;
  display_order?: number;
  rule?: { metric_key?: string; operator?: string; threshold?: number };
}

interface BankAsset {
  id: string;
  image_url: string;
  label?: string;
}

/** Strips the `conf_<id>_` namespace so the select can show the bare metric. */
function bareMetric(metricKey: string | undefined, conferenceId: string): string {
  if (!metricKey) return METRIC_OPTIONS[0].key;
  const prefix = `conf_${conferenceId}_`;
  return metricKey.startsWith(prefix) ? metricKey.slice(prefix.length) : metricKey;
}

const EMPTY_FORM = {
  missionId: null as string | null,
  badgeId: null as string | null,
  title: "",
  description: "",
  iconKey: "trophy" as string,
  metric: METRIC_OPTIONS[0].key as string,
  operator: "gte" as string,
  threshold: "3",
  awardMode: "one_time" as "one_time" | "repeatable",
  displayOrder: "0",
  active: true,
  badgeName: "",
  badgeDescription: "",
  badgeImageUrl: "",
  badgeTier: "",
};

export function ConferenceMissionsPanel({ conferenceId }: { conferenceId: string }) {
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [badgeNames, setBadgeNames] = useState<Record<string, string>>({});
  const [bank, setBank] = useState<BankAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!conferenceId) return;
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, MISSIONS), where("conference_id", "==", conferenceId)),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MissionRow, "id">) }));
        rows.sort(
          (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.id.localeCompare(b.id)
        );
        setMissions(rows);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [conferenceId]);

  // Badge names for the list, and the bank for the image picker.
  useEffect(() => {
    const unsubDefs = onSnapshot(collection(db, BADGE_DEFS), (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const n = (d.data() as { name?: string }).name;
        if (typeof n === "string") map[d.id] = n;
      });
      setBadgeNames(map);
    });
    const unsubBank = onSnapshot(collection(db, BADGE_BANK), (snap) => {
      setBank(
        snap.docs
          .map((d) => {
            const x = d.data() as { image_url?: string; label?: string };
            return { id: d.id, image_url: x.image_url ?? "", label: x.label };
          })
          .filter((b) => b.image_url)
      );
    });
    return () => {
      unsubDefs();
      unsubBank();
    };
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
    setError(null);
  }, []);

  const startEdit = (m: MissionRow) => {
    setForm({
      missionId: m.id,
      badgeId: m.badge_id ?? null,
      title: m.title ?? "",
      description: m.description ?? "",
      iconKey: m.icon_key ?? "trophy",
      metric: bareMetric(m.rule?.metric_key, conferenceId),
      operator: m.rule?.operator ?? "gte",
      threshold: String(m.rule?.threshold ?? 3),
      awardMode: m.award_mode === "repeatable" ? "repeatable" : "one_time",
      displayOrder: String(m.display_order ?? 0),
      active: m.active !== false,
      badgeName: m.badge_id ? (badgeNames[m.badge_id] ?? "") : "",
      badgeDescription: "",
      badgeImageUrl: "",
      badgeTier: "",
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const save = async () => {
    const title = form.title.trim();
    const threshold = Number(form.threshold);
    const badgeName = form.badgeName.trim() || title;

    if (!title) {
      setError("Give the mission a title.");
      return;
    }
    if (!Number.isFinite(threshold) || threshold <= 0) {
      setError("Target must be a positive number.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      // The badge is written first: a mission without one cannot award anything,
      // and the evaluator skips missions with no badge_id.
      let badgeId = form.badgeId;
      const badgePayload = {
        name: badgeName,
        description: form.badgeDescription.trim() || form.description.trim() || "",
        image_url: form.badgeImageUrl.trim() || "",
        tier: form.badgeTier.trim() || "",
        platform: "expansion_mobile",
        display_order: Number(form.displayOrder) || 0,
        active: true,
        // No `rule` on purpose — keeps the badge evaluator from awarding this
        // independently of its mission.
        source: "conference_mission",
        conference_id: conferenceId,
        updated_at: serverTimestamp(),
      };

      if (badgeId) {
        await setDoc(doc(db, BADGE_DEFS, badgeId), badgePayload, { merge: true });
      } else {
        const ref = await addDoc(collection(db, BADGE_DEFS), {
          ...badgePayload,
          created_at: serverTimestamp(),
        });
        badgeId = ref.id;
      }

      const missionPayload = {
        conference_id: conferenceId,
        title,
        description: form.description.trim(),
        icon_key: form.iconKey,
        badge_id: badgeId,
        active: form.active,
        award_mode: form.awardMode,
        display_order: Number(form.displayOrder) || 0,
        rule: {
          metric_key: `conf_${conferenceId}_${form.metric}`,
          operator: form.operator,
          threshold,
          timeframe: "all_time",
        },
        updated_at: serverTimestamp(),
      };

      if (form.missionId) {
        await setDoc(doc(db, MISSIONS, form.missionId), missionPayload, { merge: true });
      } else {
        await addDoc(collection(db, MISSIONS), {
          ...missionPayload,
          created_at: serverTimestamp(),
        });
      }
      setSuccess(form.missionId ? "Mission updated." : "Mission created.");
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m: MissionRow) => {
    if (!confirm(`Delete “${m.title ?? m.id}”? Its badge stays on the badge wall.`)) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, MISSIONS, m.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const metricLabel = useMemo(
    () => (k: string) => METRIC_OPTIONS.find((m) => m.key === k)?.label ?? k,
    []
  );

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-foreground">Missions</p>
        <span className="text-xs text-muted-foreground">
          {missions.length} for this conference
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => {
            setForm({ ...EMPTY_FORM });
            setShowForm((s) => !s);
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          New mission
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Missions use the same rules engine as badges. Progress counts only actions taken inside
        this conference, and completing one awards the badge you design below — which then shows
        on the member’s badge wall like any other badge.
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p> : null}

      {showForm ? (
        <div className="rounded-md border border-border p-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Attend 3 sessions"
              />
            </div>
            <div>
              <Label>Icon</Label>
              <select
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
                value={form.iconKey}
                onChange={(e) => setForm({ ...form, iconKey: e.target.value })}
              >
                {ICON_OPTIONS.map((i) => (
                  <option key={i.key} value={i.key}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Shown under the mission title in the lobby."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Label>Counts</Label>
              <select
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
                value={form.metric}
                onChange={(e) => setForm({ ...form, metric: e.target.value })}
              >
                {METRIC_OPTIONS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Operator</Label>
              <select
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
                value={form.operator}
                onChange={(e) => setForm({ ...form, operator: e.target.value })}
              >
                {OPERATORS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Target</Label>
              <Input
                type="number"
                min={1}
                value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Award mode</Label>
              <select
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
                value={form.awardMode}
                onChange={(e) =>
                  setForm({ ...form, awardMode: e.target.value as "one_time" | "repeatable" })
                }
              >
                <option value="one_time">One time</option>
                <option value="repeatable">Repeatable (tiers)</option>
              </select>
            </div>
            <div>
              <Label>Display order</Label>
              <Input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active
              </label>
            </div>
          </div>

          <div className="rounded-md border border-border p-3 space-y-3">
            <p className="text-sm font-medium text-foreground">Badge awarded on completion</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Badge name</Label>
                <Input
                  value={form.badgeName}
                  onChange={(e) => setForm({ ...form, badgeName: e.target.value })}
                  placeholder="Defaults to the mission title"
                />
              </div>
              <div>
                <Label>Tier (optional)</Label>
                <Input
                  value={form.badgeTier}
                  onChange={(e) => setForm({ ...form, badgeTier: e.target.value })}
                  placeholder="gold / silver / …"
                />
              </div>
            </div>
            <div>
              <Label>Badge description</Label>
              <Textarea
                rows={2}
                value={form.badgeDescription}
                onChange={(e) => setForm({ ...form, badgeDescription: e.target.value })}
                placeholder="Defaults to the mission description."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Image URL</Label>
                <Input
                  value={form.badgeImageUrl}
                  onChange={(e) => setForm({ ...form, badgeImageUrl: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div>
                <Label>…or pick from the badge bank</Label>
                <select
                  className="w-full rounded-md border border-border bg-background p-2 text-sm"
                  value=""
                  onChange={(e) => {
                    const asset = bank.find((b) => b.id === e.target.value);
                    if (asset) setForm({ ...form, badgeImageUrl: asset.image_url });
                  }}
                >
                  <option value="">Select an image…</option>
                  {bank.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label ?? b.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {form.badgeImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.badgeImageUrl}
                alt="Badge preview"
                className="h-16 w-16 rounded object-cover border border-border"
              />
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={() => void save()} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              {form.missionId ? "Save mission" : "Create mission"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : missions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No missions yet for this conference.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-2 font-medium">Mission</th>
                <th className="p-2 font-medium">Goal</th>
                <th className="p-2 font-medium">Badge</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {missions.map((m) => (
                <tr key={m.id} className="border-b border-border/70 last:border-0">
                  <td className="p-2">
                    <div className="text-foreground">{m.title ?? m.id}</div>
                    {m.description ? (
                      <div className="text-xs text-muted-foreground">{m.description}</div>
                    ) : null}
                  </td>
                  <td className="p-2 text-muted-foreground">
                    {m.rule?.operator ?? "gte"} {m.rule?.threshold ?? "?"} ·{" "}
                    {metricLabel(bareMetric(m.rule?.metric_key, conferenceId))}
                  </td>
                  <td className="p-2 text-muted-foreground">
                    {m.badge_id ? (badgeNames[m.badge_id] ?? m.badge_id) : "— none —"}
                  </td>
                  <td className="p-2">
                    {m.active === false ? (
                      <span className="text-muted-foreground">Inactive</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                    )}
                  </td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(m)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => void remove(m)}
                      disabled={busy}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
