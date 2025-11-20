import { httpAuth } from '@/src/lib/http/http_auth';
import { unwrapApiResponse, type ApiResponse } from '@/src/lib/http/response';
import { API_ENDPOINTS, ROLES, USE_MOCK } from '@/src/constants/app';
import type { PostType, Category } from '@/src/models/Post';
import type { Role } from '@/src/constants/app';

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminPostListParams = {
  page?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'draft';
  postType?: PostType;
};

export type AdminPendingPostSummary = {
  id: string;
  title: string;
  content: string;
  category: Category;
  postType?: PostType;
  images?: string[];
  author: {
    id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

export type AdminPendingPostsResponse = {
  posts: AdminPendingPostSummary[];
  pagination: Pagination;
};

export type AdminPostsResponse = AdminPendingPostsResponse;

export type AdminPostReviewInput = {
  status: 'approved' | 'rejected';
  feedback?: string;
};

export type AdminPostReviewResult = {
  postId: string;
  status: 'approved' | 'rejected';
  reviewedAt: string;
};

export type AdminUserListParams = {
  page?: number;
  limit?: number;
  role?: Role;
  isActive?: boolean;
};

export type AdminUserSummary = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  stats?: {
    postCount?: number;
    followerCount?: number;
  };
  createdAt: string;
};

export type AdminUsersResponse = {
  users: AdminUserSummary[];
  pagination: Pagination;
};

export type AdminUserRoleInput = {
  role: Role;
};

export type AdminUserRoleResult = {
  userId: string;
  role: Role;
};

export type AdminUserStatusInput = {
  isActive: boolean;
  reason?: string;
};

export type AdminUserStatusResult = {
  userId: string;
  isActive: boolean;
};

const mapQueryKey = (key: string): string => {
  switch (key) {
    case 'postType':
      return 'post_type';
    case 'postId':
      return 'post_id';
    case 'isActive':
      return 'is_active';
    default:
      return key;
  }
};

const appendQueryParam = (qs: URLSearchParams, key: string, value: unknown) => {
  if (value == null) return;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return;
    qs.set(mapQueryKey(key), trimmed);
    return;
  }
  qs.set(mapQueryKey(key), String(value));
};

export interface AdminRepository {
  listPendingPosts(params?: AdminPostListParams): Promise<AdminPendingPostsResponse>;
  listPosts(params?: AdminPostListParams): Promise<AdminPostsResponse>;
  reviewPost(postId: string, input: AdminPostReviewInput): Promise<AdminPostReviewResult>;
  listUsers(params?: AdminUserListParams): Promise<AdminUsersResponse>;
  updateUserRole(userId: string, input: AdminUserRoleInput): Promise<AdminUserRoleResult>;
  updateUserStatus(userId: string, input: AdminUserStatusInput): Promise<AdminUserStatusResult>;
  listAdmins(params?: AdminUserListParams): Promise<AdminUsersResponse>;
  listSuperAdmins(params?: AdminUserListParams): Promise<AdminUsersResponse>;
  listComments(params?: AdminCommentListParams): Promise<AdminCommentsResponse>;
  deleteComment(commentId: string): Promise<{ commentId: string }>;
  deletePost(postId: string): Promise<{ postId: string }>;
}

export type AdminCommentListParams = {
  page?: number;
  limit?: number;
  postId?: string;
};

export type AdminCommentSummary = {
  id: string;
  content: string;
  postId: string;
  author: {
    id: string;
    name: string;
    email?: string;
  };
  parentId: string | null;
  likeCount?: number;
  replyCount?: number;
  createdAt: string;
};

export type AdminCommentsResponse = {
  comments: AdminCommentSummary[];
  pagination: Pagination;
};

class ApiAdminRepository implements AdminRepository {
  async listPendingPosts(params: AdminPostListParams = {}): Promise<AdminPendingPostsResponse> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      appendQueryParam(qs, key, value);
    }
    const url = qs.size ? `${API_ENDPOINTS.ADMIN.POSTS_PENDING}?${qs.toString()}` : API_ENDPOINTS.ADMIN.POSTS_PENDING;
    const res = await httpAuth.get<ApiResponse<AdminPendingPostsResponse>>(url);
    return unwrapApiResponse<AdminPendingPostsResponse>(res);
  }

  async listPosts(params: AdminPostListParams = {}): Promise<AdminPostsResponse> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      appendQueryParam(qs, key, value);
    }
    const url = qs.size ? `${API_ENDPOINTS.ADMIN.POSTS}?${qs.toString()}` : API_ENDPOINTS.ADMIN.POSTS;
    const res = await httpAuth.get<ApiResponse<AdminPostsResponse>>(url);
    return unwrapApiResponse<AdminPostsResponse>(res);
  }

  async reviewPost(postId: string, input: AdminPostReviewInput): Promise<AdminPostReviewResult> {
    const path = API_ENDPOINTS.ADMIN.POST_REVIEW.replace(':postId', encodeURIComponent(postId));
    const res = await httpAuth.put<ApiResponse<AdminPostReviewResult>>(path, input);
    return unwrapApiResponse<AdminPostReviewResult>(res);
  }

  async deletePost(postId: string): Promise<{ postId: string }> {
    const path = API_ENDPOINTS.ADMIN.POST_DELETE.replace(':postId', encodeURIComponent(postId));
    const res = await httpAuth.delete<ApiResponse<{ postId: string }>>(path);
    return unwrapApiResponse<{ postId: string }>(res);
  }

  async listUsers(params: AdminUserListParams = {}): Promise<AdminUsersResponse> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      appendQueryParam(qs, key, value);
    }
    const url = qs.size ? `${API_ENDPOINTS.ADMIN.USERS}?${qs.toString()}` : API_ENDPOINTS.ADMIN.USERS;
    const res = await httpAuth.get<ApiResponse<AdminUsersResponse>>(url);
    return unwrapApiResponse<AdminUsersResponse>(res);
  }

  async listAdmins(params: AdminUserListParams = {}): Promise<AdminUsersResponse> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      appendQueryParam(qs, key, value);
    }
    const url = qs.size ? `${API_ENDPOINTS.ADMIN.ADMINS}?${qs.toString()}` : API_ENDPOINTS.ADMIN.ADMINS;
    const res = await httpAuth.get<ApiResponse<AdminUsersResponse>>(url);
    return unwrapApiResponse<AdminUsersResponse>(res);
  }

  async listSuperAdmins(params: AdminUserListParams = {}): Promise<AdminUsersResponse> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      appendQueryParam(qs, key, value);
    }
    const url = qs.size ? `${API_ENDPOINTS.ADMIN.SUPER_ADMINS}?${qs.toString()}` : API_ENDPOINTS.ADMIN.SUPER_ADMINS;
    const res = await httpAuth.get<ApiResponse<AdminUsersResponse>>(url);
    return unwrapApiResponse<AdminUsersResponse>(res);
  }

  async updateUserRole(userId: string, input: AdminUserRoleInput): Promise<AdminUserRoleResult> {
    const path = API_ENDPOINTS.ADMIN.USER_ROLE.replace(':userId', encodeURIComponent(userId));
    const res = await httpAuth.put<ApiResponse<AdminUserRoleResult>>(path, input);
    return unwrapApiResponse<AdminUserRoleResult>(res);
  }

  async updateUserStatus(userId: string, input: AdminUserStatusInput): Promise<AdminUserStatusResult> {
    const path = API_ENDPOINTS.ADMIN.USER_STATUS.replace(':userId', encodeURIComponent(userId));
    const res = await httpAuth.put<ApiResponse<AdminUserStatusResult>>(path, input);
    return unwrapApiResponse<AdminUserStatusResult>(res);
  }

  async listComments(params: AdminCommentListParams = {}): Promise<AdminCommentsResponse> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      appendQueryParam(qs, key, value);
    }
    const url = qs.size ? `${API_ENDPOINTS.ADMIN.COMMENTS}?${qs.toString()}` : API_ENDPOINTS.ADMIN.COMMENTS;
    const res = await httpAuth.get<ApiResponse<AdminCommentsResponse>>(url);
    return unwrapApiResponse<AdminCommentsResponse>(res);
  }

  async deleteComment(commentId: string): Promise<{ commentId: string }> {
    const path = API_ENDPOINTS.ADMIN.COMMENT_DELETE.replace(':commentId', encodeURIComponent(commentId));
    const res = await httpAuth.delete<ApiResponse<{ commentId: string }>>(path);
    return unwrapApiResponse<{ commentId: string }>(res);
  }
}

class MockAdminRepository implements AdminRepository {
  private pendingPosts: AdminPendingPostSummary[] = Array.from({ length: 6 }).map((_, idx) => ({
    id: `pending-${idx + 1}`,
    title: `待审核帖子 ${idx + 1}`,
    content: `这是一条待审核的帖子内容示例 ${idx + 1}`,
    category: idx % 2 === 0 ? 'food' : 'recipe',
    postType: idx % 2 === 0 ? 'share' : 'seeking',
    images: ['https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800&auto=format&fit=crop'],
    author: {
      id: `author-${idx + 1}`,
      name: `作者 ${idx + 1}`,
      email: `author${idx + 1}@example.com`,
    },
    status: 'pending',
    createdAt: new Date(Date.now() - idx * 3600_000).toISOString(),
  }));

  private users: AdminUserSummary[] = [
    {
      id: 'user-1',
      name: '张三',
      email: 'zhangsan@example.com',
      role: ROLES.USER,
      isActive: true,
      stats: { postCount: 12, followerCount: 56 },
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      name: '李四',
      email: 'lisi@example.com',
      role: ROLES.ADMIN,
      isActive: true,
      stats: { postCount: 34, followerCount: 120 },
      createdAt: '2024-02-01T00:00:00Z',
    },
    {
      id: 'user-3',
      name: '王五',
      email: 'wangwu@example.com',
      role: ROLES.USER,
      isActive: false,
      stats: { postCount: 5, followerCount: 15 },
      createdAt: '2024-03-01T00:00:00Z',
    },
  ];

  private comments: AdminCommentSummary[] = Array.from({ length: 10 }).map((_, idx) => ({
    id: `comment-${idx + 1}`,
    content: `这是一条待审核的评论内容 ${idx + 1}`,
    postId: `post-${Math.floor(idx / 2) + 1}`,
    author: {
      id: `user-${idx + 1}`,
      name: `用户 ${idx + 1}`,
      email: `user${idx + 1}@example.com`,
    },
    parentId: null,
    likeCount: idx * 2,
    replyCount: idx % 3,
    createdAt: new Date(Date.now() - idx * 7200_000).toISOString(),
  }));

  async listPendingPosts(params: AdminPostListParams = {}): Promise<AdminPendingPostsResponse> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.max(1, Math.min(50, Math.floor(params.limit ?? 20)));
    const start = (page - 1) * limit;
    const posts = this.pendingPosts.slice(start, start + limit);
    return {
      posts,
      pagination: {
        page,
        limit,
        total: this.pendingPosts.length,
        totalPages: Math.max(1, Math.ceil(this.pendingPosts.length / limit)),
      },
    };
  }

  async listPosts(params: AdminPostListParams = {}): Promise<AdminPostsResponse> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.max(1, Math.min(50, Math.floor(params.limit ?? 20)));
    let list = [...this.pendingPosts];
    if (params.status) {
      list = list.filter((post) => post.status === params.status);
    }
    if (params.postType) {
      list = list.filter((post) => post.postType === params.postType);
    }
    const start = (page - 1) * limit;
    const posts = list.slice(start, start + limit);
    return {
      posts,
      pagination: {
        page,
        limit,
        total: list.length,
        totalPages: Math.max(1, Math.ceil(list.length / limit)),
      },
    };
  }

  async reviewPost(postId: string, input: AdminPostReviewInput): Promise<AdminPostReviewResult> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const index = this.pendingPosts.findIndex((post) => post.id === postId);
    if (index >= 0) {
      this.pendingPosts[index] = {
        ...this.pendingPosts[index],
        status: input.status,
      };
    }
    return {
      postId,
      status: input.status,
      reviewedAt: new Date().toISOString(),
    };
  }

  async deletePost(postId: string): Promise<{ postId: string }> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    this.pendingPosts = this.pendingPosts.filter((post) => post.id !== postId);
    return { postId };
  }

  async listUsers(params: AdminUserListParams = {}): Promise<AdminUsersResponse> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    let list = [...this.users];
    if (typeof params.isActive === 'boolean') {
      list = list.filter((user) => user.isActive === params.isActive);
    }
    if (params.role) {
      list = list.filter((user) => user.role === params.role);
    }
    return this.paginateUsers(list, params);
  }

  async listAdmins(params: AdminUserListParams = {}): Promise<AdminUsersResponse> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const admins = this.users.filter((user) => user.role === ROLES.ADMIN);
    return this.paginateUsers(admins, params);
  }

  async listSuperAdmins(params: AdminUserListParams = {}): Promise<AdminUsersResponse> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const supers = this.users.filter((user) => user.role === ROLES.SUPER_ADMIN);
    return this.paginateUsers(supers, params);
  }

  async updateUserRole(userId: string, input: AdminUserRoleInput): Promise<AdminUserRoleResult> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const target = this.users.find((user) => user.id === userId);
    if (target) {
      target.role = input.role;
    }
    return {
      userId,
      role: input.role,
    };
  }

  async updateUserStatus(userId: string, input: AdminUserStatusInput): Promise<AdminUserStatusResult> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const target = this.users.find((user) => user.id === userId);
    if (target) {
      target.isActive = input.isActive;
    }
    return {
      userId,
      isActive: input.isActive,
    };
  }

  async listComments(params: AdminCommentListParams = {}): Promise<AdminCommentsResponse> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.max(1, Math.min(50, Math.floor(params.limit ?? 20)));
    let list = [...this.comments];
    if (params.postId) {
      list = list.filter((comment) => comment.postId === params.postId);
    }
    const start = (page - 1) * limit;
    const comments = list.slice(start, start + limit);
    return {
      comments,
      pagination: {
        page,
        limit,
        total: list.length,
        totalPages: Math.max(1, Math.ceil(list.length / limit)),
      },
    };
  }

  async deleteComment(commentId: string): Promise<{ commentId: string }> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    this.comments = this.comments.filter((comment) => comment.id !== commentId);
    return { commentId };
  }

  private paginateUsers(list: AdminUserSummary[], params: AdminUserListParams): AdminUsersResponse {
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.max(1, Math.min(50, Math.floor(params.limit ?? 20)));
    const start = (page - 1) * limit;
    const users = list.slice(start, start + limit);
    return {
      users,
      pagination: {
        page,
        limit,
        total: list.length,
        totalPages: Math.max(1, Math.ceil(list.length / limit)),
      },
    };
  }
}

export const adminRepository: AdminRepository = USE_MOCK ? new MockAdminRepository() : new ApiAdminRepository();
