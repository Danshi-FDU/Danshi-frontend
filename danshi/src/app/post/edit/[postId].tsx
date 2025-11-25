import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import { Stack } from 'expo-router';
import PostScreen from '@/src/screens/post_screen';
import { postsService } from '@/src/services/posts_service';
import { AppError } from '@/src/lib/errors/app_error';
import type { Post } from '@/src/models/Post';

export default function EditPostPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ postId: string }>();
  const postId = params.postId;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPost = useCallback(async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      const postData = await postsService.get(postId);
      setPost(postData);
    } catch (err) {
      const message = err instanceof AppError ? err.message : '加载帖子失败';
      Alert.alert('加载失败', message, [
        {
          text: '返回',
          onPress: () => router.back(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [postId, router]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handleUpdateSuccess = useCallback(() => {
    Alert.alert('更新成功', '帖子已更新，等待审核', [
      {
        text: '确定',
        onPress: () => router.back(),
      },
    ]);
  }, [router]);

  if (!postId) {
    return <Stack.Screen options={{ title: '编辑帖子' }} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: '编辑帖子' }} />
      <PostScreen 
        editMode={true}
        editPostId={postId}
        initialData={post}
        loading={loading}
        onUpdateSuccess={handleUpdateSuccess}
      />
    </>
  );
}