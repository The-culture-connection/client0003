import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  MessageSquare,
  Search,
  Pin,
  Flame,
  MessageCircle,
  Eye,
  ThumbsUp,
  Send,
  ArrowLeft,
} from "lucide-react";
import { Avatar } from "../components/ui/avatar";
import { StartDiscussionDialog } from "../components/discussions/StartDiscussionDialog";
import {
  getDiscussions,
  type Discussion,
  type DiscussionCategory,
  DISCUSSION_CATEGORIES,
  incrementViews,
  getReplyCount as getReplyCountUtil,
} from "../lib/discussions";

export function DiscussionsPage() {
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [filteredDiscussions, setFilteredDiscussions] = useState<Discussion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadDiscussions();
  }, []);

  useEffect(() => {
    filterDiscussions();
  }, [discussions, selectedCategory, searchQuery]);

  const loadDiscussions = () => {
    const allDiscussions = getDiscussions();
    // Sort by: pinned first, then by updatedAt (most recent first)
    const sorted = allDiscussions.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
    setDiscussions(sorted);
  };

  const filterDiscussions = () => {
    let filtered = [...discussions];

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((d) => d.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.content.toLowerCase().includes(query)
      );
    }

    setFilteredDiscussions(filtered);
  };

  const handleDiscussionClick = (discussion: Discussion) => {
    incrementViews(discussion.id);
    navigate(`/discussions/${discussion.id}`);
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

  const getReplyCount = (discussion: Discussion): number => {
    return getReplyCountUtil(discussion);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/community")}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Community Hub
          </Button>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Discussions
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask questions and share knowledge with the community
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Send className="w-4 h-4 mr-2" />
          Start Discussion
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {DISCUSSION_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Discussions List */}
      <div className="space-y-3">
        {filteredDiscussions.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No discussions found
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your filters"
                : "Be the first to start a discussion!"}
            </p>
            {!searchQuery && selectedCategory === "all" && (
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Start Discussion
              </Button>
            )}
          </Card>
        ) : (
          filteredDiscussions.map((discussion) => (
            <Card
              key={discussion.id}
              className="p-4 hover:border-accent transition-all cursor-pointer"
              onClick={() => handleDiscussionClick(discussion)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10 bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold">
                    {discussion.author.substring(0, 2).toUpperCase()}
                  </span>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        {discussion.isPinned && (
                          <Pin className="w-3 h-3 text-accent" />
                        )}
                        {discussion.isHot && (
                          <Flame className="w-3 h-3 text-orange-500" />
                        )}
                        <h3 className="text-base font-semibold text-foreground">
                          {discussion.title}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {discussion.content}
                      </p>
                    </div>
                    <Badge className="bg-accent/10 text-accent text-xs shrink-0">
                      {discussion.category}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Anonymous • {formatTimeAgo(discussion.createdAt)}</span>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      <span>{getReplyCount(discussion)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{discussion.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{discussion.likes}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <StartDiscussionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadDiscussions}
      />
    </div>
  );
}
