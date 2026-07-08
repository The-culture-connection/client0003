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
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db, storage, functions } from "../../lib/firebase";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Loader2, Check, Trash2, KeyRound, Upload } from "lucide-react";

const CONFERENCES = "conferences";

type ConferenceStatus = "draft" | "active" | "closed";

interface ConferenceRow {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  priceCents?: number;
  currency?: string;
  location?: string;
  timezone?: string;
  startDate?: Timestamp;
  endDate?: Timestamp;
  activeFrom?: Timestamp;
  activeUntil?: Timestamp;
  heroImageUrl?: string;
  mapImageUrl?: string;
  heroSponsor?: { name?: string; logoUrl?: string };
  attendeeCount?: number;
}

interface TicketCodeRow {
  id: string;
  normalizedEmail?: string;
  codePreview?: string;
  used?: boolean;
  usedByUid?: string;
  revoked?: boolean;
  expiresAt?: Timestamp;
}

/** `<input type="datetime-local">` value ↔ Firestore Timestamp. */
function tsToLocalInput(ts?: Timestamp): string {
  if (!ts) return "";
  const d = ts.toDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToTs(v: string): Timestamp | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
}

export function ConferencesPanel() {
  const [conferences, setConferences] = useState<ConferenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Conference form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ConferenceStatus>("draft");
  const [priceDollars, setPriceDollars] = useState("0");
  const [currency, setCurrency] = useState("usd");
  const [location, setLocation] = useState("");
  const [timezone, setTimezone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeFrom, setActiveFrom] = useState("");
  const [activeUntil, setActiveUntil] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [mapImageUrl, setMapImageUrl] = useState("");
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState("");

  // Codes management
  const [selectedConfId, setSelectedConfId] = useState<string | null>(null);
  const [codes, setCodes] = useState<TicketCodeRow[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codeEmail, setCodeEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<{ email: string; code: string }[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, CONFERENCES)),
      (snap) => {
        const rows: ConferenceRow[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ConferenceRow, "id">) }));
        rows.sort((a, b) => (b.startDate?.seconds ?? 0) - (a.startDate?.seconds ?? 0) || a.id.localeCompare(b.id));
        setConferences(rows);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  // Live ticket-codes list for the selected conference.
  useEffect(() => {
    if (!selectedConfId) {
      setCodes([]);
      return;
    }
    setCodesLoading(true);
    const unsub = onSnapshot(
      query(collection(db, CONFERENCES, selectedConfId, "ticketCodes")),
      (snap) => {
        const rows: TicketCodeRow[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TicketCodeRow, "id">) }));
        rows.sort((a, b) => (a.normalizedEmail ?? "").localeCompare(b.normalizedEmail ?? ""));
        setCodes(rows);
        setCodesLoading(false);
      },
      (e) => {
        setError(e.message);
        setCodesLoading(false);
      },
    );
    return () => unsub();
  }, [selectedConfId]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setName("");
    setDescription("");
    setStatus("draft");
    setPriceDollars("0");
    setCurrency("usd");
    setLocation("");
    setTimezone("");
    setStartDate("");
    setEndDate("");
    setActiveFrom("");
    setActiveUntil("");
    setHeroImageUrl("");
    setHeroImageFile(null);
    setMapImageUrl("");
    setSponsorName("");
    setSponsorLogoUrl("");
  }, []);

  const loadIntoForm = useCallback((c: ConferenceRow) => {
    setEditingId(c.id);
    setName(c.name ?? "");
    setDescription(c.description ?? "");
    setStatus((c.status as ConferenceStatus) ?? "draft");
    setPriceDollars(String(((c.priceCents ?? 0) / 100).toFixed(2)));
    setCurrency(c.currency ?? "usd");
    setLocation(c.location ?? "");
    setTimezone(c.timezone ?? "");
    setStartDate(tsToLocalInput(c.startDate));
    setEndDate(tsToLocalInput(c.endDate));
    setActiveFrom(tsToLocalInput(c.activeFrom));
    setActiveUntil(tsToLocalInput(c.activeUntil));
    setHeroImageUrl(c.heroImageUrl ?? "");
    setHeroImageFile(null);
    setMapImageUrl(c.mapImageUrl ?? "");
    setSponsorName(c.heroSponsor?.name ?? "");
    setSponsorLogoUrl(c.heroSponsor?.logoUrl ?? "");
  }, []);

  const resolveHeroImageUrl = async (): Promise<string> => {
    if (heroImageFile) {
      const safe = heroImageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `conferences/${Date.now()}_${safe}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, heroImageFile, { contentType: heroImageFile.type || "image/jpeg" });
      return await getDownloadURL(storageRef);
    }
    return heroImageUrl.trim();
  };

  const saveConference = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (!name.trim()) {
        setError("Conference name is required.");
        return;
      }
      const dollars = Number(priceDollars);
      if (!Number.isFinite(dollars) || dollars < 0) {
        setError("Price must be a non-negative number.");
        return;
      }
      const hero = await resolveHeroImageUrl();
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        status,
        priceCents: Math.round(dollars * 100),
        currency: currency.trim().toLowerCase() || "usd",
        location: location.trim() || null,
        timezone: timezone.trim() || null,
        startDate: localInputToTs(startDate),
        endDate: localInputToTs(endDate),
        activeFrom: localInputToTs(activeFrom),
        activeUntil: localInputToTs(activeUntil),
        heroImageUrl: hero || null,
        mapImageUrl: mapImageUrl.trim() || null,
        heroSponsor:
          sponsorName.trim() || sponsorLogoUrl.trim()
            ? { name: sponsorName.trim() || null, logoUrl: sponsorLogoUrl.trim() || null }
            : null,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await setDoc(doc(db, CONFERENCES, editingId), payload, { merge: true });
        setSuccess(`Updated “${name.trim()}”.`);
      } else {
        const created = await addDoc(collection(db, CONFERENCES), {
          ...payload,
          attendeeCount: 0,
          createdAt: serverTimestamp(),
        });
        setSuccess(`Created “${name.trim()}”.`);
        setSelectedConfId(created.id);
      }
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteConference = async (id: string, label: string) => {
    if (!confirm(`Delete conference “${label}”? Ticket codes and attendee records under it are NOT auto-removed.`)) return;
    try {
      await deleteDoc(doc(db, CONFERENCES, id));
      if (editingId === id) resetForm();
      if (selectedConfId === id) setSelectedConfId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const runCallable = async (fn: string, data: Record<string, unknown>) => {
    setCodeBusy(true);
    setError(null);
    try {
      const callable = httpsCallable(functions, fn);
      const res = await callable(data);
      return res.data as Record<string, unknown>;
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? String(e));
      return null;
    } finally {
      setCodeBusy(false);
    }
  };

  const generateCode = async () => {
    if (!selectedConfId || !codeEmail.trim()) return;
    const out = await runCallable("generateConferenceTicketCode", {
      conferenceId: selectedConfId,
      email: codeEmail.trim(),
    });
    if (out?.ok) {
      setLastGenerated([{ email: out.normalizedEmail as string, code: out.code as string }]);
      setSuccess(`Code generated for ${out.normalizedEmail as string}.`);
      setCodeEmail("");
    }
  };

  const bulkAdd = async () => {
    if (!selectedConfId) return;
    const emails = bulkEmails
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (emails.length === 0) return;
    const out = await runCallable("bulkAddConferenceTicketBuyers", {
      conferenceId: selectedConfId,
      emails,
    });
    if (out?.ok) {
      const results = (out.results as { email: string; code: string }[]) ?? [];
      setLastGenerated(results);
      setSuccess(`Generated ${out.written as number} code(s).`);
      setBulkEmails("");
    }
  };

  const revokeCode = async (ticketCodeId: string) => {
    if (!selectedConfId) return;
    if (!confirm("Revoke this code? The buyer will need a freshly generated one to enter.")) return;
    const out = await runCallable("revokeConferenceTicketCode", {
      conferenceId: selectedConfId,
      ticketCodeId,
    });
    if (out?.ok) setSuccess("Code revoked.");
  };

  const selectedConf = useMemo(
    () => conferences.find((c) => c.id === selectedConfId) ?? null,
    [conferences, selectedConfId],
  );
  const redeemedCount = useMemo(() => codes.filter((c) => c.used).length, [codes]);

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

      {/* Create / edit conference */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {editingId ? "Edit conference" : "Create conference"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Stored in <code className="text-xs bg-muted px-1 rounded">conferences</code>. The{" "}
              <strong>active window</strong> (Active from / until) controls when a ticket code will unlock entry.
            </p>
          </div>
          {editingId ? (
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>
              New conference
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-background" placeholder="e.g. Mortar Summit 2026" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ConferenceStatus)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-background" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground">Ticket price ({currency.toUpperCase()})</Label>
            <Input type="number" min="0" step="0.01" value={priceDollars} onChange={(e) => setPriceDollars(e.target.value)} className="bg-background" />
            <p className="text-xs text-muted-foreground">0 = free. Charged via Stripe in a later phase.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Currency</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-background" placeholder="usd" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Timezone</Label>
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="bg-background" placeholder="America/New_York" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground">Start date</Label>
            <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">End date</Label>
            <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Active from (code turns on)</Label>
            <Input type="datetime-local" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Active until (code stops)</Label>
            <Input type="datetime-local" value={activeUntil} onChange={(e) => setActiveUntil(e.target.value)} className="bg-background" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground">Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Map image URL</Label>
            <Input value={mapImageUrl} onChange={(e) => setMapImageUrl(e.target.value)} className="bg-background" placeholder="https://…" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Hero image URL</Label>
            <Input value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} className="bg-background" placeholder="https://… (or upload →)" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">…or upload hero image</Label>
            <Input type="file" accept="image/*" className="bg-background" onChange={(e) => setHeroImageFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Sponsor name</Label>
            <Input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Sponsor logo URL</Label>
            <Input value={sponsorLogoUrl} onChange={(e) => setSponsorLogoUrl(e.target.value)} className="bg-background" placeholder="https://…" />
          </div>
        </div>

        <Button type="button" onClick={() => void saveConference()} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : heroImageFile ? <Upload className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          {editingId ? "Save changes" : "Create conference"}
        </Button>
      </Card>

      {/* Conference list */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Conferences</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : conferences.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conferences yet.</p>
        ) : (
          <ul className="space-y-2">
            {conferences.map((c) => (
              <li
                key={c.id}
                className={`flex items-center gap-3 p-3 rounded-lg border bg-background/80 ${
                  selectedConfId === c.id ? "border-accent ring-1 ring-accent/30" : "border-border"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{c.name || c.id}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="rounded bg-muted/80 px-1 py-0.5 font-mono">{c.status ?? "draft"}</span>{" "}
                    · {((c.priceCents ?? 0) / 100).toFixed(2)} {(c.currency ?? "usd").toUpperCase()} · {c.attendeeCount ?? 0} attendees
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedConfId(c.id)}>
                    <KeyRound className="w-3.5 h-3.5 mr-1" /> Codes
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => loadIntoForm(c)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => void deleteConference(c.id, c.name || c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Codes management */}
      {selectedConf ? (
        <Card className="p-6 space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Ticket codes — {selectedConf.name || selectedConf.id}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {codes.length} code(s), {redeemedCount} redeemed. Codes are shown once at generation — copy them now.
              Lost-code flow: generate a new code (auto-revokes the old one) or revoke below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Generate code for one email</Label>
              <div className="flex gap-2">
                <Input value={codeEmail} onChange={(e) => setCodeEmail(e.target.value)} placeholder="buyer@example.com" className="bg-background" />
                <Button type="button" onClick={() => void generateCode()} disabled={codeBusy || !codeEmail.trim()}>
                  Generate
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Bulk add (emails separated by comma / space / newline)</Label>
              <Textarea value={bulkEmails} onChange={(e) => setBulkEmails(e.target.value)} rows={2} className="bg-background" />
              <Button type="button" size="sm" onClick={() => void bulkAdd()} disabled={codeBusy || !bulkEmails.trim()}>
                Bulk generate
              </Button>
            </div>
          </div>

          {lastGenerated.length > 0 ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-sm font-medium text-foreground mb-1">Newly generated codes (copy now — hidden after this):</p>
              <ul className="text-xs font-mono text-foreground space-y-0.5">
                {lastGenerated.map((g) => (
                  <li key={g.email}>
                    {g.email}: <span className="font-bold">{g.code}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-2">Who has a code / redeemed</p>
            {codesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : codes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No codes issued yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="p-2 font-medium">Email</th>
                      <th className="p-2 font-medium">Code</th>
                      <th className="p-2 font-medium">Status</th>
                      <th className="p-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((c) => (
                      <tr key={c.id} className="border-b border-border/70 last:border-0">
                        <td className="p-2 text-foreground">{c.normalizedEmail}</td>
                        <td className="p-2 font-mono text-muted-foreground">{c.codePreview ?? "—"}</td>
                        <td className="p-2">
                          {c.revoked ? (
                            <span className="text-destructive">Revoked</span>
                          ) : c.used ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Redeemed</span>
                          ) : (
                            <span className="text-muted-foreground">Not redeemed</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {!c.revoked && !c.used ? (
                            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => void revokeCode(c.id)} disabled={codeBusy}>
                              Revoke
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
