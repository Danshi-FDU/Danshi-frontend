import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, TextStyle } from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Card,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
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

  const horizontalPadding = pickByBreakpoint(bp, { base: 16, sm: 18, md: 20, lg: 24, xl: 28 });
  const spacing = pickByBreakpoint(bp, { base: 12, sm: 14, md: 16, lg: 18, xl: 20 });
  const gridGap = pickByBreakpoint(bp, { base: 4, sm: 6, md: 8, lg: 12, xl: 16 });
  const gridVerticalGap = gridGap + 6;

  const [keyword, setKeyword] = useState('');
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
    (value: string) => {
      const nextTab = (value as TabValue) ?? 'posts';
      setActiveTab(nextTab);
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

  const segmentedButtons = useMemo(
    () =>
      [
        { value: 'posts' as TabValue, label: '帖子', icon: 'file-search-outline' },
        { value: 'users' as TabValue, label: '用户', icon: 'account-search-outline' },
      ].map((item) => {
        const isActive = activeTab === item.value;
        return {
          ...item,
          style: [
            styles.segmentButton,
            {
              backgroundColor: isActive ? theme.colors.primary : 'transparent',
              borderWidth: 0,
            },
          ],
          labelStyle: [
            styles.segmentLabel,
            {
              color: isActive ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
            },
          ],
          icon: item.icon,
        };
      }),
    [activeTab, theme.colors.onPrimary, theme.colors.onSurfaceVariant, theme.colors.primary]
  );

  const headerHeight = pickByBreakpoint(bp, { base: 56, sm: 58, md: 60, lg: 64, xl: 68 });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header statusBarHeight={insets.top} style={{ height: headerHeight }} mode="center-aligned">
        <Appbar.BackAction onPress={() => router.back()} accessibilityLabel="返回" />
        <Appbar.Content title="搜索" />
      </Appbar.Header>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + spacing * 2 }}
      >
        <View style={{ paddingTop: spacing, gap: spacing }}>
          <TextInput
            label="关键词"
            mode="outlined"
            value={keyword}
            onChangeText={(text) => setKeyword(text)}
            onSubmitEditing={handleSearch}
            placeholder="输入美食或用户关键词"
            autoCapitalize="none"
            returnKeyType="search"
            right={
              <TextInput.Icon
                icon="magnify"
                onPress={handleSearch}
                forceTextInputFocus={false}
              />
            }
          />
          <View style={styles.segmentedWrap}>
            <SegmentedButtons
              style={styles.segmentedContainer}
              value={activeTab}
              onValueChange={handleTabChange}
              buttons={segmentedButtons}
            />
          </View>
          {error ? <HelperText type="error">{error}</HelperText> : null}
          {loading ? (
            <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: spacing }} />
          ) : null}
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
                <Text style={styles.emptyText}>未找到相关帖子</Text>
              )
            ) : users.length ? (
              <View style={{ gap: spacing }}>
                {users.map((user) => (
                  <Card key={user.id} mode="outlined">
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
                      <Text variant="bodySmall" style={styles.metaText}>
                        帖子：{user.stats?.post_count ?? 0} · 粉丝：{user.stats?.follower_count ?? 0}
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>未找到相关用户</Text>
            )
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: '#666666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888888',
    marginTop: 24,
  },
  segmentedContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    gap: 8,
  },
  segmentedWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  segmentButton: {
    borderRadius: 16,
    backgroundColor: 'transparent',
    marginHorizontal: 4,
    borderWidth: 0,
    elevation: 0,
  },
  segmentLabel: {
    fontWeight: '600',
  },
});
