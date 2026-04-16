/**
 * Shared types for curriculum discussion threads (Firestore-backed).
 */

export const DISCUSSION_CATEGORIES = [
  "Business Foundations",
  "Funding and Strategy",
  "Marketing and Customer Growth",
  "Operations and Team Building",
  "Location, Legal and Compliance",
  "Community and Collaboration",
] as const;

export type DiscussionCategory = (typeof DISCUSSION_CATEGORIES)[number];

export interface DiscussionReply {
  id: string;
  discussionId: string;
  content: string;
  author: string;
  authorName?: string;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  likedBy: string[];
  replies?: DiscussionReply[];
  /** Flat storage only; omitted after nesting */
  parent_reply_id?: string;
}

export interface Discussion {
  id: string;
  title: string;
  category: DiscussionCategory;
  content: string;
  author: string;
  authorName?: string;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  likedBy: string[];
  replies: DiscussionReply[];
  views: number;
  isPinned?: boolean;
  isHot?: boolean;
}
