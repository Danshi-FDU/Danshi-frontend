import { API_ENDPOINTS, USE_MOCK } from '@/src/constants/app';
import { httpAuth } from '@/src/lib/http/http_auth';
import { unwrapApiResponse, type ApiResponse } from '@/src/lib/http/response';
import type { PlatformStats, UserAggregateStats } from '@/src/models/Stats';

export interface StatsRepository {
  getPlatformStats(): Promise<PlatformStats>;
  getUserStats(userId: string): Promise<UserAggregateStats>;
}

class ApiStatsRepository implements StatsRepository {
  async getPlatformStats(): Promise<PlatformStats> {
    const resp = await httpAuth.get<ApiResponse<PlatformStats>>(API_ENDPOINTS.STATS.PLATFORM);
    return unwrapApiResponse<PlatformStats>(resp, 200);
  }

  async getUserStats(userId: string): Promise<UserAggregateStats> {
    const path = API_ENDPOINTS.STATS.USER.replace(':userId', encodeURIComponent(userId));
    const resp = await httpAuth.get<ApiResponse<UserAggregateStats>>(path);
    return unwrapApiResponse<UserAggregateStats>(resp, 200);
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class MockStatsRepository implements StatsRepository {
  async getPlatformStats(): Promise<PlatformStats> {
    await delay(80);
    return {
      totalUsers: 1250,
      totalPosts: 3420,
      totalComments: 8960,
      totalViews: 125680,
      activeUsers: 456,
      pendingPosts: 12,
      todayStats: {
        newUsers: 15,
        newPosts: 28,
        newComments: 156,
        newViews: 3580,
      },
    };
  }

  async getUserStats(userId: string): Promise<UserAggregateStats> {
    await delay(60);
    const seed = Math.abs([...userId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0));
    const pseudo = (mod: number, base: number) => (seed % mod) + base;
    return {
      postCount: pseudo(20, 5),
      totalLikes: pseudo(200, 40),
      totalFavorites: pseudo(120, 10),
      totalViews: pseudo(3000, 500),
      commentCount: pseudo(80, 5),
      followerCount: pseudo(500, 20),
      followingCount: pseudo(100, 10),
    };
  }
}

export const statsRepository: StatsRepository = USE_MOCK ? new MockStatsRepository() : new ApiStatsRepository();
