import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/src/constants/app';

export type PostInput = {
  title: string;
  content: string;
};

export type Post = PostInput & {
  id: string;
  createdAt: number;
};

export interface PostsRepository {
  create(input: PostInput): Promise<Post>;
}

async function getAll(): Promise<Post[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.POSTS);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Post[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export class MockPostsRepository implements PostsRepository {
  async create(input: PostInput): Promise<Post> {
    const post: Post = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: input.title.trim(),
      content: input.content.trim(),
      createdAt: Date.now(),
    };
    const list = await getAll();
    const next = [post, ...list];
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(next));
    return post;
  }
}

// 目前仅提供 Mock 实现；如需对接服务端，新增 ApiPostsRepository 并在此切换。
export const postsRepository: PostsRepository = new MockPostsRepository();
