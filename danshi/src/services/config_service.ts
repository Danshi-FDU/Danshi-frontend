import { API_ENDPOINTS, USE_MOCK } from '@/src/constants/app';
import { http } from '@/src/lib/http/client';
import { unwrapApiResponse } from '@/src/lib/http/response';
import type { PostType, ShareType } from '@/src/models/Post';

export type PostTypeSubType = {
  value: ShareType;
  label: string;
  icon?: string;
};

export type PostTypeConfig = {
  type: PostType;
  name: string;
  icon?: string;
  description?: string;
  subTypes?: PostTypeSubType[];
  requiredFields?: string[];
  recommendedFields?: string[];
};

export type CanteenConfig = {
  id: string;
  name: string;
  campus: string;
  isActive: boolean;
};

export type ExploreConfig = {
  postTypes: PostTypeConfig[];
  canteens: CanteenConfig[];
  cuisines: string[];
  flavors: string[];
};

type Fetcher<T> = () => Promise<T>;

type CacheEntry<T> = {
  value: T | null;
  fetcher: Fetcher<T>;
};

const POST_TYPES_FALLBACK: PostTypeConfig[] = [
  {
    type: 'share',
    name: '美食分享/避雷',
    icon: '📸',
    description: '分享你的美食体验，为他人提供参考',
    subTypes: [
      { value: 'recommend', label: '推荐', icon: '👍' },
      { value: 'warning', label: '避雷', icon: '⚠️' },
    ],
    requiredFields: ['title', 'content', 'images', 'category'],
    recommendedFields: ['canteen', 'cuisine', 'flavors', 'price', 'tags'],
  },
  {
    type: 'seeking',
    name: '求美食推荐',
    icon: '🔍',
    description: '寻求他人的美食推荐和建议',
    subTypes: [],
    requiredFields: ['title', 'content', 'category'],
    recommendedFields: ['canteen', 'cuisine', 'budgetRange', 'preferences', 'tags'],
  },
  {
    type: 'companion',
    name: '找搭子/约饭',
    icon: '👥',
    description: '寻找一起用餐的伙伴',
    subTypes: [],
    requiredFields: ['title', 'content', 'category'],
    recommendedFields: ['canteen', 'meetingInfo', 'contact', 'tags'],
  },
];

const CANTEENS_FALLBACK: CanteenConfig[] = [
  {
    id: 'canteen-south',
    name: '邯郸校区南区食堂',
    campus: '邯郸校区',
    isActive: true,
  },
  {
    id: 'canteen-chunhui',
    name: '邯郸校区春晖食堂',
    campus: '邯郸校区',
    isActive: true,
  },
  {
    id: 'canteen-north',
    name: '邯郸校区北区食堂',
    campus: '邯郸校区',
    isActive: true,
  },
  {
    id: 'canteen-jiangwan',
    name: '江湾校区食堂',
    campus: '江湾校区',
    isActive: true,
  },
];

const CUISINES_FALLBACK: string[] = ['中式', '西式', '日式', '韩式', '东南亚', '其他'];

const FLAVORS_FALLBACK: string[] = [
  '清淡',
  '微辣',
  '麻辣',
  '中辣',
  '特辣',
  '川菜',
  '湘菜',
  '粤菜',
  '家常',
  '香辣',
  '甜味',
  '咸鲜',
  '酸辣',
  '浓郁',
  '爽口',
  '其他',
];

async function fetchOrFallback<T>(path: string, fallback: T): Promise<T> {
  if (USE_MOCK) return fallback;
  try {
    const resp = await http.get(path);
    const data = unwrapApiResponse<T | null>(resp, 200);
    if (!data) return fallback;
    return data;
  } catch (error) {
    console.warn('[config_service] fallback triggered for', path, error);
    return fallback;
  }
}

function withCache<T>(entry: CacheEntry<T>, force = false): Fetcher<T> {
  return async () => {
    if (!force && entry.value) return entry.value;
    const value = await entry.fetcher();
    entry.value = value;
    return value;
  };
}

const postTypesEntry: CacheEntry<PostTypeConfig[]> = {
  value: null,
  fetcher: () => fetchOrFallback<PostTypeConfig[]>(API_ENDPOINTS.CONFIG.POST_TYPES, POST_TYPES_FALLBACK),
};

const canteensEntry: CacheEntry<CanteenConfig[]> = {
  value: null,
  fetcher: () => fetchOrFallback<CanteenConfig[]>(API_ENDPOINTS.CONFIG.CANTEENS, CANTEENS_FALLBACK),
};

const cuisinesEntry: CacheEntry<string[]> = {
  value: null,
  fetcher: () => fetchOrFallback<string[]>(API_ENDPOINTS.CONFIG.CUISINES, CUISINES_FALLBACK),
};

const flavorsEntry: CacheEntry<string[]> = {
  value: null,
  fetcher: () => fetchOrFallback<string[]>(API_ENDPOINTS.CONFIG.FLAVORS, FLAVORS_FALLBACK),
};

export const configService = {
  async getPostTypes(force = false): Promise<PostTypeConfig[]> {
    const fetcher = withCache(postTypesEntry, force);
    const list = await fetcher();
    return [...list];
  },

  async getCanteens(force = false): Promise<CanteenConfig[]> {
    const fetcher = withCache(canteensEntry, force);
    const list = await fetcher();
    return [...list].filter((item) => item.isActive !== false);
  },

  async getCuisines(force = false): Promise<string[]> {
    const fetcher = withCache(cuisinesEntry, force);
    const list = await fetcher();
    return [...list];
  },

  async getFlavors(force = false): Promise<string[]> {
    const fetcher = withCache(flavorsEntry, force);
    const list = await fetcher();
    return [...list];
  },

  async getExploreConfig(force = false): Promise<ExploreConfig> {
    const [postTypes, canteens, cuisines, flavors] = await Promise.all([
      this.getPostTypes(force),
      this.getCanteens(force),
      this.getCuisines(force),
      this.getFlavors(force),
    ]);
    return { postTypes, canteens, cuisines, flavors };
  },
};
