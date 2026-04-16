import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import {
  ArrowLeft,
  ThumbsUp,
  MessageCircle,
  Eye,
  Pin,
  Flame,
  Send,
} from "lucide-react";
import { Avatar } from "../components/ui/avatar";
import { useAuth } from "../components/auth/AuthProvider";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  getDiscussion,
  addReply,
  toggleLike,
  incrementViews,
  getReplyCount,
  collectReplyIds,
  getUserLikeFlagsForDiscussion,
  type Discussion,
  type DiscussionReply,
} from "../lib/discussions";
import { useScreenAnalytics } from "../analytics/useScreenAnalytics";
import { trackEvent } from "../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";

export function DiscussionDetailPage() {
  useScreenAnalytics("discussion_detail");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [nestedReplyContent, setNestedReplyContent] = useState<Record<string, string>>({});
  const [showNestedReply, setShowNestedReply] = useState<Record<string, boolean>>({});
  const [replyBusy, setReplyBusy] = useState(false);
  const [discussionLoading, setDiscussionLoading] = useState(true);
  const [threadLiked, setThreadLiked] = useState(false);
  const [replyLiked, setReplyLiked] = useState<Record<string, boolean>>({});
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [nestedReplyAnonymous, setNestedReplyAnonymous] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!user?.uid) {
        setDisplayName(null);
        return;
      }
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          if (!cancelled) setDisplayName(user.displayName || user.email || "User");
          return;
        }
        const data = snap.data() as any;
        const name =
          [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
          data?.display_name ||
          user.displayName ||
          user.email ||
          "User";
        if (!cancelled) setDisplayName(name);
      } catch {
        if (!cancelled) setDisplayName(user.displayName || user.email || "User");
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const loadDiscussion = useCallback(async (mode: "full" | "silent") => {
    if (!id) return;
    if (mode === "full") setDiscussionLoading(true);
    try {
      const disc = await getDiscussion(id);
      setDiscussion(disc);
    } catch (e) {
      console.error(e);
      setDiscussion(null);
    } finally {
      if (mode === "full") setDiscussionLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setDiscussionLoading(false);
      setDiscussion(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await incrementViews(id);
      } catch (e) {
        console.error(e);
      }
      if (cancelled) return;
      await loadDiscussion("full");
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadDiscussion]);

  useEffect(() => {
    if (!id || !user?.uid || !discussion) {
      if (!user?.uid) {
        setThreadLiked(false);
        setReplyLiked({});
      }
      return;
    }
    let cancelled = false;
    (async () => {
      const ids = collectReplyIds(discussion.replies);
      try {
        const flags = await getUserLikeFlagsForDiscussion(id, user.uid, ids);
        if (!cancelled) {
          setThreadLiked(flags.threadLiked);
          setReplyLiked(flags.replyLiked);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.uid, discussion]);

  const handleLike = async (replyId?: string) => {
    if (!id || !discussion || !user?.uid) {
      alert("Sign in to like posts and replies.");
      return;
    }
    try {
      await toggleLike(id, user.uid, replyId);
      trackEvent(WEB_ANALYTICS_EVENTS.DISCUSSION_LIKE_TOGGLED, {
        discussion_id: id,
        target: replyId ? "reply" : "thread",
        reply_id: replyId ?? null,
      });
      await loadDiscussion("silent");
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleReply = async () => {
    if (!id || !replyContent.trim() || !user?.uid) {
      if (!user?.uid) alert("Sign in to reply.");
      return;
    }
    setReplyBusy(true);
    try {
      await addReply(id, replyContent.trim(), user.uid, undefined, {
        isAnonymous: replyAnonymous,
        authorName: displayName || "User",
      });
      trackEvent(WEB_ANALYTICS_EVENTS.DISCUSSION_REPLY_SUBMIT_CLICKED, {
        discussion_id: id,
        depth: "root",
      });
      setReplyContent("");
      setReplyAnonymous(false);
      await loadDiscussion("silent");
    } catch (error) {
      console.error("Error adding reply:", error);
      alert("Failed to add reply. Please try again.");
    } finally {
      setReplyBusy(false);
    }
  };

  const handleNestedReply = async (parentReplyId: string) => {
    if (!id || !nestedReplyContent[parentReplyId]?.trim() || !user?.uid) {
      if (!user?.uid) alert("Sign in to reply.");
      return;
    }
    setReplyBusy(true);
    try {
      await addReply(id, nestedReplyContent[parentReplyId].trim(), user.uid, parentReplyId, {
        isAnonymous: nestedReplyAnonymous[parentReplyId] ?? false,
        authorName: displayName || "User",
      });
      trackEvent(WEB_ANALYTICS_EVENTS.DISCUSSION_REPLY_SUBMIT_CLICKED, {
        discussion_id: id,
        depth: "nested",
        parent_reply_id: parentReplyId,
      });
      setNestedReplyContent({ ...nestedReplyContent, [parentReplyId]: "" });
      setShowNestedReply({ ...showNestedReply, [parentReplyId]: false });
      await loadDiscussion("silent");
    } catch (error) {
      console.error("Error adding nested reply:", error);
      alert("Failed to add reply. Please try again.");
    } finally {
      setReplyBusy(false);
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  };

  const renderReply = (reply: DiscussionReply, level = 0): JSX.Element => {
    const isLiked = Boolean(replyLiked[reply.id]);
    const authorLabel = reply.isAnonymous
      ? "Anonymous"
      : (reply.authorName || reply.author || "User");
    const initials = authorLabel.trim().slice(0, 2).toUpperCase();

    return (
      <div key={reply.id} className={level > 0 ? "ml-8 mt-3" : "mt-4"}>
        <div className="flex gap-3">
          <Avatar className="w-8 h-8 bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <span className="text-xs font-bold">
              {initials}
            </span>
          </Avatar>
          <div className="flex-1">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-foreground mb-2">{reply.content}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{authorLabel} • {formatTimeAgo(reply.createdAt)}</span>
                <button
                  type="button"
                  onClick={() => void handleLike(reply.id)}
                  className={`flex items-center gap-1 hover:text-accent transition-colors ${
                    isLiked ? "text-accent" : ""
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>{reply.likes}</span>
                </button>
                {level === 0 && (
                  <button
                    onClick={() =>
                      setShowNestedReply({
                        ...showNestedReply,
                        [reply.id]: !showNestedReply[reply.id],
                      })
                    }
                    className="flex items-center gap-1 hover:text-accent transition-colors"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>Reply</span>
                  </button>
                )}
              </div>
            </div>

            {showNestedReply[reply.id] && (
              <div className="mt-2 ml-4">
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    id={`nested-anon-${reply.id}`}
                    checked={nestedReplyAnonymous[reply.id] ?? false}
                    onCheckedChange={(v) =>
                      setNestedReplyAnonymous({
                        ...nestedReplyAnonymous,
                        [reply.id]: Boolean(v),
                      })
                    }
                  />
                  <Label
                    htmlFor={`nested-anon-${reply.id}`}
                    className="cursor-pointer text-xs text-muted-foreground"
                  >
                    Reply anonymously
                  </Label>
                </div>
                <Textarea
                  placeholder="Write a reply..."
                  value={nestedReplyContent[reply.id] || ""}
                  onChange={(e) =>
                    setNestedReplyContent({
                      ...nestedReplyContent,
                      [reply.id]: e.target.value,
                    })
                  }
                  rows={2}
                  className="mb-2"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleNestedReply(reply.id)}
                    disabled={!nestedReplyContent[reply.id]?.trim() || replyBusy}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    Post Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowNestedReply({ ...showNestedReply, [reply.id]: false });
                      setNestedReplyContent({ ...nestedReplyContent, [reply.id]: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {reply.replies && reply.replies.length > 0 && (
              <div className="mt-2">
                {reply.replies.map((nestedReply) => renderReply(nestedReply, level + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (discussionLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/discussions")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Discussions
        </Button>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading discussion…</p>
        </Card>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/discussions")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Discussions
        </Button>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Discussion not found</p>
        </Card>
      </div>
    );
  }

  const isLiked = threadLiked;
  const discussionAuthorLabel = discussion.isAnonymous
    ? "Anonymous"
    : (discussion.authorName || discussion.author || "User");
  const discussionInitials = discussionAuthorLabel.trim().slice(0, 2).toUpperCase();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate("/discussions")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Discussions
      </Button>

      {/* Discussion Header */}
      <Card className="p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="w-12 h-12 bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <span className="text-sm font-bold">
              {discussionInitials}
            </span>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {discussion.isPinned && (
                    <Pin className="w-4 h-4 text-accent" />
                  )}
                  {discussion.isHot && (
                    <Flame className="w-4 h-4 text-orange-500" />
                  )}
                  <h1 className="text-2xl font-bold text-foreground">
                    {discussion.title}
                  </h1>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                  <span>{discussionAuthorLabel} • {formatTimeAgo(discussion.createdAt)}</span>
                  <Badge className="bg-accent/10 text-accent">
                    {discussion.category}
                  </Badge>
                </div>
              </div>
            </div>
            <p className="text-foreground mb-4 whitespace-pre-wrap">
              {discussion.content}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => void handleLike()}
                className={`flex items-center gap-1 hover:text-accent transition-colors ${
                  isLiked ? "text-accent" : ""
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{discussion.likes}</span>
              </button>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{getReplyCount(discussion)} replies</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{discussion.views} views</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Reply Form */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Add a Reply</h2>
        <Textarea
          placeholder="Write your reply..."
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          rows={4}
          className="mb-4"
        />
        <div className="flex items-center gap-2 mb-4">
          <Checkbox
            id="reply-anonymous"
            checked={replyAnonymous}
            onCheckedChange={(v) => setReplyAnonymous(Boolean(v))}
          />
          <Label htmlFor="reply-anonymous" className="cursor-pointer text-sm text-muted-foreground">
            Reply anonymously (hide your name)
          </Label>
        </div>
        <Button
          onClick={() => void handleReply()}
          disabled={!replyContent.trim() || replyBusy}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Send className="w-4 h-4 mr-2" />
          {replyBusy ? "Posting..." : "Post Reply"}
        </Button>
      </Card>

      {/* Replies */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {discussion.replies.length} {discussion.replies.length === 1 ? "Reply" : "Replies"}
        </h2>
        {discussion.replies.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No replies yet. Be the first to reply!
            </p>
          </Card>
        ) : (
          discussion.replies.map((reply) => renderReply(reply))
        )}
      </div>
    </div>
  );
}
