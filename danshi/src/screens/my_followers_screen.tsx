import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, List, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/context/auth_context';
import { usersService } from '@/src/services/users_service';
import type { FollowUserItem } from '@/src/repositories/users_repository';
import { AppError } from '@/src/lib/errors/app_error';

const formatCount = (value?: number) => {
  if (value == null) return '--';
  if (value < 1000) return String(value);
  if (value < 10000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${(value / 10000).toFixed(1).replace(/\.0$/, '')}w`;
};

type ListType = 'followers' | 'following';

const createFollowListScreen = (type: ListType) => {
  const Screen: React.FC = () => {
    const { user } = useAuth();
    const [items, setItems] = useState<FollowUserItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const insets = useSafeAreaInsets();
    const theme = useTheme();

    const load = useCallback(
      async (isRefresh = false) => {
        if (!user?.id) return;
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
        try {
          const data =
            type === 'followers'
              ? await usersService.getUserFollowers(user.id)
              : await usersService.getUserFollowing(user.id);
          setItems(data.users);
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
      load();
    }, [load]);

    const renderItem = ({ item }: { item: FollowUserItem }) => (
      <List.Item
        title={item.name}
        description={item.bio ?? '这个用户还没有填写简介'}
        left={() => (
          <Avatar.Image
            size={48}
            source={{ uri: item.avatar_url ?? 'https://api.dicebear.com/7.x/identicon/png?seed=danshi' }}
          />
        )}
        right={() => (
          <View style={styles.followMeta}>
            <Text variant="labelSmall">
              帖子 {formatCount(item.stats?.post_count)}
            </Text>
            <Text variant="labelSmall">
              粉丝 {formatCount(item.stats?.follower_count)}
            </Text>
            {type === 'followers' ? (
              <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                {item.is_following ? '已互关' : '未回关'}
              </Text>
            ) : (
              <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                {item.is_following ? '已关注' : '未关注'}
              </Text>
            )}
          </View>
        )}
      />
    );

    if (!user?.id) {
      return (
        <View style={[styles.centered, { paddingTop: insets.top + 48 }]}>
          <Text variant="bodyMedium">请先登录后再查看列表</Text>
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
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
            }
            contentContainerStyle={items.length === 0 ? styles.emptyListContent : undefined}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text variant="bodyMedium">暂无数据</Text>
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

  Screen.displayName = type === 'followers' ? 'MyFollowersScreen' : 'MyFollowingScreen';
  return Screen;
};

export const MyFollowersScreen = createFollowListScreen('followers');
export const MyFollowingScreen = createFollowListScreen('following');

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
  followMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  errorContainer: {
    padding: 16,
  },
});

export default MyFollowersScreen;
