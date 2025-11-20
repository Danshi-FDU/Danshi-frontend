import { http } from '@/src/lib/http/client';
import { httpAuth } from '@/src/lib/http/http_auth';
import { unwrapApiResponse, type ApiResponse } from '@/src/lib/http/response';
import type { User, Gender } from '@/src/models/User';
import { API_ENDPOINTS, USE_MOCK } from '@/src/constants/app';

const appendQueryParam = (qs: URLSearchParams, key: string, value: unknown) => {
  if (value == null) return;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return;
    qs.set(key, trimmed);
    return;
  }
  qs.set(key, String(value));
};

export type UserStats = {
  postCount: number;
  likeCount: number;
  favoriteCount: number;
  followerCount: number;
  followingCount: number;
};

export interface UserProfile extends User {
  bio?: string;
  stats: UserStats;
  isFollowing: boolean;
  createdAt: string; // ISO
}

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type UserPostListParams = {
  page?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'draft';
};

export type UserPostListItem = {
  id: string;
  title: string;
  category?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'draft';
  likeCount?: number;
  viewCount?: number;
  commentCount?: number;
  coverImage?: string | null;
  createdAt?: string;
};

export type UserPostListResponse = {
  posts: UserPostListItem[];
  pagination: Pagination;
};

export type UserFollowListParams = {
  page?: number;
  limit?: number;
};

export type UserFavoriteListParams = {
  page?: number;
  limit?: number;
};

export type UserFavoriteListResponse = {
  posts: UserPostListItem[];
  pagination: Pagination;
};

export type FollowUserItem = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string;
  stats?: Partial<UserStats>;
  isFollowing?: boolean;
};

export type UserFollowListResponse = {
  users: FollowUserItem[];
  pagination: Pagination;
};

export type FollowActionResponse = {
  isFollowing: boolean;
  followerCount: number;
};

export type UpdateUserInput = {
  name?: string;
  bio?: string;
  avatarUrl?: string | null;
  gender?: Gender;
  hometown?: string;
};

export interface UsersRepository {
  getUser(userId: string): Promise<UserProfile>;
  updateUser(userId: string, input: UpdateUserInput): Promise<{ user: UserProfile }>;
  listUserPosts(userId: string, params?: UserPostListParams): Promise<UserPostListResponse>;
  listUserFavorites(userId: string, params?: UserFavoriteListParams): Promise<UserFavoriteListResponse>;
  listUserFollowing(userId: string, params?: UserFollowListParams): Promise<UserFollowListResponse>;
  listUserFollowers(userId: string, params?: UserFollowListParams): Promise<UserFollowListResponse>;
  followUser(userId: string): Promise<FollowActionResponse>;
  unfollowUser(userId: string): Promise<FollowActionResponse>;
}

export class ApiUsersRepository implements UsersRepository {
  async getUser(userId: string): Promise<UserProfile> {
    const url = `${API_ENDPOINTS.USERS.ROOT}/${encodeURIComponent(userId)}`;
    const res = await http.get<ApiResponse<UserProfile>>(url);
    return unwrapApiResponse<UserProfile>(res);
  }
  async updateUser(userId: string, input: UpdateUserInput): Promise<{ user: UserProfile }> {
    const url = `${API_ENDPOINTS.USERS.ROOT}/${encodeURIComponent(userId)}`;
    const res = await httpAuth.put<ApiResponse<{ user: UserProfile }>>(url, input);
    return unwrapApiResponse<{ user: UserProfile }>(res);
  }

  async listUserPosts(userId: string, params: UserPostListParams = {}): Promise<UserPostListResponse> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      appendQueryParam(qs, key, value);
    }
    const path = API_ENDPOINTS.USERS.POSTS.replace(':userId', encodeURIComponent(userId));
    const url = qs.size ? `${path}?${qs.toString()}` : path;
    const res = await http.get<ApiResponse<UserPostListResponse>>(url);
    return unwrapApiResponse<UserPostListResponse>(res);
  }

  async listUserFavorites(userId: string, params: UserFavoriteListParams = {}): Promise<UserFavoriteListResponse> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      appendQueryParam(qs, key, value);
    }
    const path = API_ENDPOINTS.USERS.FAVORITES.replace(':userId', encodeURIComponent(userId));
    const url = qs.size ? `${path}?${qs.toString()}` : path;
    const res = await httpAuth.get<ApiResponse<UserFavoriteListResponse>>(url);
    return unwrapApiResponse<UserFavoriteListResponse>(res);
  }

  async listUserFollowing(userId: string, params: UserFollowListParams = {}): Promise<UserFollowListResponse> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      appendQueryParam(qs, key, value);
    }
    const path = API_ENDPOINTS.USERS.FOLLOWING.replace(':userId', encodeURIComponent(userId));
    const url = qs.size ? `${path}?${qs.toString()}` : path;
    const res = await http.get<ApiResponse<UserFollowListResponse>>(url);
    return unwrapApiResponse<UserFollowListResponse>(res);
  }

  async listUserFollowers(userId: string, params: UserFollowListParams = {}): Promise<UserFollowListResponse> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      appendQueryParam(qs, key, value);
    }
    const path = API_ENDPOINTS.USERS.FOLLOWERS.replace(':userId', encodeURIComponent(userId));
    const url = qs.size ? `${path}?${qs.toString()}` : path;
    const res = await http.get<ApiResponse<UserFollowListResponse>>(url);
    return unwrapApiResponse<UserFollowListResponse>(res);
  }

  async followUser(userId: string): Promise<FollowActionResponse> {
    const path = API_ENDPOINTS.USERS.FOLLOW.replace(':userId', encodeURIComponent(userId));
    const res = await httpAuth.post<ApiResponse<FollowActionResponse>>(path, {});
    return unwrapApiResponse<FollowActionResponse>(res);
  }

  async unfollowUser(userId: string): Promise<FollowActionResponse> {
    const path = API_ENDPOINTS.USERS.FOLLOW.replace(':userId', encodeURIComponent(userId));
    const res = await httpAuth.delete<ApiResponse<FollowActionResponse>>(path);
    return unwrapApiResponse<FollowActionResponse>(res);
  }
}

export class MockUsersRepository implements UsersRepository {
  private store: Record<string, UserProfile> = {
    '1234567890': {
      id: '1234567890',
      email: 'knd@example.com',
      name: 'knd',
      gender: 'male',
      hometown: 'Shanghai',
      role: 'user',
      avatarUrl: null,
      bio: '热爱美食的复旦学子',
      stats: { postCount: 15, likeCount: 128, favoriteCount: 45, followerCount: 230, followingCount: 85 },
      isFollowing: false,
      createdAt: '2024-01-01T00:00:00Z',
    },
  };
  private favoritesStore: Record<string, UserPostListItem[]> = {
    '1234567890': Array.from({ length: 5 }).map((_, idx) => ({
      id: `favorite-post-${idx + 1}`,
      title: `收藏帖子 ${idx + 1}`,
      category: idx % 2 === 0 ? 'food' : 'recipe',
      status: 'approved',
      likeCount: 35 + idx * 2,
      viewCount: 200 + idx * 20,
      commentCount: 5 + idx,
      coverImage: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=640&auto=format&fit=crop',
      createdAt: new Date(Date.now() - idx * 172800000).toISOString(),
    })),
  };
  private postsStore: Record<string, UserPostListItem[]> = {
    '1234567890': Array.from({ length: 8 }).map((_, idx) => ({
      id: `mock-post-${idx + 1}`,
      title: `南区食堂美食分享 ${idx + 1}`,
      category: idx % 2 === 0 ? 'food' : 'recipe',
      status: 'approved',
      likeCount: 20 + idx * 3,
      viewCount: 120 + idx * 15,
      commentCount: 4 + idx,
      coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&auto=format&fit=crop',
      createdAt: new Date(Date.now() - idx * 86400000).toISOString(),
    })),
  };
  private followingStore: Record<string, FollowUserItem[]> = {
    '1234567890': Array.from({ length: 5 }).map((_, idx) => ({
      id: `following-${idx + 1}`,
      name: `关注用户 ${idx + 1}`,
      avatarUrl: 'https://api.dicebear.com/7.x/identicon/png?seed=following',
      bio: idx % 2 === 0 ? '热爱校园美食' : undefined,
      stats: { postCount: 10 + idx, followerCount: 100 + idx * 5 },
      isFollowing: true,
    })),
  };
  private followersStore: Record<string, FollowUserItem[]> = {
    '1234567890': Array.from({ length: 6 }).map((_, idx) => ({
      id: `follower-${idx + 1}`,
      name: `粉丝 ${idx + 1}`,
      avatarUrl: 'https://api.dicebear.com/7.x/identicon/png?seed=follower',
      bio: idx % 2 === 1 ? '喜欢尝鲜' : undefined,
      stats: { postCount: 6 + idx, followerCount: 80 + idx * 3 },
      isFollowing: idx % 2 === 0,
    })),
  };

  // Generate a default avatar URL based on a seed string
  private computeAvatar(seed: string) {
    const s = seed?.trim() || 'guest';
    return `https://api.dicebear.com/7.x/identicon/png?seed=${encodeURIComponent(s)}`;
  }

  async getUser(userId: string): Promise<UserProfile> {
    await new Promise((r) => setTimeout(r, 200));
    const user = this.store[userId];
    if (!user) throw new Error('用户不存在');
    // ensure avatar
    const seed = user.email || user.name;
    const avatar = user.avatarUrl ?? this.computeAvatar(seed);
    const updated = { ...user, avatarUrl: avatar };
    this.store[userId] = updated;
    return updated;
  }

  async updateUser(userId: string, input: UpdateUserInput): Promise<{ user: UserProfile }> {
    await new Promise((r) => setTimeout(r, 300));
    const user = this.store[userId];
    if (!user) throw new Error('用户不存在');
    const next: UserProfile = {
      ...user,
      ...input,
      avatarUrl: input.avatarUrl === undefined ? user.avatarUrl : input.avatarUrl,
    };
    // ensure avatar if nullish
    const seed = next.email || next.name;
    next.avatarUrl = next.avatarUrl ?? this.computeAvatar(seed);
    this.store[userId] = next;
    return { user: next };
  }

  private paginate<T>(items: T[], params: { page?: number; limit?: number } = {}): { data: T[]; pagination: Pagination } {
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.max(1, Math.min(50, Math.floor(params.limit ?? 20)));
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = items.slice(start, start + limit);
    return {
      data,
      pagination: { page, limit, total, totalPages },
    };
  }

  async listUserPosts(userId: string, params: UserPostListParams = {}): Promise<UserPostListResponse> {
    await new Promise((r) => setTimeout(r, 200));
    const items = this.postsStore[userId] ?? [];
    const { data, pagination } = this.paginate(items, params);
    return { posts: data, pagination };
  }

  async listUserFavorites(userId: string, params: UserFavoriteListParams = {}): Promise<UserFavoriteListResponse> {
    await new Promise((r) => setTimeout(r, 200));
    const items = this.favoritesStore[userId] ?? [];
    const { data, pagination } = this.paginate(items, params);
    return { posts: data, pagination };
  }

  async listUserFollowing(userId: string, params: UserFollowListParams = {}): Promise<UserFollowListResponse> {
    await new Promise((r) => setTimeout(r, 200));
    const items = this.followingStore[userId] ?? [];
    const { data, pagination } = this.paginate(items, params);
    return { users: data, pagination };
  }

  async listUserFollowers(userId: string, params: UserFollowListParams = {}): Promise<UserFollowListResponse> {
    await new Promise((r) => setTimeout(r, 200));
    const items = this.followersStore[userId] ?? [];
    const { data, pagination } = this.paginate(items, params);
    return { users: data, pagination };
  }

  async followUser(userId: string): Promise<FollowActionResponse> {
    await new Promise((r) => setTimeout(r, 150));
    const profile = this.store[userId];
    if (!profile) throw new Error('用户不存在');
    if (!profile.isFollowing) {
      profile.isFollowing = true;
      profile.stats.followerCount += 1;
    }
    this.store[userId] = { ...profile };
    return { isFollowing: profile.isFollowing, followerCount: profile.stats.followerCount };
  }

  async unfollowUser(userId: string): Promise<FollowActionResponse> {
    await new Promise((r) => setTimeout(r, 150));
    const profile = this.store[userId];
    if (!profile) throw new Error('用户不存在');
    if (profile.isFollowing) {
      profile.isFollowing = false;
      profile.stats.followerCount = Math.max(0, profile.stats.followerCount - 1);
    }
    this.store[userId] = { ...profile };
    return { isFollowing: profile.isFollowing, followerCount: profile.stats.followerCount };
  }
}

export const usersRepository: UsersRepository = USE_MOCK ? new MockUsersRepository() : new ApiUsersRepository();
