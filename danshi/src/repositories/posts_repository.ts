import { USE_MOCK, API_ENDPOINTS } from '@/src/constants/app';
import { unwrapApiResponse } from '@/src/lib/http/response';
import { http } from '@/src/lib/http/client';
import { httpAuth } from '@/src/lib/http/http_auth';
import type {
  Post,
  PostCreateInput,
  PostCreateResult,
  CompanionPost,
  ShareType,
  PostType,
} from '@/src/models/Post';

export interface PostsRepository {
  create(input: PostCreateInput): Promise<PostCreateResult>;
  list(filters?: PostListFilters): Promise<PostsListResponse>;
  get(postId: string): Promise<Post>;
  update(postId: string, input: PostCreateInput): Promise<{ id: string; status: 'pending' | 'approved' | 'rejected' }>;
  delete(postId: string): Promise<void>;
  like(postId: string): Promise<{ isLiked: boolean; likeCount: number }>;
  unlike(postId: string): Promise<{ isLiked: boolean; likeCount: number }>;
  favorite(postId: string): Promise<{ isFavorited: boolean; favoriteCount: number }>;
  unfavorite(postId: string): Promise<{ isFavorited: boolean; favoriteCount: number }>;
  updateCompanionStatus(postId: string, payload: { status: 'open' | 'full' | 'closed'; currentPeople?: number }): Promise<{ meetingInfo: Required<CompanionPost>['meetingInfo'] }>;
}

export type SortBy = 'latest' | 'hot' | 'trending' | 'price';
export type Category = 'food' | 'recipe';

export type PostListFilters = {
  postType?: PostType;
  shareType?: ShareType;
  category?: Category;
  canteen?: string;
  cuisine?: string;
  flavors?: string[]; // 多选
  tags?: string[]; // 多选
  minPrice?: number;
  maxPrice?: number;
  sortBy?: SortBy;
  page?: number;
  limit?: number;
};

export type PostsListResponse = {
  posts: Post[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

class ApiPostsRepository implements PostsRepository {
  async create(input: PostCreateInput): Promise<PostCreateResult> {
    const resp = await httpAuth.post(API_ENDPOINTS.POSTS.CREATEPOST, input);
    return unwrapApiResponse<PostCreateResult>(resp, 200);
  }

  async list(filters: PostListFilters = {}): Promise<PostsListResponse> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v == null) continue;
      if (Array.isArray(v)) {
        if (v.length) qs.set(k, v.join(','));
      } else {
        qs.set(k, String(v));
      }
    }
    const path = `${API_ENDPOINTS.POSTS.GETPOSTPRE}${qs.toString() ? `?${qs.toString()}` : ''}`;
    const resp = await http.get(path);
    return unwrapApiResponse<PostsListResponse>(resp, 200);
  }

  async get(postId: string): Promise<Post> {
    const path = API_ENDPOINTS.POSTS.GETPOSTALL.replace(':postId', encodeURIComponent(postId));
    const resp = await http.get(path);
    return unwrapApiResponse<Post>(resp, 200);
  }

  async update(postId: string, input: PostCreateInput): Promise<{ id: string; status: 'pending' | 'approved' | 'rejected' }> {
    const path = API_ENDPOINTS.POSTS.UPDATEPOST.replace(':postId', encodeURIComponent(postId));
    const resp = await httpAuth.put(path, input);
    return unwrapApiResponse<{ id: string; status: 'pending' | 'approved' | 'rejected' }>(resp, 200);
  }

  async delete(postId: string): Promise<void> {
    const path = API_ENDPOINTS.POSTS.DELETEPOST.replace(':postId', encodeURIComponent(postId));
    const resp = await httpAuth.delete(path);
    unwrapApiResponse<null>(resp, 200);
  }

  async like(postId: string): Promise<{ isLiked: boolean; likeCount: number }> {
    const path = API_ENDPOINTS.POSTS.LIKEPOST.replace(':postId', encodeURIComponent(postId));
    const resp = await httpAuth.post(path, {});
    return unwrapApiResponse<{ isLiked: boolean; likeCount: number }>(resp, 200);
  }

  async unlike(postId: string): Promise<{ isLiked: boolean; likeCount: number }> {
    const path = API_ENDPOINTS.POSTS.UNLIKEPOST.replace(':postId', encodeURIComponent(postId));
    const resp = await httpAuth.delete(path);
    return unwrapApiResponse<{ isLiked: boolean; likeCount: number }>(resp, 200);
  }

  async favorite(postId: string): Promise<{ isFavorited: boolean; favoriteCount: number }> {
    const path = API_ENDPOINTS.POSTS.FAVORITEPOST.replace(':postId', encodeURIComponent(postId));
    const resp = await httpAuth.post(path, {});
    return unwrapApiResponse<{ isFavorited: boolean; favoriteCount: number }>(resp, 200);
  }

  async unfavorite(postId: string): Promise<{ isFavorited: boolean; favoriteCount: number }> {
    const path = API_ENDPOINTS.POSTS.UNFAVORITEPOST.replace(':postId', encodeURIComponent(postId));
    const resp = await httpAuth.delete(path);
    return unwrapApiResponse<{ isFavorited: boolean; favoriteCount: number }>(resp, 200);
  }

  async updateCompanionStatus(postId: string, payload: { status: 'open' | 'full' | 'closed'; currentPeople?: number }): Promise<{ meetingInfo: Required<CompanionPost>['meetingInfo'] }> {
    const path = API_ENDPOINTS.POSTS.CHANGEPOSTSTATUS.replace(':postId', encodeURIComponent(postId));
    const resp = await httpAuth.put(path, payload);
    return unwrapApiResponse<{ meetingInfo: Required<CompanionPost>['meetingInfo'] }>(resp, 200);
  }
}

class MockPostsRepository implements PostsRepository {
  private store: Post[] = [];

  async create(input: PostCreateInput): Promise<PostCreateResult> {
    // 仅返回最小结果，模拟“创建成功，待审核”
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    // 构造最简 Post 入库，便于随后的列表/详情模拟
    const base: any = {
      id,
      postType: input.postType,
      title: input.title,
      content: input.content,
      category: input.category,
      canteen: input.canteen,
      tags: input.tags,
      images: input.images,
      createdAt: now,
      updatedAt: now,
      stats: { likeCount: 0, favoriteCount: 0, commentCount: 0, viewCount: 0 },
      isLiked: false,
      isFavorited: false,
    };
    if (input.postType === 'share') {
      base.shareType = (input as any).shareType;
      base.cuisine = (input as any).cuisine;
      base.flavors = (input as any).flavors;
      base.price = (input as any).price;
    } else if (input.postType === 'seeking') {
      base.budgetRange = (input as any).budgetRange;
      base.preferences = (input as any).preferences;
    } else if (input.postType === 'companion') {
      base.meetingInfo = (input as any).meetingInfo ?? { status: 'open' };
      base.contact = (input as any).contact;
    }
    this.store.unshift(base as Post);
    return { id, postType: input.postType, status: 'pending' };
  }

  async list(filters: PostListFilters = {}): Promise<PostsListResponse> {
    const page = Math.max(1, Math.floor(filters.page ?? 1));
    const limit = Math.min(50, Math.max(1, Math.floor(filters.limit ?? 20)));
    let arr = [...this.store];
    if (filters.postType) arr = arr.filter((p) => p.postType === filters.postType);
    if (filters.shareType) arr = arr.filter((p: any) => p.postType === 'share' && p.shareType === filters.shareType);
    const total = arr.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const posts = arr.slice(start, start + limit);
    return { posts, pagination: { page, limit, total, totalPages } };
  }

  async get(postId: string): Promise<Post> {
    const found = this.store.find((p) => p.id === postId);
    if (!found) throw new Error('未找到帖子');
    // 模拟浏览量 +1
    (found.stats ||= {}).viewCount = (found.stats?.viewCount ?? 0) + 1;
    return { ...found };
  }

  async update(postId: string, input: PostCreateInput): Promise<{ id: string; status: 'pending' | 'approved' | 'rejected' }> {
    const idx = this.store.findIndex((p) => p.id === postId);
    if (idx < 0) throw new Error('未找到帖子');
    const now = new Date().toISOString();
    const old = this.store[idx] as any;
    const merged: any = {
      ...old,
      postType: input.postType,
      title: input.title,
      content: input.content,
      category: input.category,
      canteen: input.canteen,
      tags: input.tags,
      images: input.images,
      updatedAt: now,
    };
    if (input.postType === 'share') {
      merged.shareType = (input as any).shareType;
      merged.cuisine = (input as any).cuisine;
      merged.flavors = (input as any).flavors;
      merged.price = (input as any).price;
    } else if (input.postType === 'seeking') {
      merged.budgetRange = (input as any).budgetRange;
      merged.preferences = (input as any).preferences;
    } else if (input.postType === 'companion') {
      merged.meetingInfo = (input as any).meetingInfo ?? merged.meetingInfo;
      merged.contact = (input as any).contact;
    }
    this.store[idx] = merged as Post;
    return { id: postId, status: 'pending' };
  }

  async delete(postId: string): Promise<void> {
    this.store = this.store.filter((p) => p.id !== postId);
  }

  async like(postId: string): Promise<{ isLiked: boolean; likeCount: number }> {
    const p = this.store.find((x) => x.id === postId) as any;
    if (!p) throw new Error('未找到帖子');
    if (!p.isLiked) {
      p.isLiked = true;
      p.stats.likeCount = (p.stats?.likeCount ?? 0) + 1;
    }
    return { isLiked: true, likeCount: p.stats.likeCount ?? 0 };
  }

  async unlike(postId: string): Promise<{ isLiked: boolean; likeCount: number }> {
    const p = this.store.find((x) => x.id === postId) as any;
    if (!p) throw new Error('未找到帖子');
    if (p.isLiked) {
      p.isLiked = false;
      p.stats.likeCount = Math.max(0, (p.stats?.likeCount ?? 0) - 1);
    }
    return { isLiked: false, likeCount: p.stats.likeCount ?? 0 };
  }

  async favorite(postId: string): Promise<{ isFavorited: boolean; favoriteCount: number }> {
    const p = this.store.find((x) => x.id === postId) as any;
    if (!p) throw new Error('未找到帖子');
    if (!p.isFavorited) {
      p.isFavorited = true;
      p.stats.favoriteCount = (p.stats?.favoriteCount ?? 0) + 1;
    }
    return { isFavorited: true, favoriteCount: p.stats.favoriteCount ?? 0 };
  }

  async unfavorite(postId: string): Promise<{ isFavorited: boolean; favoriteCount: number }> {
    const p = this.store.find((x) => x.id === postId) as any;
    if (!p) throw new Error('未找到帖子');
    if (p.isFavorited) {
      p.isFavorited = false;
      p.stats.favoriteCount = Math.max(0, (p.stats?.favoriteCount ?? 0) - 1);
    }
    return { isFavorited: false, favoriteCount: p.stats.favoriteCount ?? 0 };
  }

  async updateCompanionStatus(postId: string, payload: { status: 'open' | 'full' | 'closed'; currentPeople?: number }): Promise<{ meetingInfo: Required<CompanionPost>['meetingInfo'] }> {
    const p = this.store.find((x) => x.id === postId) as any;
    if (!p) throw new Error('未找到帖子');
    if (p.postType !== 'companion') throw new Error('非搭子帖子不能更新状态');
    p.meetingInfo = {
      ...(p.meetingInfo ?? {}),
      status: payload.status,
      currentPeople: payload.currentPeople ?? p.meetingInfo?.currentPeople,
    };
    return { meetingInfo: p.meetingInfo };
  }
}

export const postsRepository: PostsRepository = USE_MOCK
  ? new MockPostsRepository()
  : new ApiPostsRepository();
