import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { Avatar } from "../ui/avatar";
import { useAuth } from "../auth/AuthProvider";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";

/**
 * Student ↔ MORTAR direct messages, rendered as ONE open chat thread.
 *
 * Data model (unchanged, admin panel compatible):
 * - Each message the student sends is a doc in `Digital Student DMs`
 *   ({ uid, message, created_at, read }).
 * - Admin replies live in each doc's `replies` subcollection
 *   ({ message, sender: "mortar" | "user", created_at }).
 *
 * The widget merges the student's docs and every reply into a single
 * time-ordered conversation. NOTE: the student query MUST filter
 * `where("uid", "==", user.uid)` — security rules only allow reading your
 * own DM docs, so an unfiltered collection query is rejected outright
 * (which is why past conversations previously appeared empty).
 */

interface ChatMessage {
  key: string;
  message: string;
  sender: "user" | "mortar";
  created_at: Timestamp | null;
}

interface DMDoc {
  id: string;
  message: string;
  created_at: Timestamp | null;
}

export function MortarDMWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dmDocs, setDmDocs] = useState<Record<string, DMDoc>>({});
  const [repliesByDm, setRepliesByDm] = useState<Record<string, ChatMessage[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyUnsubsRef = useRef<Record<string, () => void>>({});

  // Subscribe to this student's DM docs + each doc's replies while open.
  useEffect(() => {
    if (!isOpen || !user?.uid) return;

    setLoading(true);
    const dmsRef = collection(db, "Digital Student DMs");
    // Only the caller's own docs are readable — the where clause is what
    // makes this query pass security rules. Sorting happens client-side so
    // no composite index is needed.
    const q = query(dmsRef, where("uid", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next: Record<string, DMDoc> = {};
        snapshot.docs.forEach((d) => {
          const data = d.data() as { message?: string; created_at?: Timestamp };
          next[d.id] = {
            id: d.id,
            message: data.message ?? "",
            created_at: data.created_at ?? null,
          };
        });
        setDmDocs(next);
        setLoading(false);

        // Attach a replies listener per DM doc (small N; collectionGroup
        // queries are blocked by the current rules).
        snapshot.docs.forEach((d) => {
          if (replyUnsubsRef.current[d.id]) return;
          const repliesRef = collection(db, "Digital Student DMs", d.id, "replies");
          replyUnsubsRef.current[d.id] = onSnapshot(
            query(repliesRef, orderBy("created_at", "asc")),
            (replySnap) => {
              const replies: ChatMessage[] = replySnap.docs.map((r) => {
                const data = r.data() as {
                  message?: string;
                  sender?: string;
                  created_at?: Timestamp;
                };
                return {
                  key: `${d.id}/${r.id}`,
                  message: data.message ?? "",
                  sender: data.sender === "mortar" ? "mortar" : "user",
                  created_at: data.created_at ?? null,
                };
              });
              setRepliesByDm((prev) => ({ ...prev, [d.id]: replies }));
            },
            (error) => console.error("Error loading replies:", error)
          );
        });

        // Drop listeners for docs that disappeared.
        const liveIds = new Set(snapshot.docs.map((d) => d.id));
        Object.keys(replyUnsubsRef.current).forEach((id) => {
          if (!liveIds.has(id)) {
            replyUnsubsRef.current[id]();
            delete replyUnsubsRef.current[id];
          }
        });
      },
      (error) => {
        console.error("Error loading conversation:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      Object.values(replyUnsubsRef.current).forEach((unsub) => unsub());
      replyUnsubsRef.current = {};
    };
  }, [isOpen, user?.uid]);

  // One flat, time-ordered thread: the student's sent messages + all replies.
  const thread: ChatMessage[] = [
    ...Object.values(dmDocs).map((dm) => ({
      key: dm.id,
      message: dm.message,
      sender: "user" as const,
      created_at: dm.created_at,
    })),
    ...Object.values(repliesByDm).flat(),
  ].sort((a, b) => {
    // Pending local writes have a null server timestamp — sink them to the end.
    const ta = a.created_at ? a.created_at.toMillis() : Number.MAX_SAFE_INTEGER;
    const tb = b.created_at ? b.created_at.toMillis() : Number.MAX_SAFE_INTEGER;
    return ta - tb;
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, isOpen, loading]);

  const handleSend = async () => {
    if (!user?.uid || !message.trim()) return;

    setSending(true);
    try {
      await addDoc(collection(db, "Digital Student DMs"), {
        uid: user.uid,
        message: message.trim(),
        created_at: serverTimestamp(),
        read: false,
      });
      trackEvent(WEB_ANALYTICS_EVENTS.MORTAR_DM_MESSAGE_SENT, {});
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: Timestamp | null): string => {
    if (!timestamp) return "sending…";
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return (
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    }
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Button - Upper Right Corner */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-6 z-50 px-4 py-2 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg flex items-center gap-2 transition-all hover:scale-105"
        aria-label="DM MORTAR"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="font-medium text-sm">DM MORTAR</span>
      </button>

      {/* DM Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-2xl h-[600px] max-h-[85vh] flex flex-col relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground mb-1">Message MORTAR</h2>
              <p className="text-sm text-muted-foreground">
                Chat with the MORTAR team — your full conversation lives here.
              </p>
            </div>

            {/* Messages Area — the only scrollable region */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading conversation…</p>
                  </div>
                </div>
              ) : thread.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-foreground font-medium mb-1">Start the conversation</p>
                    <p className="text-sm text-muted-foreground">
                      Send your first message to MORTAR below.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {thread.map((msg) => {
                    const isMortar = msg.sender === "mortar";
                    return (
                      <div
                        key={msg.key}
                        className={`flex gap-3 ${isMortar ? "" : "flex-row-reverse"}`}
                      >
                        <Avatar
                          className={`w-8 h-8 flex items-center justify-center shrink-0 ${
                            isMortar
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <span className="text-xs font-bold">{isMortar ? "M" : "You"}</span>
                        </Avatar>
                        <div
                          className={`flex flex-col ${
                            isMortar ? "items-start" : "items-end"
                          } max-w-[75%]`}
                        >
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isMortar
                                ? "bg-accent text-accent-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.message}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 px-1">
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Composer — always visible */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
