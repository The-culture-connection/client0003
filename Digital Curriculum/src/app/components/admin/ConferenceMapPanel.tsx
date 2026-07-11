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
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Loader2, Check, Trash2, Upload, MapPin } from "lucide-react";

interface Room {
  id: string;
  name: string;
  x: number; // 0..1
  y: number; // 0..1
}

interface FloorRow {
  id: string;
  name?: string;
  imageUrl?: string;
  order?: number;
  rooms?: Room[];
}

function newRoomId() {
  return `room_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function ConferenceMapPanel({ conferenceId }: { conferenceId: string }) {
  const [floors, setFloors] = useState<FloorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Floor form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [order, setOrder] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Room editor dialog
  const [editorFloor, setEditorFloor] = useState<FloorRow | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "conferences", conferenceId, "floors")),
      (snap) => {
        const rows: FloorRow[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FloorRow, "id">) }));
        rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.name ?? "").localeCompare(b.name ?? ""));
        setFloors(rows);
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
    setOrder("0");
    setImageUrl("");
    setImageFile(null);
  }, []);

  const loadIntoForm = (f: FloorRow) => {
    setEditingId(f.id);
    setName(f.name ?? "");
    setOrder(String(f.order ?? 0));
    setImageUrl(f.imageUrl ?? "");
    setImageFile(null);
  };

  const resolveImage = async (): Promise<string> => {
    if (imageFile) {
      const safe = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `conferences/${conferenceId}/maps/${Date.now()}_${safe}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, imageFile, { contentType: imageFile.type || "image/png" });
      return await getDownloadURL(storageRef);
    }
    return imageUrl.trim();
  };

  const saveFloor = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!name.trim()) {
        setError("Floor name is required.");
        return;
      }
      const image = await resolveImage();
      if (!image) {
        setError("Upload a floor-plan image (or paste an image URL).");
        return;
      }
      const payload: Record<string, unknown> = {
        name: name.trim(),
        imageUrl: image,
        order: parseInt(order, 10) || 0,
        updatedAt: serverTimestamp(),
      };
      if (editingId) {
        await setDoc(doc(db, "conferences", conferenceId, "floors", editingId), payload, { merge: true });
      } else {
        await addDoc(collection(db, "conferences", conferenceId, "floors"), {
          ...payload,
          rooms: [],
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

  const removeFloor = async (id: string, label: string) => {
    if (!confirm(`Delete floor “${label}” and its room pins?`)) return;
    try {
      await deleteDoc(doc(db, "conferences", conferenceId, "floors", id));
      if (editingId === id) reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const saveRooms = async (floorId: string, rooms: Room[]) => {
    try {
      await setDoc(
        doc(db, "conferences", conferenceId, "floors", floorId),
        { rooms, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save rooms");
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Venue map / floor plans</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a floor-plan image per floor, then click <strong>Label rooms</strong> to drop &amp; name pins.
            Pins store normalized coordinates so they scale on any device.
          </p>
        </div>
        {editingId ? (
          <Button type="button" variant="outline" size="sm" onClick={reset}>New floor</Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Floor name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-background" placeholder="Ground Floor" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Order</Label>
          <Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Floor-plan image (PNG)</Label>
          <Input type="file" accept="image/*" className="bg-background" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="space-y-2 md:col-span-3">
          <Label className="text-foreground">…or image URL</Label>
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="bg-background" placeholder="https://…" />
        </div>
      </div>
      <Button type="button" onClick={() => void saveFloor()} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : imageFile ? <Upload className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
        {editingId ? "Save floor" : "Add floor"}
      </Button>

      <div className="border-t border-border pt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : floors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No floors yet.</p>
        ) : (
          <ul className="space-y-2">
            {floors.map((f) => (
              <li key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/80">
                {f.imageUrl ? (
                  <img src={f.imageUrl} alt="" className="w-12 h-12 rounded object-cover shrink-0 bg-muted" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{f.name || f.id}</p>
                  <p className="text-xs text-muted-foreground">
                    order {f.order ?? 0} · {(f.rooms?.length ?? 0)} room{(f.rooms?.length ?? 0) === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditorFloor(f)} disabled={!f.imageUrl}>
                    <MapPin className="w-3.5 h-3.5 mr-1" /> Label rooms
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => loadIntoForm(f)}>Edit</Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => void removeFloor(f.id, f.name || f.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editorFloor ? (
        <RoomEditorDialog
          floor={editorFloor}
          onClose={() => setEditorFloor(null)}
          onSave={(rooms) => {
            void saveRooms(editorFloor.id, rooms);
            setEditorFloor(null);
          }}
        />
      ) : null}
    </Card>
  );
}

function RoomEditorDialog({
  floor,
  onClose,
  onSave,
}: {
  floor: FloorRow;
  onClose: () => void;
  onSave: (rooms: Room[]) => void;
}) {
  const [rooms, setRooms] = useState<Room[]>(floor.rooms ?? []);

  const addRoomAt = (x: number, y: number) => {
    setRooms((prev) => [...prev, { id: newRoomId(), name: `Room ${prev.length + 1}`, x, y }]);
  };
  const updateRoom = (id: string, patch: Partial<Room>) =>
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRoom = (id: string) => setRooms((prev) => prev.filter((r) => r.id !== id));

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    addRoomAt(x, y);
  };

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Label rooms — {floor.name}</DialogTitle>
        </DialogHeader>

        <div className="relative w-full bg-black flex items-center justify-center p-3 rounded-lg">
          <div className="relative inline-block max-w-full cursor-crosshair" onClick={handleImageClick}>
            <img src={floor.imageUrl} alt={floor.name} className="max-w-full max-h-[60vh] object-contain block" draggable={false} />
            {rooms.map((r) => (
              <div
                key={r.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%` }}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-accent border-2 border-white shadow" />
                <span className="text-[10px] leading-tight mt-0.5 px-1 rounded bg-background/85 text-foreground whitespace-nowrap max-w-[120px] truncate">
                  {r.name || "…"}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">Click the plan to drop a room pin.</p>

        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center">No rooms yet.</p>
        ) : (
          <ul className="space-y-2">
            {rooms.map((r, i) => (
              <li key={r.id} className="p-3 border border-border rounded-lg flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-6">{i + 1}</span>
                <Input
                  value={r.name}
                  onChange={(e) => updateRoom(r.id, { name: e.target.value })}
                  className="flex-1 min-w-[140px] h-8 bg-background"
                  placeholder="Room name"
                />
                <div className="flex items-center gap-1">
                  <Label className="text-xs">X%</Label>
                  <Input type="number" min={0} max={100} className="w-16 h-8"
                    value={Math.round(r.x * 100)}
                    onChange={(e) => updateRoom(r.id, { x: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })} />
                  <Label className="text-xs">Y%</Label>
                  <Input type="number" min={0} max={100} className="w-16 h-8"
                    value={Math.round(r.y * 100)}
                    onChange={(e) => updateRoom(r.id, { y: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })} />
                </div>
                <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeRoom(r.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={() => onSave(rooms)}>Save rooms</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
