import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Loader2, Check, Trash2, Upload } from "lucide-react";

interface SponsorRow {
  id: string;
  companyName?: string;
  packageLevel?: string;
  description?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  perks?: string[];
  booth?: string;
  mapFloorId?: string;
  mapRoomId?: string;
  giveawayPrize?: string;
  giveawayInstructions?: string;
  contactInfo?: string;
  logoUrl?: string;
}

interface FloorLite {
  id: string;
  name?: string;
  rooms?: { id: string; name: string; x: number; y: number }[];
}

export function ConferenceSponsorsPanel({ conferenceId }: { conferenceId: string }) {
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [packageLevel, setPackageLevel] = useState("");
  const [description, setDescription] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [perks, setPerks] = useState("");
  const [booth, setBooth] = useState("");
  const [giveawayPrize, setGiveawayPrize] = useState("");
  const [giveawayInstructions, setGiveawayInstructions] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [roomId, setRoomId] = useState("");
  const [floors, setFloors] = useState<FloorLite[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "conferences", conferenceId, "floors")),
      (snap) => setFloors(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FloorLite, "id">) }))),
      () => {},
    );
    return () => unsub();
  }, [conferenceId]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "conferences", conferenceId, "sponsors")),
      (snap) => {
        const rows: SponsorRow[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SponsorRow, "id">) }));
        rows.sort((a, b) => (a.companyName ?? "").localeCompare(b.companyName ?? ""));
        setSponsors(rows);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [conferenceId]);

  const reset = useCallback(() => {
    setEditingId(null);
    setCompanyName("");
    setPackageLevel("");
    setDescription("");
    setCtaLabel("");
    setCtaUrl("");
    setPerks("");
    setBooth("");
    setGiveawayPrize("");
    setGiveawayInstructions("");
    setContactInfo("");
    setLogoUrl("");
    setLogoFile(null);
    setRoomId("");
  }, []);

  const loadIntoForm = (s: SponsorRow) => {
    setEditingId(s.id);
    setCompanyName(s.companyName ?? "");
    setPackageLevel(s.packageLevel ?? "");
    setDescription(s.description ?? "");
    setCtaLabel(s.ctaLabel ?? "");
    setCtaUrl(s.ctaUrl ?? "");
    setPerks((s.perks ?? []).join("\n"));
    setBooth(s.booth ?? "");
    setGiveawayPrize(s.giveawayPrize ?? "");
    setGiveawayInstructions(s.giveawayInstructions ?? "");
    setContactInfo(s.contactInfo ?? "");
    setLogoUrl(s.logoUrl ?? "");
    setLogoFile(null);
    setRoomId(s.mapRoomId ?? "");
  };

  const resolveLogo = async (): Promise<string> => {
    if (logoFile) {
      const safe = logoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `conferences/${conferenceId}/sponsors/${Date.now()}_${safe}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, logoFile, { contentType: logoFile.type || "image/jpeg" });
      return await getDownloadURL(storageRef);
    }
    return logoUrl.trim();
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!companyName.trim()) {
        setError("Company name is required.");
        return;
      }
      const logo = await resolveLogo();
      const perkList = perks
        .split(/[\n,]+/)
        .map((p) => p.trim())
        .filter(Boolean);

      // Optional link to a venue-map room pin.
      let mapFloorId: string | null = null;
      let mapRoomId: string | null = null;
      if (roomId) {
        const floor = floors.find((f) => (f.rooms ?? []).some((r) => r.id === roomId));
        if (floor) {
          mapFloorId = floor.id;
          mapRoomId = roomId;
        }
      }

      const payload: Record<string, unknown> = {
        companyName: companyName.trim(),
        packageLevel: packageLevel.trim() || null,
        description: description.trim(),
        ctaLabel: ctaLabel.trim() || null,
        ctaUrl: ctaUrl.trim() || null,
        perks: perkList,
        booth: booth.trim() || null,
        mapFloorId,
        mapRoomId,
        giveawayPrize: giveawayPrize.trim() || null,
        giveawayInstructions: giveawayInstructions.trim() || null,
        contactInfo: contactInfo.trim() || null,
        logoUrl: logo || null,
        updatedAt: serverTimestamp(),
      };
      if (editingId) {
        await setDoc(doc(db, "conferences", conferenceId, "sponsors", editingId), payload, { merge: true });
      } else {
        await addDoc(collection(db, "conferences", conferenceId, "sponsors"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, label: string) => {
    if (!confirm(`Delete sponsor “${label}”?`)) return;
    try {
      await deleteDoc(doc(db, "conferences", conferenceId, "sponsors", id));
      if (editingId === id) reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Sponsors</h3>
          <p className="text-sm text-muted-foreground mt-1">Booths shown on the mobile Sponsor Hall.</p>
        </div>
        {editingId ? (
          <Button type="button" variant="outline" size="sm" onClick={reset}>New sponsor</Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Company name *</Label>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="bg-background" placeholder="TechCorp Global" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Package level</Label>
          <Input value={packageLevel} onChange={(e) => setPackageLevel(e.target.value)} className="bg-background" placeholder="Platinum / Gold / Community" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">CTA label</Label>
          <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className="bg-background" placeholder="Visit site" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">CTA link</Label>
          <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} className="bg-background" placeholder="https://…" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Booth placement</Label>
          <Input value={booth} onChange={(e) => setBooth(e.target.value)} className="bg-background" placeholder="Booth A1" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Map room (optional)</Label>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
          >
            <option value="">Not on the map</option>
            {floors.map((f) => (
              <optgroup key={f.id} label={f.name || "Floor"}>
                {(f.rooms ?? []).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {roomId ? <p className="text-xs text-muted-foreground">Shown on the venue map; tapping the pin lists this sponsor.</p> : null}
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Contact info</Label>
          <Input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} className="bg-background" placeholder="hello@techcorp.com" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Logo</Label>
          <Input type="file" accept="image/*" className="bg-background" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
          {logoUrl && !logoFile ? <p className="text-xs text-muted-foreground truncate">Current: {logoUrl}</p> : null}
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Giveaway prize</Label>
          <Input value={giveawayPrize} onChange={(e) => setGiveawayPrize(e.target.value)} className="bg-background" placeholder="MacBook Pro M3" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Description of business</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="bg-background" />
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Perks (one per line, or comma-separated)</Label>
        <Textarea value={perks} onChange={(e) => setPerks(e.target.value)} rows={2} className="bg-background" placeholder={"Free Trial\nSwag Bag\nMeet & Greet"} />
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Giveaway — how to enter</Label>
        <Textarea value={giveawayInstructions} onChange={(e) => setGiveawayInstructions(e.target.value)} rows={2} className="bg-background" placeholder="Scan the booth QR and follow us on X." />
      </div>

      <Button type="button" onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : logoFile ? <Upload className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
        {editingId ? "Save sponsor" : "Add sponsor"}
      </Button>

      <div className="border-t border-border pt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : sponsors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sponsors yet.</p>
        ) : (
          <ul className="space-y-2">
            {sponsors.map((s) => (
              <li key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/80">
                {s.logoUrl ? (
                  <img src={s.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 bg-muted" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{s.companyName || s.id}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.packageLevel ? `${s.packageLevel} · ` : ""}
                    {s.booth ? `${s.booth}` : ""}
                    {s.giveawayPrize ? " · 🎁 giveaway" : ""}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={() => loadIntoForm(s)}>Edit</Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => void remove(s.id, s.companyName || s.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
