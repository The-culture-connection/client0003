import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { Avatar } from "../ui/avatar";
import { useAuth } from "../auth/AuthProvider";
import {
  doc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";

interface DMReply {
  id: string;
  message: string;
  sender: "user" | "mortar";
  created_at: Timestamp;
}

interface DirectMessage {
  id: string;
  uid: string;
  message: string;
  created_at: Timestamp;
  read: boolean;
}

export function MortarDMWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<DirectMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [replies, setReplies] = useState<DMReply[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user?.uid) {
      loadConversations();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (selectedConversation) {
      loadReplies(selectedConversation);
      setupRepliesListener(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const dmsRef = collection(db, "Digital Student DMs");
      const q = query(dmsRef, orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      const userDMs = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((dm: any) => dm.uid === user.uid) as DirectMessage[];
      setConversations(userDMs);
      if (userDMs.length > 0 && !selectedConversation) {
        setSelectedConversation(userDMs[0].id);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async (dmId: string) => {
    try {
      const repliesRef = collection(db, "Digital Student DMs", dmId, "replies");
      const q = query(repliesRef, orderBy("created_at", "asc"));
      const snapshot = await getDocs(q);
      const repliesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DMReply[];
      setReplies(repliesData);
    } catch (error) {
      console.error("Error loading replies:", error);
    }
  };

  const setupRepliesListener = (dmId: string) => {
    const repliesRef = collection(db, "Digital Student DMs", dmId, "replies");
    const q = query(repliesRef, orderBy("created_at", "asc"));
    
    return onSnapshot(q, (snapshot) => {
      const repliesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DMReply[];
      setReplies(repliesData);
    });
  };

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
      await loadConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: any): string => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  };

  if (!user) return null;

  const currentConversation = conversations.find((c) => c.id === selectedConversation);

  return (
    <>
      {/* Floating Button - Upper Right Corner */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-6 z-50 px-4 py-2 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg flex items-center gap-2 transition-all hover:scale-105"
        aria-label="DM Mortar"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="font-medium text-sm">DM Mortar</span>
      </button>

      {/* DM Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-2xl h-[600px] flex flex-col relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground mb-1">
                Message Mortar
              </h2>
              <p className="text-sm text-muted-foreground">
                Send a message to the Mortar team or view your conversation history.
              </p>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* Conversations Sidebar */}
                {conversations.length > 0 && (
                  <div className="w-64 border-r border-border overflow-y-auto">
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        Your Messages
                      </h3>
                      <div className="space-y-2">
                        {conversations.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => {
                              if (conv.id !== selectedConversation) {
                                trackEvent(WEB_ANALYTICS_EVENTS.MORTAR_DM_REPLY_THREAD_SELECTED, {
                                  thread_id: conv.id,
                                });
                              }
                              setSelectedConversation(conv.id);
                            }}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                              selectedConversation === conv.id
                                ? "bg-accent/10 border border-accent"
                                : "bg-muted/50 hover:bg-muted"
                            }`}
                          >
                            <p className="text-xs text-muted-foreground mb-1">
                              {formatTime(conv.created_at)}
                            </p>
                            <p className="text-sm text-foreground line-clamp-2">
                              {conv.message}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Conversation View */}
                <div className="flex-1 flex flex-col">
                  {selectedConversation && currentConversation ? (
                    <>
                      {/* Messages Area */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Original Message */}
                        <div className="flex gap-3">
                          <Avatar className="w-8 h-8 bg-accent/10 text-accent flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold">You</span>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-muted rounded-lg px-4 py-2">
                              <p className="text-sm text-foreground whitespace-pre-wrap">
                                {currentConversation.message}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 px-1">
                              {formatTime(currentConversation.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Replies */}
                        {replies.map((reply) => (
                          <div
                            key={reply.id}
                            className={`flex gap-3 ${reply.sender === "mortar" ? "" : "flex-row-reverse"}`}
                          >
                            <Avatar
                              className={`w-8 h-8 flex items-center justify-center shrink-0 ${
                                reply.sender === "mortar"
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              <span className="text-xs font-bold">
                                {reply.sender === "mortar" ? "M" : "You"}
                              </span>
                            </Avatar>
                            <div
                              className={`flex-1 ${
                                reply.sender === "mortar" ? "" : "flex flex-col items-end"
                              }`}
                            >
                              <div
                                className={`rounded-lg px-4 py-2 ${
                                  reply.sender === "mortar"
                                    ? "bg-accent text-accent-foreground"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">
                                  {reply.message}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 px-1">
                                {formatTime(reply.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Input Area */}
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
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-6">
                      <div className="text-center">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-foreground font-medium mb-2">
                          Start a conversation
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Send your first message to Mortar below
                        </p>
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Type your message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            className="resize-none"
                          />
                          <Button
                            onClick={handleSend}
                            disabled={!message.trim() || sending}
                            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                          >
                            {sending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Message
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
