import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Button, Text, useTheme as usePaperTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/auth_context';
import { usersService } from '@/src/services/users_service';
import type { UserAggregateStats } from '@/src/models/Stats';
import type { UserProfile } from '@/src/repositories/users_repository';
import type { Post } from '@/src/models/Post';
import { isAdmin } from '@/src/lib/auth/roles';
import { Masonry } from '@/src/components/md3/masonry';
import { PostCard, estimatePostCardHeight } from '@/src/components/post_card';
import { useWaterfallSettings } from '@/src/context/waterfall_context';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';

// 品牌色
const BRAND_ORANGE = '#F97316';
const BRAND_PINK = '#FB7185';

const formatCount = (value?: number | null) => {
  if (value == null) return '0';
  if (value < 1000) return String(value);
  if (value < 10000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${(value / 10000).toFixed(1).replace(/\.0$/, '')}w`;
};

type TabType = 'posts' | 'favorites';

export default function MyselfScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = usePaperTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { minHeight, maxHeight } = useWaterfallSettings();

  // 响应式间距 - 与探索界面保持一致
  const bp = useBreakpoint();
  const gap = pickByBreakpoint(bp, { base: 4, sm: 6, md: 10, lg: 14, xl: 16 });
  const verticalGap = pickByBreakpoint(bp, { base: 4, sm: 6, md: 10, lg: 14, xl: 16 });
  const horizontalPadding = pickByBreakpoint(bp, { base: 4, sm: 6, md: 12, lg: 16, xl: 20 });

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserAggregateStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [favorites, setFavorites] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  const displayName = useMemo(
    () => profile?.name ?? user?.name ?? '未登录',
    [profile?.name, user?.name]
  );
  const displayEmail = useMemo(
    () => profile?.email ?? user?.email ?? undefined,
    [profile?.email, user?.email]
  );
  const avatarUrl = useMemo(
    () => profile?.avatar_url ?? user?.avatar_url ?? null,
    [profile?.avatar_url, user?.avatar_url]
  );

  // 加载用户资料
  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const fetchedProfile = await usersService.getUser(user.id);
      setProfile(fetchedProfile);
      if (fetchedProfile.stats) {
        setStats({
          post_count: fetchedProfile.stats.post_count,
          follower_count: fetchedProfile.stats.follower_count,
          following_count: fetchedProfile.stats.following_count,
          total_likes: 0,
          total_favorites: 0,
          total_views: 0,
          comment_count: 0,
        });
      }
    } catch (error) {
      console.warn('Load profile failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 加载我的帖子
  const loadPosts = useCallback(async () => {
    if (!user?.id) return;
    setPostsLoading(true);
    try {
      const res = await usersService.getUserPosts(user.id, { limit: 20 });
      // 过滤掉不支持的帖子类型（如 companion）
      const supportedPosts = res.posts.filter((item: any) => 
        !item.post_type || item.post_type === 'share' || item.post_type === 'seeking'
      );
      const converted: Post[] = supportedPosts.map((item) => {
        // 支持两种图片格式：images 数组或 cover_image 单图
        const images = item.images?.length
          ? item.images
          : item.cover_image
          ? [item.cover_image]
          : [];
        return {
          id: item.id,
          title: item.title,
          content: '',
          post_type: 'share' as const,
          share_type: 'recommend' as const,
          category: (item.category as 'food' | 'recipe') || 'food',
          images,
          tags: [],
          canteen: '',
          author: undefined,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.created_at || new Date().toISOString(),
          stats: {
            like_count: item.like_count || 0,
            view_count: item.view_count || 0,
            comment_count: item.comment_count || 0,
            favorite_count: 0,
          },
          is_liked: false,
          is_favorited: false,
        };
      });
      setPosts(converted);
    } catch (error: any) {
      // 忽略 companion 类型相关的验证错误
      if (error?.message?.includes('companion') || error?.message?.includes('PostType')) {
        console.warn('后端返回了不支持的帖子类型，已忽略');
        setPosts([]);
      } else {
        console.warn('Load posts failed:', error);
      }
    } finally {
      setPostsLoading(false);
    }
  }, [user?.id]);

  // 加载收藏的帖子
  const loadFavorites = useCallback(async () => {
    if (!user?.id) return;
    setFavoritesLoading(true);
    try {
      const res = await usersService.getUserFavorites(user.id, { limit: 20 });
      // 过滤掉不支持的帖子类型（如 companion）
      const supportedPosts = res.posts.filter((item: any) => 
        !item.post_type || item.post_type === 'share' || item.post_type === 'seeking'
      );
      // 转换为 Post 类型
      const converted: Post[] = supportedPosts.map((item) => {
        // 支持两种图片格式：images 数组或 cover_image 单图
        const images = item.images?.length
          ? item.images
          : item.cover_image
          ? [item.cover_image]
          : [];
        return {
          id: item.id,
          title: item.title,
          content: '',
          post_type: 'share' as const,
          share_type: 'recommend' as const,
          category: (item.category as 'food' | 'recipe') || 'food',
          images,
          tags: [],
          canteen: '',
          author: undefined,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.created_at || new Date().toISOString(),
          stats: {
            like_count: item.like_count || 0,
            view_count: item.view_count || 0,
            comment_count: item.comment_count || 0,
            favorite_count: 0,
          },
          is_liked: false,
          is_favorited: true,
        };
      });
      setFavorites(converted);
    } catch (error: any) {
      // 忽略 companion 类型相关的验证错误
      if (error?.message?.includes('companion') || error?.message?.includes('PostType')) {
        console.warn('后端返回了不支持的帖子类型，已忽略');
        setFavorites([]);
      } else {
        console.warn('Load favorites failed:', error);
      }
    } finally {
      setFavoritesLoading(false);
    }
  }, [user?.id]);

  // 页面获得焦点时刷新数据
  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadPosts();
    }, [loadProfile, loadPosts])
  );

  // 切换到收藏 tab 时加载收藏
  useEffect(() => {
    if (activeTab === 'favorites' && favorites.length === 0) {
      loadFavorites();
    }
  }, [activeTab, favorites.length, loadFavorites]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), activeTab === 'posts' ? loadPosts() : loadFavorites()]);
    setRefreshing(false);
  }, [loadProfile, loadPosts, loadFavorites, activeTab]);

  const handleNavigateTo = (
    path: '/(tabs)/myself/posts' | '/(tabs)/myself/followers' | '/(tabs)/myself/following'
  ) => {
    if (!user?.id) return;
    router.push(path);
  };

  const handlePostPress = useCallback((postId: string) => {
    router.push({ pathname: '/post/[postId]', params: { postId } });
  }, []);

  const estimateHeight = useCallback(
    (post: Post) => estimatePostCardHeight(post, minHeight, maxHeight),
    [minHeight, maxHeight]
  );

  const currentPosts = activeTab === 'posts' ? posts : favorites;
  const currentLoading = activeTab === 'posts' ? postsLoading : favoritesLoading;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND_ORANGE} />
        }
      >
        {/* ==================== 顶部操作栏 ==================== */}
        <View style={[styles.headerBar, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>个人中心</Text>
          <Pressable style={styles.headerBtn} onPress={() => router.push('/myself/settings')}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* ==================== 用户信息区 ==================== */}
        <View style={[styles.profileSectionSimple, { backgroundColor: theme.colors.surface }]}>
          {/* 悬浮头像 */}
          <View style={styles.avatarWrapper}>
            <Pressable
              style={styles.avatarContainer}
              onPress={() => router.push('/myself/settings')}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Ionicons name="person" size={40} color={theme.colors.primary} />
                </View>
              )}
            </Pressable>
          </View>

          {/* 用户名和编辑按钮 */}
          <View style={styles.userInfoRow}>
            <View style={styles.userNameSection}>
              <Text style={[styles.userName, { color: theme.colors.onSurface }]}>{displayName}</Text>
              {displayEmail ? <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>{displayEmail}</Text> : null}
            </View>
            <Pressable
              style={[styles.editProfileBtn, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}
              onPress={() => router.push('/myself/settings')}
            >
              <Text style={[styles.editProfileText, { color: theme.colors.onSurfaceVariant }]}>编辑资料</Text>
            </Pressable>
          </View>

          {/* 数据栏 */}
          <View style={[styles.statsRow, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Pressable style={styles.statItem} onPress={() => handleNavigateTo('/(tabs)/myself/posts')}>
              <Text style={[styles.statNumber, { color: theme.colors.onSurface }]}>{formatCount(stats?.post_count)}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>帖子</Text>
            </Pressable>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
            <Pressable style={styles.statItem} onPress={() => handleNavigateTo('/(tabs)/myself/followers')}>
              <Text style={[styles.statNumber, { color: theme.colors.onSurface }]}>{formatCount(stats?.follower_count)}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>粉丝</Text>
            </Pressable>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
            <Pressable style={styles.statItem} onPress={() => handleNavigateTo('/(tabs)/myself/following')}>
              <Text style={[styles.statNumber, { color: theme.colors.onSurface }]}>{formatCount(stats?.following_count)}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>关注</Text>
            </Pressable>
          </View>
        </View>

        {/* ==================== Tab 切换栏 ==================== */}
        <View style={[styles.tabSection, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.tabBar, { borderBottomColor: theme.colors.outlineVariant }]}>
            <Pressable
              style={[styles.tabItem, activeTab === 'posts' && styles.tabItemActive]}
              onPress={() => setActiveTab('posts')}
            >
              <Ionicons
                name={activeTab === 'posts' ? 'grid' : 'grid-outline'}
                size={20}
                color={activeTab === 'posts' ? BRAND_ORANGE : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.tabText, { color: theme.colors.onSurfaceVariant }, activeTab === 'posts' && styles.tabTextActive]}>
                帖子
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabItem, activeTab === 'favorites' && styles.tabItemActive]}
              onPress={() => setActiveTab('favorites')}
            >
              <Ionicons
                name={activeTab === 'favorites' ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={activeTab === 'favorites' ? BRAND_ORANGE : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.tabText, { color: theme.colors.onSurfaceVariant }, activeTab === 'favorites' && styles.tabTextActive]}>
                收藏
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ==================== 内容列表 ==================== */}
        <View style={[styles.contentSection, { backgroundColor: theme.colors.surface }]}>
          {currentLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={BRAND_ORANGE} />
              <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>加载中...</Text>
            </View>
          ) : currentPosts.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons
                name={activeTab === 'posts' ? 'document-text-outline' : 'bookmark-outline'}
                size={48}
                color={theme.colors.outlineVariant}
              />
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                {activeTab === 'posts' ? '还没有发布帖子' : '还没有收藏内容'}
              </Text>
              {activeTab === 'posts' && (
                <Pressable
                  style={styles.emptyBtn}
                  onPress={() => router.push('/(tabs)/post')}
                >
                  <Text style={styles.emptyBtnText}>去发布</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={[styles.postsGrid, { paddingHorizontal: horizontalPadding }]}>
              <Masonry
                data={currentPosts}
                columns={{ base: 2, md: 2, lg: 3, xl: 4 }}
                gap={gap}
                verticalGap={verticalGap}
                getItemHeight={estimateHeight}
                keyExtractor={(item) => item.id}
                renderItem={(item) => <PostCard post={item} onPress={handlePostPress} />}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // ==================== Header Bar ====================
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ==================== Profile Section ====================
  profileSectionSimple: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  avatarWrapper: {
    marginBottom: 16,
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  userNameSection: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  editProfileBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  // ==================== Stats Row ====================
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },

  // ==================== Tab Section ====================
  tabSection: {
    backgroundColor: '#fff',
    marginTop: 12,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: BRAND_ORANGE,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: BRAND_ORANGE,
  },

  // ==================== Content Section ====================
  contentSection: {
    minHeight: 200,
    paddingTop: 4,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: BRAND_ORANGE,
    borderRadius: 20,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  postsGrid: {
    paddingBottom: 8,
  },
});
