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

export async function getPosts(): Promise<Post[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.POSTS);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Post[];
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

export async function createPost(input: PostInput): Promise<Post> {
  const post: Post = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title.trim(),
    content: input.content.trim(),
    createdAt: Date.now(),
  };
  const list = await getPosts();
  const next = [post, ...list];
  await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(next));
  return post;
}
