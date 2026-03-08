import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
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
import {
  getDiscussion,
  addReply,
  toggleLike,
  incrementViews,
  getReplyCount,
  type Discussion,
  type DiscussionReply,
} from "../lib/discussions";

export function DiscussionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [nestedReplyContent, setNestedReplyContent] = useState<Record<string, string>>({});
  const [showNestedReply, setShowNestedReply] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadDiscussion();
      incrementViews(id);
    }
  }, [id]);

  const loadDiscussion = () => {
    if (!id) return;
    const disc = getDiscussion(id);
    setDiscussion(disc);
  };

  const handleLike = (replyId?: string) => {
    if (!id || !discussion) return;
    try {
      const result = toggleLike(id, replyId);
      loadDiscussion(); // Reload to get updated likes
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleReply = async () => {
    if (!id || !replyContent.trim()) return;
    setLoading(true);
    try {
      addReply(id, replyContent.trim());
      setReplyContent("");
      loadDiscussion();
    } catch (error) {
      console.error("Error adding reply:", error);
      alert("Failed to add reply. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNestedReply = async (parentReplyId: string) => {
    if (!id || !nestedReplyContent[parentReplyId]?.trim()) return;
    setLoading(true);
    try {
      addReply(id, nestedReplyContent[parentReplyId].trim(), parentReplyId);
      setNestedReplyContent({ ...nestedReplyContent, [parentReplyId]: "" });
      setShowNestedReply({ ...showNestedReply, [parentReplyId]: false });
      loadDiscussion();
    } catch (error) {
      console.error("Error adding nested reply:", error);
      alert("Failed to add reply. Please try again.");
    } finally {
      setLoading(false);
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
    const isLiked = reply.likedBy.includes(
      localStorage.getItem("anonymous_user_id") || ""
    );

    return (
      <div key={reply.id} className={level > 0 ? "ml-8 mt-3" : "mt-4"}>
        <div className="flex gap-3">
          <Avatar className="w-8 h-8 bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <span className="text-xs font-bold">
              {reply.author.substring(0, 2).toUpperCase()}
            </span>
          </Avatar>
          <div className="flex-1">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-foreground mb-2">{reply.content}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Anonymous • {formatTimeAgo(reply.createdAt)}</span>
                <button
                  onClick={() => handleLike(reply.id)}
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
                    disabled={!nestedReplyContent[reply.id]?.trim() || loading}
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

  const isLiked = discussion.likedBy.includes(
    localStorage.getItem("anonymous_user_id") || ""
  );

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
              {discussion.author.substring(0, 2).toUpperCase()}
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
                  <span>Anonymous • {formatTimeAgo(discussion.createdAt)}</span>
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
                onClick={() => handleLike()}
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
        <Button
          onClick={handleReply}
          disabled={!replyContent.trim() || loading}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Send className="w-4 h-4 mr-2" />
          {loading ? "Posting..." : "Post Reply"}
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
