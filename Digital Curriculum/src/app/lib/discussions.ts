/**
 * Discussions data structures and utilities
 */

export const DISCUSSION_CATEGORIES = [
  "Business Foundations",
  "Funding and Strategy",
  "Marketing and Customer Growth",
  "Operations and Team Building",
  "Location, Legal and Compliance",
  "Community and Collaboration",
] as const;

export type DiscussionCategory = typeof DISCUSSION_CATEGORIES[number];

export interface Discussion {
  id: string;
  title: string;
  category: DiscussionCategory;
  content: string;
  author: string; // Anonymous identifier
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  likedBy: string[]; // User IDs who liked
  replies: DiscussionReply[];
  views: number;
  isPinned?: boolean;
  isHot?: boolean;
}

export interface DiscussionReply {
  id: string;
  discussionId: string;
  content: string;
  author: string; // Anonymous identifier
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  likedBy: string[]; // User IDs who liked
  replies?: DiscussionReply[]; // Nested replies (replies to replies)
}

/**
 * Generate anonymous user identifier
 */
export function generateAnonymousId(): string {
  // Use a combination of timestamp and random number
  // In a real app, this would be tied to the user's session
  const stored = localStorage.getItem("anonymous_user_id");
  if (stored) {
    return stored;
  }
  const newId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem("anonymous_user_id", newId);
  return newId;
}

/**
 * Get anonymous user identifier
 */
export function getAnonymousId(): string {
  return generateAnonymousId();
}

/**
 * Get discussions from localStorage
 */
export function getDiscussions(): Discussion[] {
  try {
    const stored = localStorage.getItem("discussions");
    if (!stored) return [];
    const discussions = JSON.parse(stored);
    // Convert date strings back to Date objects
    return discussions.map((d: any) => ({
      ...d,
      createdAt: new Date(d.createdAt),
      updatedAt: new Date(d.updatedAt),
      replies: d.replies?.map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
        replies: r.replies?.map((rr: any) => ({
          ...rr,
          createdAt: new Date(rr.createdAt),
          updatedAt: new Date(rr.updatedAt),
        })),
      })),
    }));
  } catch (error) {
    console.error("Error loading discussions:", error);
    return [];
  }
}

/**
 * Get a single discussion by ID
 */
export function getDiscussion(id: string): Discussion | null {
  const discussions = getDiscussions();
  return discussions.find((d) => d.id === id) || null;
}

/**
 * Get reply count for a discussion
 */
export function getReplyCount(discussion: Discussion): number {
  const countReplies = (replies: DiscussionReply[]): number => {
    return replies.reduce((count, reply) => {
      return count + 1 + (reply.replies ? countReplies(reply.replies) : 0);
    }, 0);
  };
  return countReplies(discussion.replies || []);
}

/**
 * Save discussions to localStorage
 */
export function saveDiscussions(discussions: Discussion[]): void {
  try {
    localStorage.setItem("discussions", JSON.stringify(discussions));
  } catch (error) {
    console.error("Error saving discussions:", error);
  }
}

/**
 * Create a new discussion
 */
export function createDiscussion(
  title: string,
  category: DiscussionCategory,
  content: string
): Discussion {
  const discussion: Discussion = {
    id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    category,
    content,
    author: getAnonymousId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    likes: 0,
    likedBy: [],
    replies: [],
    views: 0,
    isPinned: false,
    isHot: false,
  };

  const discussions = getDiscussions();
  discussions.unshift(discussion); // Add to beginning
  saveDiscussions(discussions);

  return discussion;
}

/**
 * Add a reply to a discussion
 */
export function addReply(
  discussionId: string,
  content: string,
  parentReplyId?: string
): DiscussionReply {
  const reply: DiscussionReply = {
    id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    discussionId,
    content,
    author: getAnonymousId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    likes: 0,
    likedBy: [],
  };

  const discussions = getDiscussions();
  const discussion = discussions.find((d) => d.id === discussionId);
  if (!discussion) {
    throw new Error("Discussion not found");
  }

  if (parentReplyId) {
    // Add as nested reply
    const addNestedReply = (replies: DiscussionReply[]): boolean => {
      for (const r of replies) {
        if (r.id === parentReplyId) {
          if (!r.replies) r.replies = [];
          r.replies.push(reply);
          return true;
        }
        if (r.replies && addNestedReply(r.replies)) {
          return true;
        }
      }
      return false;
    };
    addNestedReply(discussion.replies);
  } else {
    // Add as top-level reply
    discussion.replies.push(reply);
  }

  discussion.updatedAt = new Date();
  saveDiscussions(discussions);

  return reply;
}

/**
 * Toggle like on a discussion or reply
 */
export function toggleLike(
  discussionId: string,
  replyId?: string
): { liked: boolean; likes: number } {
  const discussions = getDiscussions();
  const discussion = discussions.find((d) => d.id === discussionId);
  if (!discussion) {
    throw new Error("Discussion not found");
  }

  const userId = getAnonymousId();

  if (replyId) {
    // Like a reply
    const findAndToggleReply = (replies: DiscussionReply[]): boolean => {
      for (const reply of replies) {
        if (reply.id === replyId) {
          const index = reply.likedBy.indexOf(userId);
          if (index > -1) {
            reply.likedBy.splice(index, 1);
            reply.likes--;
          } else {
            reply.likedBy.push(userId);
            reply.likes++;
          }
          reply.updatedAt = new Date();
          return true;
        }
        if (reply.replies && findAndToggleReply(reply.replies)) {
          return true;
        }
      }
      return false;
    };
    findAndToggleReply(discussion.replies);
    saveDiscussions(discussions);
    const reply = discussion.replies.find((r) => r.id === replyId) ||
      discussion.replies.flatMap((r) => r.replies || []).find((r) => r.id === replyId);
    return {
      liked: reply?.likedBy.includes(userId) || false,
      likes: reply?.likes || 0,
    };
  } else {
    // Like the discussion
    const index = discussion.likedBy.indexOf(userId);
    if (index > -1) {
      discussion.likedBy.splice(index, 1);
      discussion.likes--;
    } else {
      discussion.likedBy.push(userId);
      discussion.likes++;
    }
    discussion.updatedAt = new Date();
    saveDiscussions(discussions);
    return {
      liked: discussion.likedBy.includes(userId),
      likes: discussion.likes,
    };
  }
}

/**
 * Increment view count
 */
export function incrementViews(discussionId: string): void {
  const discussions = getDiscussions();
  const discussion = discussions.find((d) => d.id === discussionId);
  if (discussion) {
    discussion.views++;
    saveDiscussions(discussions);
  }
}
