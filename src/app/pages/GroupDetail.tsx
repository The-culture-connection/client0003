import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Users, Bell, Plus, MessageCircle, Share2, MoreHorizontal, Send, X, ChevronUp, ChevronDown, Minus, CornerDownRight } from 'lucide-react';
import { Button } from '../components/Button';
import { useState } from 'react';
import { BottomNav } from '../components/BottomNav';

interface Comment {
  id: number;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  upvotes: number;
  userVote: 'up' | 'down' | null;
  replies: Comment[];
  isCollapsed: boolean;
  replyingTo: number | null;
}

interface GroupPost {
  id: number;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  title?: string;
  content: string;
  timestamp: string;
  upvotes: number;
  comments: Comment[];
  userVote: 'up' | 'down' | null;
  isCollapsed: boolean;
}

export default function GroupDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isJoined, setIsJoined] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'members' | 'about'>('feed');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set([1, 2]));
  const [replyingTo, setReplyingTo] = useState<{ postId: number; commentId?: number } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');

  const [posts, setPosts] = useState<GroupPost[]>([
    {
      id: 1,
      author: {
        name: "Sarah Johnson",
        avatar: "SJ",
        role: "Alumni • Class of 2024",
      },
      title: "We just secured Series A funding! 🚀",
      content: "Excited to share that our startup just secured Series A funding! Thanks to everyone in this group for the support and advice throughout this journey. Happy to answer any questions about the process!",
      timestamp: "2h ago",
      upvotes: 342,
      userVote: null,
      isCollapsed: false,
      comments: [
        {
          id: 1,
          author: { name: "Michael Chen", avatar: "MC" },
          content: "Congratulations Sarah! Well deserved! How long did the fundraising process take?",
          timestamp: "1h ago",
          upvotes: 45,
          userVote: 'up',
          replies: [
            {
              id: 11,
              author: { name: "Sarah Johnson", avatar: "SJ" },
              content: "Thanks Michael! It took about 4 months from initial outreach to closing. Happy to share more details if you're interested.",
              timestamp: "1h ago",
              upvotes: 23,
              userVote: null,
              replies: [],
              isCollapsed: false,
              replyingTo: null,
            }
          ],
          isCollapsed: false,
          replyingTo: null,
        },
        {
          id: 2,
          author: { name: "Emily Rodriguez", avatar: "ER" },
          content: "This is amazing news! Let's celebrate soon! What was the biggest challenge during the fundraising?",
          timestamp: "1h ago",
          upvotes: 28,
          userVote: null,
          replies: [],
          isCollapsed: false,
          replyingTo: null,
        },
        {
          id: 3,
          author: { name: "David Park", avatar: "DP" },
          content: "Congrats! Any tips for someone just starting their fundraising journey?",
          timestamp: "45m ago",
          upvotes: 12,
          userVote: null,
          replies: [],
          isCollapsed: false,
          replyingTo: null,
        },
      ],
    },
    {
      id: 2,
      author: {
        name: "Alex Thompson",
        avatar: "AT",
        role: "Entrepreneur • Class of 2023",
      },
      title: "Looking for a technical co-founder",
      content: "Building a fintech startup focused on SMB payments. Looking for a technical co-founder with experience in payment systems and security. Anyone interested in discussing opportunities? DM me!",
      timestamp: "5h ago",
      upvotes: 156,
      userVote: 'up',
      isCollapsed: false,
      comments: [
        {
          id: 4,
          author: { name: "Jessica Lee", avatar: "JL" },
          content: "What tech stack are you planning to use?",
          timestamp: "4h ago",
          upvotes: 8,
          userVote: null,
          replies: [
            {
              id: 12,
              author: { name: "Alex Thompson", avatar: "AT" },
              content: "Planning to use Node.js/TypeScript on the backend with React for the frontend. Considering Stripe for payment processing.",
              timestamp: "4h ago",
              upvotes: 5,
              userVote: null,
              replies: [],
              isCollapsed: false,
              replyingTo: null,
            }
          ],
          isCollapsed: false,
          replyingTo: null,
        },
      ],
    },
  ]);

  const members = [
    { id: 1, name: "Sarah Johnson", role: "Alumni • Class of 2024", avatar: "SJ", isAdmin: true },
    { id: 2, name: "Michael Chen", role: "Entrepreneur • Class of 2023", avatar: "MC", isAdmin: false },
    { id: 3, name: "Emily Rodriguez", role: "Startup Founder • Class of 2022", avatar: "ER", isAdmin: false },
    { id: 4, name: "Alex Thompson", role: "Tech Lead • Class of 2023", avatar: "AT", isAdmin: false },
    { id: 5, name: "Jessica Lee", role: "Product Manager • Class of 2024", avatar: "JL", isAdmin: false },
    { id: 6, name: "David Park", role: "Designer • Class of 2023", avatar: "DP", isAdmin: false },
  ];

  const groupInfo = {
    name: "Tech Entrepreneurs",
    description: "A community for tech entrepreneurs to connect, collaborate, and share insights on building successful startups.",
    category: "Industry",
    created: "January 2024",
    privacy: "Public Group",
  };

  const handleVote = (postId: number, voteType: 'up' | 'down') => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const currentVote = post.userVote;
        let newUpvotes = post.upvotes;

        if (currentVote === voteType) {
          // Remove vote
          newUpvotes = voteType === 'up' ? newUpvotes - 1 : newUpvotes + 1;
          return { ...post, userVote: null, upvotes: newUpvotes };
        } else if (currentVote === null) {
          // Add vote
          newUpvotes = voteType === 'up' ? newUpvotes + 1 : newUpvotes - 1;
          return { ...post, userVote: voteType, upvotes: newUpvotes };
        } else {
          // Change vote
          newUpvotes = voteType === 'up' ? newUpvotes + 2 : newUpvotes - 2;
          return { ...post, userVote: voteType, upvotes: newUpvotes };
        }
      }
      return post;
    }));
  };

  const handleCommentVote = (postId: number, commentId: number, voteType: 'up' | 'down', parentCommentId?: number) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const updateComment = (comment: Comment): Comment => {
          if (comment.id === commentId) {
            const currentVote = comment.userVote;
            let newUpvotes = comment.upvotes;

            if (currentVote === voteType) {
              newUpvotes = voteType === 'up' ? newUpvotes - 1 : newUpvotes + 1;
              return { ...comment, userVote: null, upvotes: newUpvotes };
            } else if (currentVote === null) {
              newUpvotes = voteType === 'up' ? newUpvotes + 1 : newUpvotes - 1;
              return { ...comment, userVote: voteType, upvotes: newUpvotes };
            } else {
              newUpvotes = voteType === 'up' ? newUpvotes + 2 : newUpvotes - 2;
              return { ...comment, userVote: voteType, upvotes: newUpvotes };
            }
          }
          return {
            ...comment,
            replies: comment.replies.map(updateComment)
          };
        };

        return {
          ...post,
          comments: post.comments.map(updateComment)
        };
      }
      return post;
    }));
  };

  const handleCreatePost = () => {
    if (newPostContent.trim()) {
      const newPost: GroupPost = {
        id: posts.length + 1,
        author: {
          name: "You",
          avatar: "YO",
          role: "Alumni • Class of 2024",
        },
        title: newPostTitle.trim() || undefined,
        content: newPostContent,
        timestamp: "Just now",
        upvotes: 1,
        userVote: 'up',
        comments: [],
        isCollapsed: false,
      };
      setPosts([newPost, ...posts]);
      setNewPostTitle('');
      setNewPostContent('');
      setShowCreatePost(false);
      setExpandedPosts(new Set([...expandedPosts, newPost.id]));
    }
  };

  const handleAddReply = (postId: number, commentId?: number) => {
    if (replyContent.trim()) {
      setPosts(posts.map(post => {
        if (post.id === postId) {
          if (!commentId) {
            // Reply to post
            const newComment: Comment = {
              id: Math.max(0, ...post.comments.flatMap(c => [c.id, ...c.replies.map(r => r.id)])) + 1,
              author: { name: "You", avatar: "YO" },
              content: replyContent,
              timestamp: "Just now",
              upvotes: 1,
              userVote: 'up',
              replies: [],
              isCollapsed: false,
              replyingTo: null,
            };
            return {
              ...post,
              comments: [...post.comments, newComment]
            };
          } else {
            // Reply to comment
            const addReplyToComment = (comment: Comment): Comment => {
              if (comment.id === commentId) {
                const newReply: Comment = {
                  id: Math.max(0, ...post.comments.flatMap(c => [c.id, ...c.replies.map(r => r.id)])) + 1,
                  author: { name: "You", avatar: "YO" },
                  content: replyContent,
                  timestamp: "Just now",
                  upvotes: 1,
                  userVote: 'up',
                  replies: [],
                  isCollapsed: false,
                  replyingTo: commentId,
                };
                return {
                  ...comment,
                  replies: [...comment.replies, newReply]
                };
              }
              return {
                ...comment,
                replies: comment.replies.map(addReplyToComment)
              };
            };

            return {
              ...post,
              comments: post.comments.map(addReplyToComment)
            };
          }
        }
        return post;
      }));
      setReplyContent('');
      setReplyingTo(null);
    }
  };

  const togglePostExpanded = (postId: number) => {
    const newExpanded = new Set(expandedPosts);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedPosts(newExpanded);
  };

  const toggleCommentCollapse = (postId: number, commentId: number) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const toggleCollapse = (comment: Comment): Comment => {
          if (comment.id === commentId) {
            return { ...comment, isCollapsed: !comment.isCollapsed };
          }
          return {
            ...comment,
            replies: comment.replies.map(toggleCollapse)
          };
        };

        return {
          ...post,
          comments: post.comments.map(toggleCollapse)
        };
      }
      return post;
    }));
  };

  const renderComment = (comment: Comment, postId: number, depth: number = 0) => {
    const isExpanded = !comment.isCollapsed;

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-4 border-l-2 border-border pl-3' : ''}`}>
        <div className="flex gap-2 py-2">
          {/* Vote Column */}
          <div className="flex flex-col items-center gap-0.5 pt-1">
            <button
              onClick={() => handleCommentVote(postId, comment.id, 'up')}
              className={`transition-colors ${
                comment.userVote === 'up' ? 'text-accent' : 'text-muted-foreground hover:text-accent'
              }`}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <span className={`text-xs font-medium ${
              comment.userVote === 'up' ? 'text-accent' : comment.userVote === 'down' ? 'text-destructive' : 'text-foreground'
            }`}>
              {comment.upvotes}
            </span>
            <button
              onClick={() => handleCommentVote(postId, comment.id, 'down')}
              className={`transition-colors ${
                comment.userVote === 'down' ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-medium">
                {comment.author.avatar}
              </div>
              <span className="text-xs text-foreground font-medium">{comment.author.name}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
              {comment.replies.length > 0 && (
                <>
                  <button
                    onClick={() => toggleCommentCollapse(postId, comment.id)}
                    className="text-muted-foreground hover:text-foreground ml-auto"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>

            {isExpanded && (
              <>
                <p className="text-sm text-foreground mb-2 leading-relaxed">{comment.content}</p>
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => setReplyingTo({ postId, commentId: comment.id })}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <CornerDownRight className="w-3 h-3" />
                    Reply
                  </button>
                  <button className="text-xs text-muted-foreground hover:text-foreground">
                    Share
                  </button>
                </div>

                {/* Reply Input */}
                {replyingTo?.postId === postId && replyingTo?.commentId === comment.id && (
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddReply(postId, comment.id)}
                      className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground"
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddReply(postId, comment.id)}
                      disabled={!replyContent.trim()}
                      className="px-3 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Nested Replies */}
                {comment.replies.length > 0 && (
                  <div className="mt-2">
                    {comment.replies.map(reply => renderComment(reply, postId, depth + 1))}
                  </div>
                )}
              </>
            )}

            {!isExpanded && comment.replies.length > 0 && (
              <button
                onClick={() => toggleCommentCollapse(postId, comment.id)}
                className="text-xs text-accent hover:underline"
              >
                [{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'} hidden]
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-20 border-b border-border px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl text-foreground">{groupInfo.name}</h1>
              <p className="text-xs text-muted-foreground">{members.length} members</p>
            </div>
            {isJoined && (
              <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'feed'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'members'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'about'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              About
            </button>
          </div>
        </div>

        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <div>
            {/* Sort Options */}
            {isJoined && (
              <div className="flex gap-2 px-4 py-3 border-b border-border">
                <button
                  onClick={() => setSortBy('hot')}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    sortBy === 'hot'
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Hot
                </button>
                <button
                  onClick={() => setSortBy('new')}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    sortBy === 'new'
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  New
                </button>
                <button
                  onClick={() => setSortBy('top')}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    sortBy === 'top'
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Top
                </button>
              </div>
            )}

            <div className="space-y-2">
              {!isJoined && (
                <div className="p-4 bg-card border-b border-border text-center">
                  <h3 className="text-foreground font-medium mb-2">Join this group</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Join to see posts and participate in discussions
                  </p>
                  <Button onClick={() => setIsJoined(true)} variant="primary" className="w-full">
                    Join Group
                  </Button>
                </div>
              )}

              {posts.map((post) => {
                const isExpanded = expandedPosts.has(post.id);

                return (
                  <div key={post.id} className="bg-card border-b border-border hover:border-accent/30 transition-colors">
                    <div className="flex gap-2 p-3">
                      {/* Vote Column */}
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <button
                          onClick={() => handleVote(post.id, 'up')}
                          className={`transition-colors ${
                            post.userVote === 'up' ? 'text-accent' : 'text-muted-foreground hover:text-accent'
                          }`}
                        >
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <span className={`text-sm font-bold ${
                          post.userVote === 'up' ? 'text-accent' : post.userVote === 'down' ? 'text-destructive' : 'text-foreground'
                        }`}>
                          {post.upvotes}
                        </span>
                        <button
                          onClick={() => handleVote(post.id, 'down')}
                          className={`transition-colors ${
                            post.userVote === 'down' ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'
                          }`}
                        >
                          <ChevronDown className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Post Content */}
                      <div className="flex-1 min-w-0">
                        {/* Post Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-medium">
                            {post.author.avatar}
                          </div>
                          <span className="text-xs text-foreground font-medium">{post.author.name}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{post.timestamp}</span>
                          <button className="ml-auto text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Post Title */}
                        {post.title && (
                          <h3 className="text-foreground font-medium mb-1 cursor-pointer hover:text-accent" onClick={() => togglePostExpanded(post.id)}>
                            {post.title}
                          </h3>
                        )}

                        {/* Post Body */}
                        <div className={`text-sm text-foreground mb-2 leading-relaxed ${!isExpanded && post.content.length > 150 ? 'line-clamp-3' : ''}`}>
                          {post.content}
                        </div>

                        {/* Expand/Collapse */}
                        {post.content.length > 150 && !isExpanded && (
                          <button
                            onClick={() => togglePostExpanded(post.id)}
                            className="text-xs text-accent hover:underline mb-2"
                          >
                            Read more
                          </button>
                        )}

                        {/* Post Actions */}
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <button
                            onClick={() => togglePostExpanded(post.id)}
                            className="flex items-center gap-1 hover:text-accent transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-xs">{post.comments.length} {post.comments.length === 1 ? 'comment' : 'comments'}</span>
                          </button>
                          <button className="flex items-center gap-1 hover:text-accent transition-colors">
                            <Share2 className="w-4 h-4" />
                            <span className="text-xs">Share</span>
                          </button>
                        </div>

                        {/* Comments Thread */}
                        {isExpanded && (
                          <div className="mt-4 pt-3 border-t border-border">
                            {/* Add Top-Level Comment */}
                            {replyingTo?.postId === post.id && !replyingTo?.commentId && (
                              <div className="flex gap-2 mb-4">
                                <input
                                  type="text"
                                  placeholder="Write a comment..."
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddReply(post.id)}
                                  className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleAddReply(post.id)}
                                  disabled={!replyContent.trim()}
                                  className="px-3 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            {!replyingTo || replyingTo.postId !== post.id || replyingTo.commentId !== undefined ? (
                              <button
                                onClick={() => setReplyingTo({ postId: post.id })}
                                className="text-xs text-muted-foreground hover:text-accent mb-3 flex items-center gap-1"
                              >
                                <MessageCircle className="w-3 h-3" />
                                Add a comment
                              </button>
                            ) : null}

                            {/* Render Comments */}
                            {post.comments.length > 0 ? (
                              <div className="space-y-1">
                                {post.comments.map(comment => renderComment(comment, post.id))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic py-2">No comments yet. Be the first to comment!</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-foreground font-medium">All Members ({members.length})</h3>
            </div>
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-medium">
                  {member.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-foreground font-medium text-sm">{member.name}</h3>
                    {member.isAdmin && (
                      <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
                <button className="px-3 py-1.5 bg-accent text-accent-foreground text-xs rounded-lg hover:bg-accent/90 transition-colors">
                  Message
                </button>
              </div>
            ))}
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="p-4 space-y-4">
            <div className="p-4 bg-card border border-border rounded-xl">
              <h3 className="text-foreground font-medium mb-3">About</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {groupInfo.description}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="text-foreground">{groupInfo.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">{groupInfo.created}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Privacy</span>
                  <span className="text-foreground">{groupInfo.privacy}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-card border border-border rounded-xl">
              <h3 className="text-foreground font-medium mb-3">Group Rules</h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Be respectful and professional</li>
                <li>No spam or self-promotion without permission</li>
                <li>Keep discussions relevant to tech entrepreneurship</li>
                <li>Share knowledge and support fellow members</li>
              </ol>
            </div>

            {isJoined && (
              <button className="w-full py-3 border border-border text-foreground rounded-xl hover:bg-secondary transition-colors">
                Leave Group
              </button>
            )}
          </div>
        )}

        {/* Floating Action Button - Create Post */}
        {isJoined && activeTab === 'feed' && (
          <button
            onClick={() => setShowCreatePost(true)}
            className="fixed bottom-24 right-6 w-14 h-14 bg-accent text-accent-foreground rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center z-40"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {/* Create Post Modal */}
        {showCreatePost && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="w-full max-w-md mx-auto bg-background rounded-t-3xl p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl text-foreground">Create Post</h2>
                <button
                  onClick={() => setShowCreatePost(false)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-medium">
                  YO
                </div>
                <div>
                  <h3 className="text-foreground font-medium text-sm">You</h3>
                  <p className="text-xs text-muted-foreground">Posting to {groupInfo.name}</p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Title (optional)"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground"
                />

                <textarea
                  placeholder="What do you want to share?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground resize-none"
                  rows={6}
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowCreatePost(false)}
                  className="flex-1 px-4 py-3 border border-border text-foreground rounded-xl hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim()}
                  className="flex-1 px-4 py-3 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
