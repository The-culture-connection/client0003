import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Loader2, Trash2, ImagePlus, Link2, X, Newspaper } from "lucide-react";

type MediaItem = { url: string; type: "image" | "video" };

type PostRow = {
  id: string;
  title: string;
  body: string;
  published: boolean;
  media: MediaItem[];
  newsletter_url?: string;
  newsletter_label?: string;
  created_at?: Timestamp | null;
};

function mediaTypeFromFile(f: File): "image" | "video" {
  return f.type.startsWith("video/") ? "video" : "image";
}

function linkHost(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

function relativeTime(ts: Timestamp | null | undefined): string {
  if (!ts?.toDate) return "Recently";
  const d = ts.toDate();
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d`;
  return `${Math.floor(sec / 604800)}w`;
}

export function MortarInfoAdminPanel() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [newsletterUrl, setNewsletterUrl] = useState("");
  const [newsletterLabel, setNewsletterLabel] = useState("");
  const [published, setPublished] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  const newsletterPreviewValid =
    newsletterUrl.trim().length > 0 && newsletterUrl.trim().startsWith("https://");

  useEffect(() => {
    const q = query(collection(db, "mortar_info_posts"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: PostRow[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const mediaRaw = data.media;
          const media: MediaItem[] = Array.isArray(mediaRaw)
            ? mediaRaw
                .map((m: unknown) => {
                  if (!m || typeof m !== "object") return null;
                  const o = m as { url?: string; type?: string };
                  if (!o.url || typeof o.url !== "string") return null;
                  const t = o.type === "video" ? "video" : "image";
                  return { url: o.url, type: t };
                })
                .filter(Boolean) as MediaItem[]
            : [];
          return {
            id: d.id,
            title: typeof data.title === "string" ? data.title : "",
            body: typeof data.body === "string" ? data.body : "",
            published: data.published === true,
            media,
            newsletter_url: typeof data.newsletter_url === "string" ? data.newsletter_url : "",
            newsletter_label: typeof data.newsletter_label === "string" ? data.newsletter_label : "",
            created_at: data.created_at as Timestamp | undefined,
          };
        });
        setPosts(rows);
        setLoading(false);
      },
      (e) => {
        setError(e.message || "Failed to load posts");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  function removeFileAt(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const b = body.trim();
    const h = headline.trim();
    if (!b && !h) {
      setError("Add a headline or something to share in the post body.");
      return;
    }
    const nu = newsletterUrl.trim();
    if (nu && !nu.startsWith("https://")) {
      setError("Newsletter link must start with https://");
      return;
    }
    setSaving(true);
    try {
      const postRef = await addDoc(collection(db, "mortar_info_posts"), {
        title: h,
        body: b,
        published,
        media: [] as MediaItem[],
        newsletter_url: nu,
        newsletter_label: newsletterLabel.trim(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      const media: MediaItem[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `mortar_info/${postRef.id}/${Date.now()}_${safeName}`;
        const sref = ref(storage, path);
        await uploadBytes(sref, file, { contentType: file.type || undefined });
        const url = await getDownloadURL(sref);
        media.push({ url, type: mediaTypeFromFile(file) });
      }

      await updateDoc(postRef, {
        media,
        updated_at: serverTimestamp(),
      });

      setHeadline("");
      setBody("");
      setNewsletterUrl("");
      setNewsletterLabel("");
      setPublished(true);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function removePost(id: string) {
    if (!confirm("Delete this post? (Files remain in Storage until removed manually.)")) return;
    setError(null);
    try {
      await deleteDoc(doc(db, "mortar_info_posts", id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }

  async function togglePublished(id: string, next: boolean) {
    setError(null);
    try {
      await updateDoc(doc(db, "mortar_info_posts", id), {
        published: next,
        updated_at: serverTimestamp(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }

  return (
    <div className="space-y-8 max-w-[720px] mx-auto pb-10">
      <p className="text-sm text-muted-foreground text-center px-2">
        Posts appear on the Expansion app home feed as <strong>Mortar</strong> updates — same layout as here.
        Target <code className="text-xs bg-muted px-1">events_mobile</code> with{" "}
        <code className="text-xs bg-muted px-1">distribution: mobile | both</code> for events.
      </p>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Composer — LinkedIn-style */}
      <Card className="overflow-hidden border-border shadow-sm">
        <form onSubmit={handlePost}>
          <div className="p-4 flex gap-3">
            <div
              className="h-12 w-12 rounded-full bg-[#0a66c2] text-white flex items-center justify-center text-lg font-bold shrink-0 select-none"
              aria-hidden
            >
              M
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Mortar</p>
                <p className="text-xs text-muted-foreground">Post to alumni home · {published ? "Visible when published" : "Draft"}</p>
              </div>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Optional headline"
                className="border-0 border-b rounded-none px-0 h-9 text-base font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent placeholder:text-muted-foreground/70"
              />
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="What do you want to share?"
                className="border-0 resize-none p-0 min-h-[120px] text-[15px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent placeholder:text-muted-foreground/70"
              />

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <div key={`${f.name}-${i}`} className="relative group rounded-md overflow-hidden border border-border bg-muted/40">
                      {f.type.startsWith("video/") ? (
                        <div className="w-28 h-28 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground p-2">
                          <span className="text-2xl">▶</span>
                          <span className="truncate max-w-[6rem]">{f.name}</span>
                        </div>
                      ) : (
                        <img src={previewUrls[i]} alt="" className="w-28 h-28 object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFileAt(i)}
                        className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-90 hover:opacity-100"
                        aria-label="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Link2 className="w-3.5 h-3.5" />
                  Newsletter or article link
                </div>
                <Input
                  value={newsletterUrl}
                  onChange={(e) => setNewsletterUrl(e.target.value)}
                  placeholder="https://…"
                  className="bg-background text-sm"
                />
                <Input
                  value={newsletterLabel}
                  onChange={(e) => setNewsletterLabel(e.target.value)}
                  placeholder="Link title (e.g. March alumni newsletter)"
                  className="bg-background text-sm"
                />
                {newsletterPreviewValid && (
                  <button
                    type="button"
                    className="w-full text-left rounded-md border border-border bg-card hover:bg-muted/50 transition-colors overflow-hidden"
                    onClick={() => window.open(newsletterUrl.trim(), "_blank", "noopener,noreferrer")}
                  >
                    <div className="flex gap-3 p-3">
                      <div className="shrink-0 w-12 h-12 rounded bg-[#0a66c2]/10 flex items-center justify-center">
                        <Newspaper className="w-6 h-6 text-[#0a66c2]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {newsletterLabel.trim() || "Newsletter & resources"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{linkHost(newsletterUrl.trim())}</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const list = e.target.files ? Array.from(e.target.files) : [];
                  if (list.length) setFiles((prev) => [...prev, ...list]);
                  e.target.value = "";
                }}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="w-5 h-5 mr-1.5" />
                    Media
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    Publish to app
                  </label>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="rounded-full px-6 min-w-[88px] bg-[#0a66c2] hover:bg-[#004182] text-white"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Card>

      {/* Feed — LinkedIn-style cards */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 px-1">Feed preview</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2 px-1">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">No posts yet.</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id}>
                <Card className="overflow-hidden border-border shadow-sm">
                  <div className="p-4 flex gap-3">
                    <div className="h-12 w-12 rounded-full bg-[#0a66c2] text-white flex items-center justify-center text-lg font-bold shrink-0">
                      M
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Mortar</p>
                          <p className="text-xs text-muted-foreground">
                            Alumni Network · Official update · {relativeTime(p.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 shrink-0">
                          <Badge variant={p.published ? "default" : "secondary"} className="text-[10px]">
                            {p.published ? "Live" : "Draft"}
                          </Badge>
                          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => togglePublished(p.id, !p.published)}>
                            {p.published ? "Unpublish" : "Publish"}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive" onClick={() => removePost(p.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {p.title.trim() ? (
                        <p className="text-[15px] font-semibold text-foreground leading-snug">{p.title}</p>
                      ) : null}
                      <p className="text-[15px] text-foreground/90 whitespace-pre-wrap leading-relaxed">{p.body || " "}</p>

                      {p.newsletter_url?.trim().startsWith("https://") && (
                        <a
                          href={p.newsletter_url.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-md border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex gap-3 p-3">
                            <div className="shrink-0 w-12 h-12 rounded bg-[#0a66c2]/10 flex items-center justify-center">
                              <Newspaper className="w-6 h-6 text-[#0a66c2]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {p.newsletter_label?.trim() || "Newsletter & resources"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{linkHost(p.newsletter_url.trim())}</p>
                            </div>
                          </div>
                        </a>
                      )}

                      {p.media.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {p.media.map((m, i) =>
                            m.type === "video" ? (
                              <a
                                key={i}
                                href={m.url}
                                target="_blank"
                                rel="noreferrer"
                                className="relative block w-full max-w-[280px] h-40 rounded-md bg-black/80 flex items-center justify-center text-white text-sm border border-border"
                              >
                                ▶ Video {i + 1}
                              </a>
                            ) : (
                              <img
                                key={i}
                                src={m.url}
                                alt=""
                                className="max-h-48 max-w-full rounded-md object-cover border border-border"
                              />
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
