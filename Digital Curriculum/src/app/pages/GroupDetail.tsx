import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Avatar } from "../components/ui/avatar";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import {
  ArrowLeft,
  Send,
  Users,
  Clock,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../components/auth/AuthProvider";
import {
  getGroup,
  getGroupMessages,
  sendGroupMessage,
  joinGroup,
  isUserMember,
  isUserPending,
  getMemberCount,
  type Group,
  type GroupMessage,
} from "../lib/groups";
import { onSnapshot, collection, query, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useScreenAnalytics } from "../analytics/useScreenAnalytics";
import { trackEvent } from "../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";

export function GroupDetailPage() {
  useScreenAnalytics("group_detail");
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [sendAnonymous, setSendAnonymous] = useState(false);
  const [myDisplayName, setMyDisplayName] = useState<string | null>(null);
  const [senderNamesMap, setSenderNamesMap] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id && user?.uid) {
      loadGroup();
      setupMessageListener();
    }
  }, [id, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    async function loadMyProfile() {
      if (!user?.uid) {
        setMyDisplayName(null);
        return;
      }
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          if (!cancelled) setMyDisplayName(user.displayName || user.email || "User");
          return;
        }
        const data = snap.data() as any;
        const name =
          [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
          data?.display_name ||
          user.displayName ||
          user.email ||
          "User";
        if (!cancelled) setMyDisplayName(name);
      } catch {
        if (!cancelled) setMyDisplayName(user.displayName || user.email || "User");
      }
    }
    loadMyProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    let cancelled = false;
    async function loadSenderNames() {
      const senderIds = Array.from(
        new Set(
          messages
            .filter((m) => !m.IsAnonymous)
            .map((m) => m.Senderid)
            .filter(Boolean)
        )
      );

      const toFetch = senderIds.filter((sid) => !senderNamesMap[sid]);
      if (toFetch.length === 0) return;

      try {
        const results = await Promise.all(
          toFetch.map(async (sid) => {
            const userRef = doc(db, "users", sid);
            const snap = await getDoc(userRef);
            return { sid, snap };
          })
        );

        const nextMap: Record<string, string> = {};
        for (const r of results) {
          const name =
            r.snap.exists()
              ? (() => {
                  const data = r.snap.data() as any;
                  return (
                    [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
                    data?.display_name ||
                    "User"
                  );
                })()
              : "User";
          nextMap[r.sid] = name;
        }

        if (!cancelled) {
          setSenderNamesMap((prev) => ({ ...prev, ...nextMap }));
        }
      } catch {
        // Ignore lookup failures; messages will still render using initials.
      }
    }

    if (messages.length > 0) {
      loadSenderNames();
    }

    return () => {
      cancelled = true;
    };
  }, [messages, senderNamesMap]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadGroup = async () => {
    if (!id || !user?.uid) return;
    setLoading(true);
    try {
      const groupData = await getGroup(id);
      if (!groupData) {
        navigate("/community");
        return;
      }
      setGroup(groupData);
      setIsMember(isUserMember(groupData, user.uid));
      setIsPending(isUserPending(groupData, user.uid));
      
      const messagesData = await getGroupMessages(id);
      setMessages(messagesData);
    } catch (error) {
      console.error("Error loading group:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupMessageListener = () => {
    if (!id) return;
    
    const messagesRef = collection(db, "Groups", id, "Messages");
    const q = query(messagesRef, orderBy("Sendtime", "asc"), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as GroupMessage[];
      setMessages(newMessages);
    });

    return () => unsubscribe();
  };

  const handleJoin = async () => {
    if (!id || !user?.uid) return;
    trackEvent(WEB_ANALYTICS_EVENTS.GROUP_JOIN_CLICKED, { group_id: id });
    setJoining(true);
    try {
      const result = await joinGroup(id, user.uid);
      if (result.success) {
        setIsMember(true);
        await loadGroup();
      } else if (result.pending) {
        setIsPending(true);
        alert("Your request to join has been sent. You'll be notified when approved.");
      }
    } catch (error) {
      console.error("Error joining group:", error);
      trackEvent(WEB_ANALYTICS_EVENTS.GROUP_JOIN_FAILED, { group_id: id });
      alert("Failed to join group. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const handleSendMessage = async () => {
    if (!id || !user?.uid || !messageContent.trim()) return;
    setSending(true);
    try {
      await sendGroupMessage(id, user.uid, messageContent.trim(), {
        isAnonymous: sendAnonymous,
        senderName: myDisplayName || "User",
      });
      trackEvent(WEB_ANALYTICS_EVENTS.GROUP_MESSAGE_SEND_CLICKED, { group_id: id });
      setMessageContent("");
      setSendAnonymous(false);
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
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  };

  const isMyMessage = (message: GroupMessage): boolean => {
    return message.Senderid === user?.uid;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/community")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Community Hub
        </Button>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Group not found</p>
        </Card>
      </div>
    );
  }

  // Show join screen if user is not a member
  if (!isMember && !isPending) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/community")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Community Hub
          </Button>

          <Card className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{group.Name}</h1>
              <Badge
                variant={group.Status === "Open" ? "default" : "secondary"}
                className="mb-4"
              >
                {group.Status}
              </Badge>
              <p className="text-muted-foreground mb-4">
                {getMemberCount(group)} {getMemberCount(group) === 1 ? "member" : "members"}
              </p>
            </div>

            <Button
              onClick={handleJoin}
              disabled={joining}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  {group.Status === "Open" ? "Join Group" : "Request to Join"}
                </>
              )}
            </Button>

            {group.Status === "Closed" && (
              <p className="text-sm text-muted-foreground mt-4">
                This group requires approval. Your request will be reviewed by an admin.
              </p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Show pending screen
  if (isPending) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/community")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Community Hub
          </Button>

          <Card className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{group.Name}</h1>
              <p className="text-muted-foreground">
                Your request to join is pending approval.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/community")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">{group.Name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={group.Status === "Open" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {group.Status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getMemberCount(group)} {getMemberCount(group) === 1 ? "member" : "members"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const myMessage = isMyMessage(message);
                const isAnonymousMessage = Boolean(message.IsAnonymous);
                const authorLabel = isAnonymousMessage
                  ? "Anonymous"
                  : (message.SenderName || senderNamesMap[message.Senderid] || "User");
                const initials = authorLabel.trim().slice(0, 2).toUpperCase();
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${myMessage ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="w-8 h-8 bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold">
                        {initials}
                      </span>
                    </Avatar>
                    <div className={`flex flex-col ${myMessage ? "items-end" : "items-start"} max-w-[70%]`}>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          myMessage
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-xs font-medium mb-1 opacity-90">
                          {authorLabel}
                        </p>
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.Content}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-1">
                        {formatTime(message.Sendtime)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Checkbox
              id="group-message-anon"
              checked={sendAnonymous}
              onCheckedChange={(v) => setSendAnonymous(Boolean(v))}
            />
            <Label htmlFor="group-message-anon" className="cursor-pointer text-sm text-muted-foreground">
              Send anonymously (hide your name)
            </Label>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageContent.trim() || sending}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
