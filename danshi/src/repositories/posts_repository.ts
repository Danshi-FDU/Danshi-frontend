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
  PostAuthor,
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

const MOCK_AUTHORS: PostAuthor[] = [
  { id: 'mock-user-01', name: '王若琳', avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&crop=faces' },
  { id: 'mock-user-02', name: '陈嘉', avatarUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=120&h=120&crop=faces' },
  { id: 'mock-user-03', name: '李云鹏', avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&h=120&crop=faces' },
  { id: 'mock-user-04', name: '周琪', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&crop=faces' },
];

function seedMockPosts(): Post[] {
  const now = '2025-11-12T08:00:00.000Z';
  const earlier = '2025-11-09T09:45:00.000Z';
  const weekAgo = '2025-11-05T13:20:00.000Z';
  return [
    {
      id: 'mock-share-001',
      postType: 'share',
      shareType: 'recommend',
      title: '南区食堂的椒麻鸡惊艳到我',
      content: '邯郸南区二楼的椒麻鸡真的香，外酥里嫩，花椒的香气特别提神，还可以免费加一点酸菜一起拌着吃。',
      category: 'food',
      canteen: '邯郸校区南区食堂',
      tags: ['椒麻鸡', '打卡', '南区必吃'],
      images: [
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop',
      ],
      cuisine: '川菜',
      flavors: ['麻辣', '香辣'],
      price: 18.5,
      author: MOCK_AUTHORS[0],
      stats: { likeCount: 132, favoriteCount: 47, commentCount: 23, viewCount: 1045 },
      isLiked: false,
      isFavorited: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock-share-002',
      postType: 'share',
      shareType: 'warning',
      title: '春晖食堂的黑椒牛排有点踩雷',
      content: '黑椒没有香味，肉质偏柴，配菜也比较随意，价格却涨到了 28 元，感觉性价比不高，建议谨慎尝试。',
      category: 'food',
      canteen: '邯郸校区春晖食堂',
      tags: ['避雷', '春晖食堂'],
      images: [
        'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800&auto=format&fit=crop',
      ],
      cuisine: '西式',
      flavors: ['黑椒', '偏咸'],
      price: 28,
      author: MOCK_AUTHORS[1],
      stats: { likeCount: 56, favoriteCount: 9, commentCount: 14, viewCount: 612 },
      isLiked: false,
      isFavorited: false,
      createdAt: earlier,
      updatedAt: earlier,
    },
    {
      id: 'mock-seeking-001',
      postType: 'seeking',
      title: '求推荐江湾食堂的清淡早餐',
      content: '最近早上胃口不好，想找一些清淡又不油腻的早餐，有没有同学推荐江湾食堂的靠谱摊位？',
      category: 'food',
      canteen: '江湾校区食堂',
      tags: ['早餐', '清淡'],
      images: [],
      budgetRange: { min: 6, max: 15 },
      preferences: { preferFlavors: ['清淡'], avoidFlavors: ['油炸'] },
      author: MOCK_AUTHORS[2],
      stats: { likeCount: 21, favoriteCount: 5, commentCount: 18, viewCount: 389 },
      isLiked: false,
      isFavorited: false,
      createdAt: weekAgo,
      updatedAt: weekAgo,
    },
    {
      id: 'mock-companion-001',
      postType: 'companion',
      title: '周五晚春晖烤鱼拼单有人吗',
      content: '想约三四个同学一起拼单春晖三楼的小青椒烤鱼，人均 35 左右，顺便聊聊课程。',
      category: 'food',
      canteen: '邯郸校区春晖食堂',
      tags: ['拼单', '周五晚上'],
      images: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
      ],
      meetingInfo: {
        date: '2025-11-15',
        time: '18:30',
        location: '春晖三楼烤鱼档口',
        maxPeople: 4,
        currentPeople: 2,
        costSharing: 'AA制',
        status: 'open',
      },
      contact: { method: 'wechat', note: '加我微信备注“烤鱼”即可' },
      author: MOCK_AUTHORS[3],
      stats: { likeCount: 44, favoriteCount: 17, commentCount: 11, viewCount: 522 },
      isLiked: false,
      isFavorited: false,
      createdAt: earlier,
      updatedAt: earlier,
    },
    {
      id: 'mock-share-003',
      postType: 'share',
      shareType: 'recommend',
      title: '邯郸北区的番茄牛腩面好暖胃',
      content: '这碗番茄牛腩面汤底特别鲜，酸甜开胃，牛腩给得也很足，适合秋天晚上吃一碗暖暖身。',
      category: 'food',
      canteen: '邯郸校区北区食堂',
      tags: ['面食', '暖胃'],
      images: [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop',
      ],
      cuisine: '中式',
      flavors: ['鲜', '清爽'],
      price: 16,
      author: MOCK_AUTHORS[2],
      stats: { likeCount: 88, favoriteCount: 31, commentCount: 19, viewCount: 745 },
      isLiked: false,
      isFavorited: false,
      createdAt: '2025-11-10T11:15:00.000Z',
      updatedAt: '2025-11-10T11:15:00.000Z',
    },
    {
      id: 'mock-recipe-001',
      postType: 'share',
      shareType: 'recommend',
      title: '寝室快手番茄蛋包饭教程',
      content: '用微波炉也能做出松软的蛋包饭，番茄酱煮一下更好吃，附带详细步骤和时间安排，适合宿舍党。',
      category: 'recipe',
      tags: ['宿舍料理', '番茄蛋包饭'],
      images: [
        'https://images.unsplash.com/photo-1589308078054-83299d4d71dc?w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800&auto=format&fit=crop',
      ],
      cuisine: '家常',
      flavors: ['酸甜', '柔软'],
      price: 12,
      author: MOCK_AUTHORS[0],
      stats: { likeCount: 201, favoriteCount: 96, commentCount: 54, viewCount: 1520 },
      isLiked: false,
      isFavorited: false,
      createdAt: '2025-11-08T07:30:00.000Z',
      updatedAt: '2025-11-08T07:30:00.000Z',
    },
  ];
}

class MockPostsRepository implements PostsRepository {
  private store: Post[] = seedMockPosts();

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
