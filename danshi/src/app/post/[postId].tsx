import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import PostDetailScreen from '@/src/screens/post_detail_screen';

export default function PostDetailRoute() {
  const params = useLocalSearchParams<{ postId?: string | string[] }>();
  const postIdParam = params.postId;
  const postId = Array.isArray(postIdParam) ? postIdParam[0] : postIdParam;

  if (!postId) return null;

  return <PostDetailScreen postId={postId} />;
}
