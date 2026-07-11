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
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Loader2, Check, Trash2, Upload } from "lucide-react";

interface SessionRow {
  id: string;
  title?: string;
  description?: string;
  track?: string;
  roomLabel?: string;
  speakerNames?: string[];
  speakerTitle?: string;
  speakerPhotoUrl?: string;
  startTime?: Timestamp;
  endTime?: Timestamp;
}

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

export function ConferenceSessionsPanel({ conferenceId }: { conferenceId: string }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [speakerTitle, setSpeakerTitle] = useState("");
  const [where, setWhere] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "conferences", conferenceId, "sessions")),
      (snap) => {
        const rows: SessionRow[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SessionRow, "id">) }));
        rows.sort((a, b) => (a.startTime?.seconds ?? 0) - (b.startTime?.seconds ?? 0));
        setSessions(rows);
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
    setName("");
    setCategory("");
    setStartAt("");
    setEndAt("");
    setSpeaker("");
    setSpeakerTitle("");
    setWhere("");
    setDescription("");
    setPhotoUrl("");
    setPhotoFile(null);
  }, []);

  const loadIntoForm = (s: SessionRow) => {
    setEditingId(s.id);
    setName(s.title ?? "");
    setCategory(s.track ?? "");
    setStartAt(tsToLocalInput(s.startTime));
    setEndAt(tsToLocalInput(s.endTime));
    setSpeaker(s.speakerNames?.[0] ?? "");
    setSpeakerTitle(s.speakerTitle ?? "");
    setWhere(s.roomLabel ?? "");
    setDescription(s.description ?? "");
    setPhotoUrl(s.speakerPhotoUrl ?? "");
    setPhotoFile(null);
  };

  const resolvePhoto = async (): Promise<string> => {
    if (photoFile) {
      const safe = photoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `conferences/${conferenceId}/speakers/${Date.now()}_${safe}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, photoFile, { contentType: photoFile.type || "image/jpeg" });
      return await getDownloadURL(storageRef);
    }
    return photoUrl.trim();
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!name.trim()) {
        setError("Session name is required.");
        return;
      }
      const photo = await resolvePhoto();
      const payload: Record<string, unknown> = {
        title: name.trim(),
        description: description.trim(),
        track: category.trim() || null,
        roomLabel: where.trim() || null,
        speakerNames: speaker.trim() ? [speaker.trim()] : [],
        speakerTitle: speakerTitle.trim() || null,
        speakerPhotoUrl: photo || null,
        startTime: localInputToTs(startAt),
        endTime: localInputToTs(endAt),
        updatedAt: serverTimestamp(),
      };
      if (editingId) {
        await setDoc(doc(db, "conferences", conferenceId, "sessions", editingId), payload, { merge: true });
      } else {
        await addDoc(collection(db, "conferences", conferenceId, "sessions"), {
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
    if (!confirm(`Delete session “${label}”?`)) return;
    try {
      await deleteDoc(doc(db, "conferences", conferenceId, "sessions", id));
      if (editingId === id) reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Sessions / Schedule</h3>
          <p className="text-sm text-muted-foreground mt-1">Talks and workshops shown on the mobile Event Schedule.</p>
        </div>
        {editingId ? (
          <Button type="button" variant="outline" size="sm" onClick={reset}>New session</Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-background" placeholder="The Future of AI in Startups" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Category</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} className="bg-background" placeholder="AI/ML, Product, Design…" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Date &amp; time (start)</Label>
          <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">End time</Label>
          <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Where</Label>
          <Input value={where} onChange={(e) => setWhere(e.target.value)} className="bg-background" placeholder="Main Stage" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Presenter</Label>
          <Input value={speaker} onChange={(e) => setSpeaker(e.target.value)} className="bg-background" placeholder="Dr. Sarah Chen" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Presenter title</Label>
          <Input value={speakerTitle} onChange={(e) => setSpeakerTitle(e.target.value)} className="bg-background" placeholder="AI Research Lead, TechCorp" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Presenter photo</Label>
          <Input type="file" accept="image/*" className="bg-background" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
          {photoUrl && !photoFile ? <p className="text-xs text-muted-foreground truncate">Current: {photoUrl}</p> : null}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="bg-background" />
      </div>
      <Button type="button" onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : photoFile ? <Upload className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
        {editingId ? "Save session" : "Add session"}
      </Button>

      <div className="border-t border-border pt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/80">
                {s.speakerPhotoUrl ? (
                  <img src={s.speakerPhotoUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 bg-muted" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{s.title || s.id}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.track ? `${s.track} · ` : ""}
                    {s.startTime ? s.startTime.toDate().toLocaleString() : "no time"}
                    {s.roomLabel ? ` · ${s.roomLabel}` : ""}
                    {s.speakerNames?.[0] ? ` · ${s.speakerNames[0]}` : ""}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={() => loadIntoForm(s)}>Edit</Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => void remove(s.id, s.title || s.id)}>
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
