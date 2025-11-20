import type { User } from '@/src/models/User';

export type PostType = 'share' | 'seeking';
export type ShareType = 'recommend' | 'warning';

export type Category = 'food' | 'recipe';

export type PostAuthor = Pick<User, 'id' | 'name' | 'avatarUrl'>;

export interface PostStats {
  likeCount?: number;
  favoriteCount?: number;
  commentCount?: number;
  viewCount?: number;
}

export interface PostBase {
  id: string;
  postType: PostType;
  title: string;
  content: string;
  category: Category;
  canteen?: string;
  tags?: string[];
  images?: string[];
  author?: PostAuthor;
  stats?: PostStats;
  isLiked?: boolean;
  isFavorited?: boolean;
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
}

export interface SharePost extends Omit<PostBase, 'images'> {
  postType: 'share';
  shareType: ShareType;
  cuisine?: string;
  flavors?: string[];
  price?: number;
  images: string[]; // 1-9
}

export interface SeekingPost extends PostBase {
  postType: 'seeking';
  budgetRange?: { min: number; max: number };
  preferences?: { avoidFlavors?: string[]; preferFlavors?: string[] };
}

export type Post = SharePost | SeekingPost;

// Create inputs mirror domain fields, without server-generated ones
export type CommonCreateBase = {
  postType: PostType;
  title: string;
  content: string;
  category: Category;
  canteen?: string;
  tags?: string[];
  images?: string[];
};

export type SharePostCreateInput = CommonCreateBase & {
  postType: 'share';
  shareType: ShareType;
  cuisine?: string;
  flavors?: string[];
  price?: number;
  images: string[]; // required for share
};

export type SeekingPostCreateInput = CommonCreateBase & {
  postType: 'seeking';
  budgetRange?: { min: number; max: number };
  preferences?: { avoidFlavors?: string[]; preferFlavors?: string[] };
};

export type PostCreateInput =
  | SharePostCreateInput
  | SeekingPostCreateInput;

export type PostCreateResult = {
  id: string;
  postType: PostType;
  status: 'pending' | 'approved' | 'rejected';
};
