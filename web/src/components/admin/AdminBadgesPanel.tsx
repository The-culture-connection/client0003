"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, Trash2, Upload, ImageIcon, Check, Info } from "lucide-react";

const BADGE_DEFINITIONS = "badge_definitions";
const BADGE_BANK = "badge_bank";

/** Where this badge is intended to surface (client filtering + admin metric presets). */
export type BadgeDefinitionPlatform = "digital_curriculum" | "expansion_mobile" | "both";

/** Counters from web curriculum rollups on `user_analytics_summary.counts`. */
const METRIC_KEY_OPTIONS = [
  "lessons_completed",
  "lessons_started",
  "quizzes_passed",
  "quizzes_failed",
  "discussions_created",
  "discussion_replies",
  "dms_sent",
  "groups_joined",
  "event_registrations",
  "cart_add_to_cart",
  "login_sign_ins",
  "signups",
  "onboarding_completions",
  "notification_item_clicked",
  "admin_course_builder_save_clicked",
  "admin_lesson_deck_publish_clicked",
  "admin_event_create_submitted",
  "admin_shop_item_created",
] as const;

/** Counters incremented by Expansion mobile Phase-4 rollups (`expansionMobileEventRollup`). */
const EXPANSION_METRIC_KEY_OPTIONS = [
  "total_posts_created",
  "total_comments",
  "total_messages_sent",
  "total_groups_joined",
  "total_events_registered",
  "total_jobs_created",
  "total_skills_created",
  "total_matches_messaged",
  "onboarding_completed",
] as const;

function metricKeysForPlatform(platform: BadgeDefinitionPlatform): readonly string[] {
  if (platform === "expansion_mobile") return EXPANSION_METRIC_KEY_OPTIONS;
  if (platform === "digital_curriculum") return METRIC_KEY_OPTIONS;
  return Array.from(new Set([...METRIC_KEY_OPTIONS, ...EXPANSION_METRIC_KEY_OPTIONS]));
}

const OPERATORS = ["gte", "gt", "lte", "lt", "eq"] as const;

export interface BadgeBankAsset {
  id: string;
  image_url: string;
  storage_path?: string;
  label?: string;
  created_at?: Timestamp;
}

export interface BadgeDefinitionRow {
  id: string;
  name?: string;
  description?: string;
  image_url?: string;
  /** `digital_curriculum` | `expansion_mobile` | `both` — defaults to `both` when missing (legacy). */
  platform?: BadgeDefinitionPlatform | string;
  display_order?: number;
  tier?: string;
  active?: boolean;
  award_mode?: string;
  rule?: {
    metric_key?: string;
    operator?: string;
    threshold?: number;
    timeframe?: string;
  };
}

/** Sidebar copy: how rule operators compare metric to threshold. */
function BadgeOperatorReference() {
  const rows: { op: string; label: string; meaning: string; example: string }[] = [
    { op: "gte", label: "≥", meaning: "Metric is greater than or equal to the threshold.", example: "lessons_completed ≥ 3 → true at 3, 4, …" },
    { op: "gt", label: ">", meaning: "Metric is strictly greater than the threshold.", example: "> 3 → true only at 4, 5, …" },
    { op: "lte", label: "≤", meaning: "Metric is less than or equal to the threshold.", example: "≤ 1 → true at 0 and 1" },
    { op: "lt", label: "<", meaning: "Metric is strictly less than the threshold.", example: "< 3 → true at 0, 1, 2 only" },
    { op: "eq", label: "=", meaning: "Metric exactly equals the threshold.", example: "= 1 → true only when the count is 1" },
  ];
  return (
    <div className="rounded-lg border border-border bg-muted/25 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Info className="w-4 h-4 shrink-0 text-accent" aria-hidden />
        Rule operators
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        The rule compares the current <strong>metric</strong> value (from{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-[11px]">user_analytics_summary.counts</code>) to your{" "}
        <strong>threshold</strong>. Timeframe is <code className="rounded bg-muted px-1 py-0.5 text-[11px]">all_time</code>{" "}
        in v1. <strong>Platform</strong> chooses preset metrics and where the badge appears (Digital Curriculum admin vs
        Expansion mobile); awards still use the same summary document.
      </p>
      <div className="overflow-x-auto rounded-md border border-border bg-background/60">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="p-2 font-medium text-foreground w-14">Op</th>
              <th className="p-2 font-medium text-foreground">Meaning</th>
              <th className="p-2 font-medium text-foreground min-w-[140px]">Example</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.op} className="border-b border-border/80 last:border-0 align-top">
                <td className="p-2 font-mono text-foreground whitespace-nowrap">
                  <span title={r.label}>{r.op}</span>
                </td>
                <td className="p-2 text-muted-foreground">{r.meaning}</td>
                <td className="p-2 text-muted-foreground">{r.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-muted-foreground space-y-2 border-t border-border pt-3 leading-relaxed">
        <p>
          <strong className="text-foreground">One-time:</strong> fires at most once when the condition becomes true; also
          adds the badge id to <code className="rounded bg-muted px-1 py-0.5 text-[11px]">users.badges.earned</code> on first
          award.
        </p>
        <p>
          <strong className="text-foreground">Repeatable:</strong> with <code className="rounded bg-muted px-1 py-0.5 text-[11px]">gte</code>, award tiers follow{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">floor(metric ÷ threshold)</code> (e.g. threshold 2 →
          tiers at 2, 4, 6… completions). Other operators use simpler step-up logic in the backend.
        </p>
      </div>
    </div>
  );
}

function normalizePlatformFromDoc(p: unknown): BadgeDefinitionPlatform {
  if (p === "digital_curriculum" || p === "expansion_mobile" || p === "both") return p;
  return "both";
}

/** Firestore doc id from badge title: lowercase, spaces → underscores, then non [a-z0-9_] → _. */
function slugifyBadgeId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function AdminBadgesPanel() {
  const { user } = useAuth();
  const [bankAssets, setBankAssets] = useState<BadgeBankAsset[]>([]);
  const [definitions, setDefinitions] = useState<BadgeDefinitionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankUploading, setBankUploading] = useState(false);
  const [bankLabel, setBankLabel] = useState("");
  const [bankUploadFile, setBankUploadFile] = useState<File | null>(null);
  const [savingBadge, setSavingBadge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [tier, setTier] = useState("");
  const [active, setActive] = useState(true);
  const [awardMode, setAwardMode] = useState<"one_time" | "repeatable">("one_time");
  const [platform, setPlatform] = useState<BadgeDefinitionPlatform>("digital_curriculum");
  const [metricKey, setMetricKey] = useState<string>(METRIC_KEY_OPTIONS[0]);
  const [operator, setOperator] = useState<string>("gte");
  const [threshold, setThreshold] = useState("1");
  const [imageSource, setImageSource] = useState<"url" | "upload" | "bank">("bank");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  useEffect(() => {
    const qBank = query(collection(db, BADGE_BANK));
    const unsubBank = onSnapshot(
      qBank,
      (snap) => {
        const rows: BadgeBankAsset[] = snap.docs.map((d) => {
          const x = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            image_url: typeof x.image_url === "string" ? x.image_url : "",
            storage_path: typeof x.storage_path === "string" ? x.storage_path : undefined,
            label: typeof x.label === "string" ? x.label : undefined,
            created_at: x.created_at instanceof Timestamp ? x.created_at : undefined,
          };
        });
        rows.sort((a, b) => (b.created_at?.seconds ?? 0) - (a.created_at?.seconds ?? 0));
        setBankAssets(rows.filter((r) => r.image_url));
      },
      (e) => setError(e.message)
    );

    const qDefs = query(collection(db, BADGE_DEFINITIONS));
    const unsubDefs = onSnapshot(
      qDefs,
      (snap) => {
        const rows: BadgeDefinitionRow[] = snap.docs.map((d) => {
          const x = d.data() as BadgeDefinitionRow;
          return { id: d.id, ...x };
        });
        rows.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.id.localeCompare(b.id));
        setDefinitions(rows);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );

    return () => {
      unsubBank();
      unsubDefs();
    };
  }, []);

  const selectedBankUrl = useMemo(() => {
    if (!selectedBankId) return "";
    return bankAssets.find((b) => b.id === selectedBankId)?.image_url ?? "";
  }, [bankAssets, selectedBankId]);

  const derivedBadgeId = useMemo(() => slugifyBadgeId(title), [title]);

  const metricKeyChoices = useMemo(() => metricKeysForPlatform(platform), [platform]);

  useEffect(() => {
    if (!metricKeyChoices.includes(metricKey)) {
      setMetricKey(metricKeyChoices[0] ?? METRIC_KEY_OPTIONS[0]);
    }
  }, [metricKeyChoices, metricKey]);

  const resetBadgeForm = useCallback(() => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setDisplayOrder("0");
    setTier("");
    setActive(true);
    setAwardMode("one_time");
    setPlatform("digital_curriculum");
    setMetricKey(METRIC_KEY_OPTIONS[0]);
    setOperator("gte");
    setThreshold("1");
    setImageSource("bank");
    setImageUrl("");
    setImageFile(null);
    setSelectedBankId(null);
  }, []);

  const loadDefinitionIntoForm = useCallback((b: BadgeDefinitionRow) => {
    setEditingId(b.id);
    setTitle(b.name ?? "");
    setDescription(b.description ?? "");
    setDisplayOrder(String(b.display_order ?? 0));
    setTier(b.tier ?? "");
    setActive(b.active !== false);
    setAwardMode(b.award_mode === "repeatable" ? "repeatable" : "one_time");
    setPlatform(normalizePlatformFromDoc(b.platform));
    const r = b.rule;
    setMetricKey(typeof r?.metric_key === "string" ? r.metric_key : METRIC_KEY_OPTIONS[0]);
    setOperator(typeof r?.operator === "string" ? r.operator : "gte");
    setThreshold(String(r?.threshold ?? 1));
    if (b.image_url) {
      const fromBank = bankAssets.some((a) => a.image_url === b.image_url);
      if (fromBank) {
        const match = bankAssets.find((a) => a.image_url === b.image_url);
        setImageSource("bank");
        setSelectedBankId(match?.id ?? null);
        setImageUrl("");
      } else if (b.image_url.startsWith("http")) {
        setImageSource("url");
        setImageUrl(b.image_url);
        setSelectedBankId(null);
      } else {
        setImageSource("url");
        setImageUrl(b.image_url);
      }
    } else {
      setImageSource("bank");
      setImageUrl("");
      setSelectedBankId(null);
    }
    setImageFile(null);
  }, [bankAssets]);

  const handleBankUpload = async () => {
    if (!user) {
      setError("Sign in to upload.");
      return;
    }
    const file = bankUploadFile;
    if (!file || !file.type.startsWith("image/")) {
      setError("Choose an image file (PNG, JPG, WebP, …).");
      return;
    }
    setBankUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `badge_bank/${Date.now()}_${safe}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
      const image_url = await getDownloadURL(storageRef);
      await addDoc(collection(db, BADGE_BANK), {
        image_url,
        storage_path: path,
        label: bankLabel.trim() || null,
        created_by_uid: user.uid,
        created_at: serverTimestamp(),
      });
      setBankLabel("");
      setBankUploadFile(null);
      setSuccess("Image added to badge bank.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBankUploading(false);
    }
  };

  const deleteBankAsset = async (id: string) => {
    if (!confirm("Remove this image from the badge bank? (Badge definitions that reference the URL will keep the URL until edited.)")) return;
    try {
      await deleteDoc(doc(db, BADGE_BANK, id));
      if (selectedBankId === id) setSelectedBankId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const resolveImageUrlForSave = async (): Promise<string | undefined> => {
    if (imageSource === "url") {
      const u = imageUrl.trim();
      return u.length > 0 ? u : undefined;
    }
    if (imageSource === "bank") {
      return selectedBankUrl || undefined;
    }
    if (imageSource === "upload") {
      if (!imageFile || !user) return undefined;
      const safe = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `badge_bank/${Date.now()}_${safe}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, imageFile, {
        contentType: imageFile.type || "image/jpeg",
      });
      return await getDownloadURL(storageRef);
    }
    return undefined;
  };

  const saveBadgeDefinition = async () => {
    setSavingBadge(true);
    setError(null);
    setSuccess(null);
    try {
      if (!title.trim()) {
        setError("Badge title is required.");
        setSavingBadge(false);
        return;
      }
      const id = editingId ?? slugifyBadgeId(title);
      if (!id) {
        setError("Title must include at least one letter or number so a document id can be generated.");
        setSavingBadge(false);
        return;
      }
      const th = Number(threshold);
      if (!Number.isFinite(th)) {
        setError("Threshold must be a number.");
        setSavingBadge(false);
        return;
      }
      const img = await resolveImageUrlForSave();
      const payload: Record<string, unknown> = {
        name: title.trim(),
        description: description.trim(),
        platform,
        display_order: Math.max(0, parseInt(displayOrder, 10) || 0),
        tier: tier.trim() || null,
        active,
        award_mode: awardMode,
        rule: {
          metric_key: metricKey,
          operator,
          threshold: th,
          timeframe: "all_time",
        },
        updated_at: serverTimestamp(),
      };
      if (img) payload.image_url = img;
      await setDoc(doc(db, BADGE_DEFINITIONS, id), payload, { merge: true });
      setSuccess(editingId ? `Updated badge “${id}”.` : `Created badge “${id}”.`);
      resetBadgeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingBadge(false);
    }
  };

  const deleteBadgeDefinition = async (id: string) => {
    if (!confirm(`Delete badge definition “${id}”? This does not remove earned awards from users.`)) return;
    try {
      await deleteDoc(doc(db, BADGE_DEFINITIONS, id));
      if (editingId === id) resetBadgeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-8">
      {error ? (
        <Card className="p-4 border-destructive/40 bg-destructive/10 text-destructive text-sm">{error}</Card>
      ) : null}
      {success ? (
        <Card className="p-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-sm">
          {success}
        </Card>
      ) : null}

      {/* Badge bank */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Badge bank</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload reusable images. When creating a badge, pick <strong>From bank</strong> and select a thumbnail
            below.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground">Optional label</Label>
            <Input
              value={bankLabel}
              onChange={(e) => setBankLabel(e.target.value)}
              placeholder="e.g. Gold star ribbon"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Image file</Label>
            <Input
              type="file"
              accept="image/*"
              className="bg-background"
              onChange={(e) => setBankUploadFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <Button type="button" onClick={() => void handleBankUpload()} disabled={bankUploading}>
          {bankUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
          Upload to badge bank
        </Button>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground mb-2">Library ({bankAssets.length})</p>
          {bankAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No images yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {bankAssets.map((a) => (
                <div key={a.id} className="relative group w-24">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBankId(a.id);
                      setImageSource("bank");
                    }}
                    className={`block w-24 h-24 rounded-lg border-2 overflow-hidden bg-muted ${
                      selectedBankId === a.id ? "border-accent ring-2 ring-accent/30" : "border-border"
                    }`}
                    title={a.label || a.id}
                  >
                    <img src={a.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => void deleteBankAsset(a.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Create / edit badges */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Badge definitions & rules</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Rules read <code className="text-xs bg-muted px-1">user_analytics_summary</code> counters (
              <code className="text-xs bg-muted px-1">all_time</code> only in v1). One-time badges also sync to{" "}
              <code className="text-xs bg-muted px-1">users.badges.earned</code> on first award. Choose{" "}
              <strong>platform</strong> so the right metric presets and in-app surfaces apply (Expansion vs Digital
              Curriculum).
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={resetBadgeForm}>
            New badge
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="space-y-3 lg:col-span-5">
            <div className="rounded-lg border-2 border-accent/30 bg-accent/5 p-4 space-y-3 shadow-sm">
              <div>
                <Label className="text-foreground text-sm font-semibold">Where this badge applies</Label>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Pick <strong>Digital Curriculum</strong> for web lesson / shop / discussion counters, or{" "}
                  <strong>Expansion app</strong> for mobile network rollups (posts, DMs, jobs, groups, etc.). The{" "}
                  <strong>metric</strong> list below switches with your choice.
                </p>
              </div>
              <ToggleGroup
                type="single"
                value={platform}
                onValueChange={(v) => {
                  if (v) setPlatform(v as BadgeDefinitionPlatform);
                }}
                variant="outline"
                className="grid w-full grid-cols-1 min-[480px]:grid-cols-3 gap-0 rounded-lg overflow-hidden"
              >
                <ToggleGroupItem
                  value="digital_curriculum"
                  className="rounded-none min-h-11 px-2 text-xs sm:text-sm data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                >
                  Digital Curriculum
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="expansion_mobile"
                  className="rounded-none min-h-11 px-2 text-xs sm:text-sm data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                >
                  Expansion app
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="both"
                  className="rounded-none min-h-11 px-2 text-xs sm:text-sm data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                >
                  Both
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Badge title" className="bg-background" />
              {editingId ? (
                <p className="text-xs text-muted-foreground">
                  Document id: <span className="font-mono text-foreground">{editingId}</span> (fixed; rename by creating a
                  new badge and retiring this one).
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Document id:{" "}
                  <span className="font-mono text-foreground">{derivedBadgeId || "—"}</span>
                  {derivedBadgeId
                    ? " — lowercase, spaces become underscores."
                    : " — add letters or numbers in the title to generate an id."}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="bg-background"
                placeholder="Shown to users in achievements"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-foreground">Display order</Label>
                <Input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Tier</Label>
                <Input value={tier} onChange={(e) => setTier(e.target.value)} placeholder="standard" className="bg-background" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active
            </label>
            <div className="space-y-2">
              <Label className="text-foreground">Award mode</Label>
              <select
                value={awardMode}
                onChange={(e) => setAwardMode(e.target.value as "one_time" | "repeatable")}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
              >
                <option value="one_time">One-time</option>
                <option value="repeatable">Repeatable (tiers: floor(metric / threshold) for gte)</option>
              </select>
            </div>

            <div className="border border-border rounded-md p-3 space-y-2 bg-muted/20">
              <p className="text-sm font-medium text-foreground">Rule</p>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Metric</Label>
                <select
                  value={metricKey}
                  onChange={(e) => setMetricKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
                >
                  {metricKeyChoices.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Operator</Label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full px-2 py-2 rounded-md border border-border bg-background text-foreground text-sm"
                  >
                    {OPERATORS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Threshold</Label>
                  <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} className="bg-background text-sm" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Timeframe: all_time (fixed in v1)</p>
            </div>

            <div className="space-y-2 border border-border rounded-md p-3 bg-muted/20">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Badge image
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="imgSrc"
                    checked={imageSource === "bank"}
                    onChange={() => setImageSource("bank")}
                  />
                  From bank
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="imgSrc" checked={imageSource === "url"} onChange={() => setImageSource("url")} />
                  Image URL
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="imgSrc"
                    checked={imageSource === "upload"}
                    onChange={() => setImageSource("upload")}
                  />
                  Upload (one-off)
                </label>
              </div>
              {imageSource === "url" ? (
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…"
                  className="bg-background"
                />
              ) : null}
              {imageSource === "upload" ? (
                <Input type="file" accept="image/*" className="bg-background" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
              ) : null}
              {imageSource === "bank" ? (
                <p className="text-xs text-muted-foreground">
                  {selectedBankId ? "Selected bank image (see library above)." : "Click a thumbnail in the badge bank library."}
                </p>
              ) : null}
            </div>

            <Button type="button" onClick={() => void saveBadgeDefinition()} disabled={savingBadge}>
              {savingBadge ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {editingId ? "Save changes" : "Create badge"}
            </Button>
          </div>

          <aside className="lg:col-span-4 lg:order-none order-2">
            <div className="lg:sticky lg:top-20 space-y-3">
              <BadgeOperatorReference />
            </div>
          </aside>

          <div className="lg:col-span-3 order-3">
            <p className="text-sm font-medium text-foreground mb-2">Existing definitions</p>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : definitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No definitions yet.</p>
            ) : (
              <ul className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {definitions.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/80"
                  >
                    {b.image_url ? (
                      <img src={b.image_url} alt="" className="w-12 h-12 rounded object-cover shrink-0 bg-muted" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted shrink-0 flex items-center justify-center text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{b.name || b.id}</p>
                      <p className="text-xs text-muted-foreground font-mono">{b.id}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="rounded bg-muted/80 px-1 py-0.5 font-mono">
                          {normalizePlatformFromDoc(b.platform)}
                        </span>
                      </p>
                      {b.rule?.metric_key ? (
                        <p className="text-xs text-muted-foreground">
                          {b.rule.metric_key} {b.rule.operator} {b.rule.threshold} · {b.award_mode || "one_time"}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Legacy / no Phase 6 rule</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button type="button" variant="outline" size="sm" onClick={() => loadDefinitionIntoForm(b)}>
                        Edit
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => void deleteBadgeDefinition(b.id)}>
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
