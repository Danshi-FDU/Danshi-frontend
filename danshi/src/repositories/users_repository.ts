import { http } from '@/src/lib/http/client';
import { httpAuth } from '@/src/lib/http/http_auth';
import { unwrapApiResponse, type ApiResponse } from '@/src/lib/http/response';
import type { User, Gender } from '@/src/models/User';
import { API_ENDPOINTS, USE_MOCK } from '@/src/constants/app';

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
}

export const usersRepository: UsersRepository = USE_MOCK ? new MockUsersRepository() : new ApiUsersRepository();
