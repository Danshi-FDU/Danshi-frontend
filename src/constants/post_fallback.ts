import type { Post } from '@/src/models/Post';

export const POSTER_COLORS = [
  { bg: '#FFF2E8', text: '#8B5A2B' },
  { bg: '#E8F3FF', text: '#2E5A8B' },
  { bg: '#F7E8FF', text: '#6B4D8A' },
  { bg: '#E8FFEA', text: '#3D7A4A' },
  { bg: '#FFFBE8', text: '#8B7A2B' },
  { bg: '#F2F4F7', text: '#5A5F6B' },
] as const;

export function getPostDisplayTitle(post?: Pick<Post, 'title' | 'content'> | null) {
  return post?.title?.trim() || post?.content?.trim().slice(0, 60) || '分享美食';
}

export function getPostPosterColor(postId: number) {
  return POSTER_COLORS[Math.abs(postId) % POSTER_COLORS.length];
}
