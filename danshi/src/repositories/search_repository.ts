import { API_ENDPOINTS, USE_MOCK } from '@/src/constants/app';
import { http } from '@/src/lib/http/client';
import { unwrapApiResponse, type ApiResponse } from '@/src/lib/http/response';
import type { Post } from '@/src/models/Post';
import type { User } from '@/src/models/User';
import { postsRepository } from '@/src/repositories/posts_repository';

export type SearchPostsParams = {
  q: string;
  category?: string;
  canteen?: string;
  tags?: string[];
  page?: number;
  limit?: number;
};

export type SearchUsersParams = {
  q: string;
  page?: number;
  limit?: number;
};

export type SearchHighlight = {
  title?: string;
  content?: string;
};

export type SearchPost = Post & {
  highlight?: SearchHighlight;
};

export type SearchPostsResponse = {
  posts: SearchPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type SearchUser = User & {
  bio?: string;
  stats?: {
    postCount?: number;
    followerCount?: number;
    likeCount?: number;
    favoriteCount?: number;
  };
  isFollowing?: boolean;
};

export type SearchUsersResponse = {
  users: SearchUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export interface SearchRepository {
  searchPosts(params: SearchPostsParams): Promise<SearchPostsResponse>;
  searchUsers(params: SearchUsersParams): Promise<SearchUsersResponse>;
}

class ApiSearchRepository implements SearchRepository {
  async searchPosts(params: SearchPostsParams): Promise<SearchPostsResponse> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value == null || value === '') return;
      if (Array.isArray(value)) {
        if (!value.length) return;
        qs.set(key, value.join(','));
      } else {
        qs.set(key, String(value));
      }
    });
    const url = `${API_ENDPOINTS.SEARCH.POSTS}${qs.toString() ? `?${qs.toString()}` : ''}`;
    const res = await http.get<ApiResponse<SearchPostsResponse>>(url);
    return unwrapApiResponse<SearchPostsResponse>(res, 200);
  }

  async searchUsers(params: SearchUsersParams): Promise<SearchUsersResponse> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value == null || value === '') return;
      qs.set(key, String(value));
    });
    const url = `${API_ENDPOINTS.SEARCH.USERS}${qs.toString() ? `?${qs.toString()}` : ''}`;
    const res = await http.get<ApiResponse<SearchUsersResponse>>(url);
    return unwrapApiResponse<SearchUsersResponse>(res, 200);
  }
}

function buildHighlight(text: string, query: string): string {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<em>$1</em>');
}

class MockSearchRepository implements SearchRepository {
  async searchPosts(params: SearchPostsParams): Promise<SearchPostsResponse> {
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.min(50, Math.max(1, Math.floor(params.limit ?? 20)));
    const keyword = params.q.toLowerCase();
    const list = await postsRepository.list({ limit: 100 });
    const filtered = list.posts.filter((post) => {
      const haystack = `${post.title ?? ''} ${post.content ?? ''}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
      if (params.category && post.category !== params.category) return false;
      if (params.canteen && post.canteen !== params.canteen) return false;
      if (params.tags && params.tags.length) {
        const tags = (post.tags ?? []).map((item) => item.toLowerCase());
        const target = params.tags.map((item) => item.toLowerCase());
        if (!target.every((tag) => tags.includes(tag))) return false;
      }
      return true;
    });
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit).map((post) => ({
      ...post,
      highlight: {
        title: buildHighlight(post.title ?? '', params.q),
        content: buildHighlight(post.content ?? '', params.q),
      },
    }));
    return {
      posts: items,
      pagination: { page, limit, total, totalPages },
    };
  }

  async searchUsers(params: SearchUsersParams): Promise<SearchUsersResponse> {
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.min(50, Math.max(1, Math.floor(params.limit ?? 20)));
    const keyword = params.q.toLowerCase();
    const mockUsers: SearchUser[] = [
      {
        id: 'mock-user-01',
        email: 'mock1@example.com',
        name: '张三',
        role: 'user',
        avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&crop=faces',
        bio: '热爱美食的复旦学子',
        stats: { postCount: 12, followerCount: 320, likeCount: 540, favoriteCount: 210 },
        isFollowing: false,
      },
      {
        id: 'mock-user-02',
        email: 'mock2@example.com',
        name: '李四',
        role: 'user',
        avatarUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=120&h=120&crop=faces',
        bio: '记录校园美食日常',
        stats: { postCount: 45, followerCount: 1280, likeCount: 1520, favoriteCount: 890 },
        isFollowing: true,
      },
      {
        id: 'mock-user-03',
        email: 'mock3@example.com',
        name: '王五',
        role: 'user',
        avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&h=120&crop=faces',
        bio: '喜欢探索隐藏的好味道',
        stats: { postCount: 28, followerCount: 610, likeCount: 870, favoriteCount: 450 },
        isFollowing: false,
      },
    ];
    const filtered = mockUsers.filter((user) => user.name.toLowerCase().includes(keyword));
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);
    return {
      users: items,
      pagination: { page, limit, total, totalPages },
    };
  }
}

export const searchRepository: SearchRepository = USE_MOCK
  ? new MockSearchRepository()
  : new ApiSearchRepository();
