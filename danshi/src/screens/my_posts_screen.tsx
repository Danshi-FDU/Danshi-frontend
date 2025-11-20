import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, List, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/context/auth_context';
import { usersService } from '@/src/services/users_service';
import type { UserPostListItem } from '@/src/repositories/users_repository';
import { AppError } from '@/src/lib/errors/app_error';

const formatCount = (value?: number) => {
  if (value == null) return '--';
  if (value < 1000) return String(value);
  if (value < 10000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${(value / 10000).toFixed(1).replace(/\.0$/, '')}w`;
};

export const MyPostsScreen: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<UserPostListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const loadPosts = useCallback(
    async (isRefresh = false) => {
      if (!user?.id) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await usersService.getUserPosts(user.id);
        setPosts(data.posts);
      } catch (err) {
        const message = err instanceof AppError ? err.message : '读取数据失败，请稍后重试';
        setError(message);
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [user?.id],
  );

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const renderItem = ({ item }: { item: UserPostListItem }) => (
    <List.Item
      title={item.title}
      description={`点赞 ${formatCount(item.likeCount)} · 评论 ${formatCount(item.commentCount)} · 浏览 ${formatCount(item.viewCount)}`}
      left={(props) => (
        <List.Icon {...props} icon="file-document-outline" />
      )}
      right={(props) => (
        <View style={styles.metaContainer}>
          {item.status ? (
            <Text
              variant="labelSmall"
              style={[styles.statusChip, { backgroundColor: theme.colors.secondaryContainer, color: theme.colors.onSecondaryContainer }]}
            >
              {item.status === 'approved' ? '已发布' : item.status === 'pending' ? '审核中' : item.status === 'rejected' ? '未通过' : '草稿'}
            </Text>
          ) : null}
          {item.createdAt ? (
            <Text variant="labelSmall" style={styles.createdAt}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      )}
    />
  );

  if (!user?.id) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + 48 }]}>
        <Text variant="bodyMedium">请先登录后再查看我的帖子</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}
    >
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator animating size="large" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={posts.length === 0 ? styles.emptyListContent : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPosts(true)}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text variant="bodyMedium">还没有发布过帖子</Text>
            </View>
          }
        />
      )}
      {error ? (
        <View style={styles.errorContainer}>
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  metaContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  createdAt: {
    color: '#666',
  },
  errorContainer: {
    padding: 16,
  },
});

export default MyPostsScreen;
