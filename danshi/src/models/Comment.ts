import type { User } from '@/src/models/User';

export type CommentSort = 'latest' | 'hot';

export type CommentAuthor = Pick<User, 'id' | 'name' | 'avatarUrl'> & {
  isFollowing?: boolean;
};

export interface MentionedUser {
  id: string;
  name: string;
}

export interface CommentBase {
  id: string;
  content: string;
  author: CommentAuthor;
  mentionedUsers?: MentionedUser[];
  likeCount: number;
  isLiked?: boolean;
  isAuthor?: boolean;
  parentId?: string | null;
  replyTo?: MentionedUser | null;
  createdAt: string; // ISO string
}

export type CommentReply = CommentBase;

export interface Comment extends CommentBase {
  replyCount: number;
  replies?: CommentReply[];
}

export type CommentEntity = Comment | CommentReply;

export interface CommentsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CommentsListResponse {
  comments: Comment[];
  pagination: CommentsPagination;
}

export interface CommentRepliesResponse {
  replies: CommentReply[];
  pagination: CommentsPagination;
}

export type CreateCommentInput = {
  content: string;
  parentId?: string | null;
  replyToUserId?: string | null;
  mentionedUserIds?: string[];
};
