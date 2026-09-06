import { API_ENDPOINTS } from '@/src/constants/app';
import type { components } from '@/src/generated/openapi';
import { httpAuth } from '@/src/lib/http/http_auth';
import { unwrapApiResponse, type ApiResponse } from '@/src/lib/http/response';
import type { Post } from '@/src/models/Post';
import {
  requireNumber,
  toNullableNickname,
  toPagination,
  toPost,
} from '@/src/repositories/api_mappers';

export type SearchPostsParams = {
  q: string;
  category?: string;
  canteen?: string;
  tags?: string[];
  page?: number;
  limit?: number;
};
export type SearchUsersParams = { q: string; page?: number; limit?: number };
export type SearchPost = Post;
export type SearchPostsResponse = {
  posts: SearchPost[];
  pagination: ReturnType<typeof toPagination>;
};
export type SearchUser = {
  id: number;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  stats: { post_count: number; follower_count: number };
  is_following: boolean;
};
export type SearchUsersResponse = {
  users: SearchUser[];
  pagination: ReturnType<typeof toPagination>;
};

const toSearchPost = (post: components['schemas']['SearchPostItem']): SearchPost => toPost(post);

const toSearchUser = (user: components['schemas']['SearchUserItem']): SearchUser => ({
  id: requireNumber(user.id, '用户 ID'),
  name: toNullableNickname(user.name),
  avatar_url: user.avatar_url ?? null,
  bio: user.bio ?? null,
  stats: {
    post_count: user.stats?.post_count ?? 0,
    follower_count: user.stats?.follower_count ?? 0,
  },
  is_following: user.is_following ?? false,
});

const toQuery = (params: SearchPostsParams | SearchUsersParams) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (value.length) query.set(key, value.join(','));
      return;
    }
    query.set(key, String(value));
  });
  return query.toString();
};

export const searchRepository = {
  async searchPosts(params: SearchPostsParams): Promise<SearchPostsResponse> {
    const query = toQuery(params);
    const response = await httpAuth.get<ApiResponse<components['schemas']['SearchPostList']>>(
      `${API_ENDPOINTS.SEARCH.POSTS}${query ? `?${query}` : ''}`,
    );
    const payload = unwrapApiResponse(response);
    return {
      posts: (payload.posts ?? []).map(toSearchPost),
      pagination: toPagination(payload.pagination),
    };
  },

  async searchUsers(params: SearchUsersParams): Promise<SearchUsersResponse> {
    const query = toQuery(params);
    const response = await httpAuth.get<ApiResponse<components['schemas']['SearchUserList']>>(
      `${API_ENDPOINTS.SEARCH.USERS}${query ? `?${query}` : ''}`,
    );
    const payload = unwrapApiResponse(response);
    return {
      users: (payload.users ?? []).map(toSearchUser),
      pagination: toPagination(payload.pagination),
    };
  },
};
