import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, TextStyle, Pressable, TextInput as RNTextInput, Platform } from 'react-native';
import {
  ActivityIndicator,
  Card,
  Text,
  useTheme as usePaperTheme,
  Avatar,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { searchService, type SearchPost, type SearchUser } from '@/src/services/search_service';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { Masonry } from '@/src/components/md3/masonry';
import { PostCard, estimatePostCardHeight } from '@/src/components/post_card';
import { useWaterfallSettings } from '@/src/context/waterfall_context';
import Ionicons from '@expo/vector-icons/Ionicons';

const HIGHLIGHT_OPEN = '<em>';
const HIGHLIGHT_CLOSE = '</em>';

type TabValue = 'posts' | 'users';

type HighlightedTextProps = {
  value: string;
  style?: TextStyle;
  highlightStyle?: TextStyle;
};

const HighlightedText: React.FC<HighlightedTextProps> = ({ value, style, highlightStyle }) => {
  const segments = useMemo(() => {
    const rawParts = value.split(/(<em>|<\/em>)/i);
    const nodes: { text: string; highlighted: boolean }[] = [];
    let active = false;
    for (const part of rawParts) {
      if (!part) continue;
      if (part.toLowerCase() === HIGHLIGHT_OPEN) {
        active = true;
        continue;
      }
      if (part.toLowerCase() === HIGHLIGHT_CLOSE) {
        active = false;
        continue;
      }
      nodes.push({ text: part, highlighted: active });
    }
    return nodes;
  }, [value]);

  return (
    <Text style={style} numberOfLines={3} ellipsizeMode="tail">
      {segments.map((segment, index) => (
        <Text key={`segment-${index}`} style={segment.highlighted ? highlightStyle : undefined}>
          {segment.text}
        </Text>
      ))}
    </Text>
  );
};

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = usePaperTheme();
  const bp = useBreakpoint();
  const { minHeight, maxHeight } = useWaterfallSettings();

  const horizontalPadding = pickByBreakpoint(bp, { base: 16, sm: 18, md: 20, lg: 24, xl: 24 });
  const spacing = pickByBreakpoint(bp, { base: 14, sm: 16, md: 18, lg: 20, xl: 24 });
  const gridGap = pickByBreakpoint(bp, { base: 6, sm: 8, md: 10, lg: 14, xl: 18 });
  const gridVerticalGap = gridGap + 8;

  const [keyword, setKeyword] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('posts');
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handlePostPress = useCallback(
    (postId: string) => {
      const href: Href = { pathname: '/post/[postId]', params: { postId } } as const;
      router.push(href);
    },
    [router]
  );

  const handleUserPress = useCallback(
    (userId: string) => {
      router.push({ pathname: '/user/[userId]', params: { userId } });
    },
    [router]
  );

  const handleSearch = useCallback(async () => {
    const term = keyword.trim();
    if (!term) {
      setError('请输入搜索关键词');
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // if (activeTab === 'posts') {
      //   const { posts: result } = await searchService.searchPosts({ q: term, limit: 20 });
      //   setPosts(result);
      // } else {
      //   const { users: result } = await searchService.searchUsers({ q: term, limit: 20 });
      //   setUsers(result);
      // }
      setError('搜索功能暂未开放');
      setPosts([]);
      setUsers([]);
      setHasSearched(true);
    } catch (e) {
      const message = (e as Error)?.message ?? '搜索失败，请稍后重试';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword]);

  const handleTabChange = useCallback(
    (value: TabValue) => {
      setActiveTab(value);
      if (hasSearched && keyword.trim()) {
        // 切换标签后自动触发一次新的搜索
        setTimeout(() => {
          handleSearch();
        }, 0);
      }
    },
    [handleSearch, hasSearched, keyword]
  );

  const highlightStyle = useMemo(
    () => ({ color: theme.colors.primary, fontWeight: '600' as const }),
    [theme.colors.primary]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ==================== 顶部导航栏 ==================== */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        {/* 第一行：返回 + 搜索框 + 搜索按钮 */}
        <View style={styles.topBarContent}>
          {/* 左侧：返回按钮 */}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
          </Pressable>

          {/* 中间：搜索框 */}
          <View
            style={[
              styles.searchInputWrapper,
              {
                backgroundColor: 'transparent',
                borderColor: searchFocused ? theme.colors.primary : 'transparent',
                borderWidth: searchFocused ? 2 : 0,
                borderRadius: 8,
                paddingVertical: searchFocused ? 12 : 10,
                paddingHorizontal: searchFocused ? 14 : 12,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={theme.colors.onSurfaceVariant} />
            <RNTextInput
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={handleSearch}
              placeholder="搜索美食或用户"
              placeholderTextColor={theme.colors.outline}
              returnKeyType="search"
              autoCapitalize="none"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={[
                styles.searchInput,
                {
                  color: theme.colors.onSurface,
                  fontSize: 16,
                  lineHeight: 26,
                  paddingVertical: 0,
                  backgroundColor: 'transparent',
                },
                Platform.OS === 'web' && ({ outlineStyle: 'none', borderWidth: 0 } as any),
              ]}
            />
            {keyword.trim() ? (
              <Pressable onPress={() => setKeyword('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
              </Pressable>
            ) : null}
          </View>

          {/* 右侧：搜索按钮 */}
          <Pressable
            style={[styles.searchBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size={14} color={theme.colors.onPrimary} />
            ) : (
              <Text style={[styles.searchBtnText, { color: theme.colors.onPrimary }]}>搜索</Text>
            )}
          </Pressable>
        </View>

        {/* 第二行：帖子/用户选择器 */}
        <View style={styles.tabRow}>
          <View style={[styles.segmentedControl, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Pressable
              style={[
                styles.segmentBtn,
                activeTab === 'posts' && { backgroundColor: theme.colors.surface },
              ]}
              onPress={() => handleTabChange('posts')}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: activeTab === 'posts' ? theme.colors.primary : theme.colors.onSurfaceVariant,
                    fontWeight: activeTab === 'posts' ? '600' : '400',
                  },
                ]}
              >
                帖子
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentBtn,
                activeTab === 'users' && { backgroundColor: theme.colors.surface },
              ]}
              onPress={() => handleTabChange('users')}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: activeTab === 'users' ? theme.colors.primary : theme.colors.onSurfaceVariant,
                    fontWeight: activeTab === 'users' ? '600' : '400',
                  },
                ]}
              >
                用户
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ==================== 内容区域 ==================== */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ 
          paddingHorizontal: horizontalPadding, 
          paddingBottom: insets.bottom + spacing * 2,
          paddingTop: spacing,
        }}
      >
        {/* 错误提示 */}
        {error ? (
          <View style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]}>
            <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
            <Text style={{ color: theme.colors.error, flex: 1, fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        {/* 搜索结果 */}
        {!loading && hasSearched && !error ? (
          activeTab === 'posts' ? (
            posts.length ? (
              <Masonry
                data={posts}
                columns={{ base: 2, md: 2, lg: 3, xl: 4 }}
                gap={gridGap}
                verticalGap={gridVerticalGap}
                keyExtractor={(item) => item.id}
                getItemHeight={(item) => estimatePostCardHeight(item, minHeight, maxHeight)}
                renderItem={(item) => (
                  <PostCard
                    post={item}
                    onPress={handlePostPress}
                    appearance="flat"
                    footer={
                      item.highlight?.title || item.highlight?.content ? (
                        <View style={styles.highlightFooter}>
                          {item.highlight?.title ? (
                            <HighlightedText
                              value={item.highlight.title}
                              highlightStyle={highlightStyle}
                              style={styles.highlightTitle}
                            />
                          ) : null}
                          {item.highlight?.content ? (
                            <HighlightedText
                              value={item.highlight.content}
                              highlightStyle={highlightStyle}
                              style={styles.highlightBody}
                            />
                          ) : null}
                        </View>
                      ) : null
                    }
                  />
                )}
              />
            ) : (
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>未找到相关帖子</Text>
            )
          ) : users.length ? (
            <View style={{ gap: spacing }}>
              {users.map((user) => (
                <Pressable key={user.id} onPress={() => handleUserPress(user.id)}>
                  <Card mode="outlined">
                    <Card.Title
                      title={user.name}
                      subtitle={user.bio ?? ''}
                      left={(props) => (
                          user.avatar_url ? (
                            <Avatar.Image {...props} source={{ uri: user.avatar_url }} />
                          ) : (
                            <Avatar.Text {...props} label={user.name?.slice(0, 1) || '?'} />
                          )
                      )}
                    />
                    <Card.Content>
                      <Text variant="bodySmall" style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>
                        帖子：{user.stats?.post_count ?? 0} · 粉丝：{user.stats?.follower_count ?? 0}
                      </Text>
                    </Card.Content>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>未找到相关用户</Text>
          )
        ) : null}

        {/* 未搜索时的提示 */}
        {!hasSearched && !loading && !error ? (
          <View style={styles.hintContainer}>
            <Ionicons name="search-outline" size={48} color={theme.colors.outlineVariant} />
            <Text style={[styles.hintText, { color: theme.colors.onSurfaceVariant }]}>
              输入关键词搜索美食或用户
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ==================== 顶部导航栏 ====================
  topBar: {
    borderBottomWidth: 0,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  searchBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ==================== 分段选择器 ====================
  tabRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 14,
  },

  // ==================== 错误提示 ====================
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
  },

  // ==================== 空状态/提示 ====================
  hintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  hintText: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
  },

  // ==================== 搜索结果 ====================
  highlightFooter: {
    gap: 6,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  highlightBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaText: {
    // color is set dynamically
  },
});
