import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable, TextInput as RNTextInput, Platform, Image, TextStyle } from 'react-native';
import {
  ActivityIndicator,
  Text,
  useTheme as usePaperTheme,
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

type TabValue = 'posts' | 'users';

// ==================== 高亮文本组件（仅加粗，不变色）====================
const HIGHLIGHT_OPEN = '<em>';
const HIGHLIGHT_CLOSE = '</em>';

type HighlightedTextProps = {
  value: string;
  style?: TextStyle;
  numberOfLines?: number;
};

const HighlightedText: React.FC<HighlightedTextProps> = ({ value, style, numberOfLines = 2 }) => {
  const segments = useMemo(() => {
    const rawParts = value.split(/(<em>|<\/em>)/i);
    const nodes: { text: string; bold: boolean }[] = [];
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
      nodes.push({ text: part, bold: active });
    }
    return nodes;
  }, [value]);

  return (
    <Text style={style} numberOfLines={numberOfLines} ellipsizeMode="tail">
      {segments.map((segment, index) => (
        <Text key={`seg-${index}`} style={segment.bold ? { fontWeight: '700' } : undefined}>
          {segment.text}
        </Text>
      ))}
    </Text>
  );
};

// ==================== 智能摘要：截取包含关键词的片段 ====================
function extractMatchSnippet(highlightedContent: string | undefined, maxLength: number = 80): string | null {
  if (!highlightedContent) return null;
  
  // 查找 <em> 标签的位置
  const emStart = highlightedContent.toLowerCase().indexOf('<em>');
  if (emStart === -1) return null;
  
  // 计算截取的起始位置（关键词前后各留一些上下文）
  const contextBefore = 20;
  const start = Math.max(0, emStart - contextBefore);
  
  // 截取片段
  let snippet = highlightedContent.slice(start, start + maxLength);
  
  // 如果不是从开头截取，添加省略号
  if (start > 0) {
    snippet = '...' + snippet;
  }
  
  // 如果不是到结尾，添加省略号
  if (start + maxLength < highlightedContent.length) {
    snippet = snippet + '...';
  }
  
  return snippet;
}

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

  const doSearch = useCallback(async (tab: TabValue, term: string) => {
    if (!term) {
      setError('请输入搜索关键词');
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (tab === 'posts') {
        const { posts: result } = await searchService.searchPosts({ q: term, limit: 20 });
        setPosts(result);
        setUsers([]);
      } else {
        const { users: result } = await searchService.searchUsers({ q: term, limit: 20 });
        setUsers(result);
        setPosts([]);
      }
      setHasSearched(true);
    } catch (e) {
      const message = (e as Error)?.message ?? '搜索失败，请稍后重试';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    doSearch(activeTab, keyword.trim());
  }, [activeTab, keyword, doSearch]);

  const handleTabChange = useCallback(
    (value: TabValue) => {
      setActiveTab(value);
      const term = keyword.trim();
      if (hasSearched && term) {
        // 切换标签后使用新的 tab 值重新搜索
        doSearch(value, term);
      }
    },
    [doSearch, hasSearched, keyword]
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
        {/* 第一行：返回 + 搜索框 + 搜索/取消按钮 */}
        <View style={styles.topBarContent}>
          {/* 左侧：返回按钮 */}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
          </Pressable>

          {/* 中间：搜索框 - 使用填充色背景，无边框 */}
          <View
            style={[
              styles.searchInputWrapper,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: 22,
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
              autoFocus
              selectionColor={theme.colors.primary}
              style={[
                styles.searchInput,
                {
                  color: theme.colors.onSurface,
                  fontSize: 15,
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

          {/* 右侧：纯文字按钮 */}
          <Pressable
            style={styles.textBtn}
            onPress={keyword.trim() ? handleSearch : () => router.back()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size={16} color={theme.colors.primary} />
            ) : (
              <Text style={[styles.textBtnLabel, { color: keyword.trim() ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
                {keyword.trim() ? '搜索' : '取消'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* 第二行：帖子/用户选择器 - 下划线样式 */}
        <View style={[styles.tabRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }]}>
          <Pressable
            style={styles.tabItem}
            onPress={() => handleTabChange('posts')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'posts' ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                  fontWeight: activeTab === 'posts' ? '600' : '400',
                },
              ]}
            >
              帖子
            </Text>
            {activeTab === 'posts' && (
              <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
            )}
          </Pressable>
          <Pressable
            style={styles.tabItem}
            onPress={() => handleTabChange('users')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'users' ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                  fontWeight: activeTab === 'users' ? '600' : '400',
                },
              ]}
            >
              用户
            </Text>
            {activeTab === 'users' && (
              <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
            )}
          </Pressable>
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
                renderItem={(item) => {
                  // 智能摘要：如果关键词在正文中匹配，显示摘要
                  const snippet = extractMatchSnippet(item.highlight?.content);
                  const showSnippet = snippet && !item.highlight?.title; // 只有标题没匹配时才显示正文摘要
                  
                  return (
                    <View>
                      <PostCard
                        post={item}
                        onPress={handlePostPress}
                        appearance="flat"
                      />
                      {showSnippet && (
                        <View style={[styles.snippetContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <HighlightedText
                            value={snippet}
                            style={[styles.snippetText, { color: theme.colors.onSurfaceVariant }]}
                            numberOfLines={2}
                          />
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            ) : (
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>未找到相关帖子</Text>
            )
          ) : users.length ? (
            <View style={styles.userList}>
              {users.map((user) => (
                <Pressable 
                  key={user.id} 
                  style={styles.userItem}
                  onPress={() => handleUserPress(user.id)}
                >
                  {/* 左侧：头像 */}
                  <View style={styles.userAvatar}>
                    {user.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <Ionicons name="person" size={20} color={theme.colors.onSurfaceVariant} />
                      </View>
                    )}
                  </View>

                  {/* 中间：用户信息 */}
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                      {user.name}
                    </Text>
                    <Text style={[styles.userMeta, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                      帖子 {user.stats?.post_count ?? 0} · 粉丝 {user.stats?.follower_count ?? 0}
                    </Text>
                  </View>

                  {/* 右侧：关注按钮 */}
                  <Pressable 
                    style={[
                      styles.followBtn,
                      user.is_following 
                        ? { backgroundColor: theme.colors.surfaceVariant }
                        : { borderWidth: 1, borderColor: theme.colors.primary }
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      // TODO: 实现关注/取关逻辑
                    }}
                  >
                    <Text 
                      style={[
                        styles.followBtnText, 
                        { color: user.is_following ? theme.colors.onSurfaceVariant : theme.colors.primary }
                      ]}
                    >
                      {user.is_following ? '已关注' : '关注'}
                    </Text>
                  </Pressable>
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
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  textBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  textBtnLabel: {
    fontSize: 15,
    fontWeight: '500',
  },

  // ==================== Tab 切换 ====================
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'relative',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
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

  // ==================== 用户列表 ====================
  userList: {
    gap: 0,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  userMeta: {
    fontSize: 13,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ==================== 搜索摘要 ====================
  snippetContainer: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  snippetText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
