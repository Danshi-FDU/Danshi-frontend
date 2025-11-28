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

  const horizontalPadding = pickByBreakpoint(bp, { base: 16, sm: 18, md: 20, lg: 24, xl: 24 });
  const spacing = pickByBreakpoint(bp, { base: 14, sm: 16, md: 18, lg: 20, xl: 24 });
  const gridGap = pickByBreakpoint(bp, { base: 6, sm: 8, md: 10, lg: 14, xl: 18 });
  const gridVerticalGap = gridGap + 8;

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

  const headerHeight = pickByBreakpoint(bp, { base: 48, sm: 52, md: 56, lg: 60, xl: 64 });
  const headerTitleStyle = useMemo(
    () => ({
      fontSize: pickByBreakpoint(bp, { base: 18, sm: 18, md: 20, lg: 20, xl: 22 }),
      fontWeight: '600' as const,
    }),
    [bp]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header statusBarHeight={insets.top} style={{ height: headerHeight }} mode="center-aligned">
        <Appbar.BackAction onPress={() => router.back()} accessibilityLabel="返回" />
        <Appbar.Content title="搜索" titleStyle={headerTitleStyle} />
      </Appbar.Header>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + spacing * 2 }}
      >
        <View style={{ paddingTop: spacing, gap: spacing }}>
          <TextInput
            mode="flat"
            value={keyword}
            onChangeText={(text) => setKeyword(text)}
            onSubmitEditing={handleSearch}
            placeholder="搜索美食或用户"
            autoCapitalize="none"
            returnKeyType="search"
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: 12,
              marginBottom: 14,
            }}
            underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            left={
              <TextInput.Icon
                icon="magnify"
                color={theme.colors.onSurfaceVariant}
                forceTextInputFocus={false}
              />
            }
            right={
              keyword.trim() ? (
                <TextInput.Icon
                  icon="close-circle"
                  onPress={() => setKeyword('')}
                  forceTextInputFocus={false}
                />
              ) : undefined
            }
          />
          <SegmentedButtons
            value={activeTab}
            onValueChange={(value) => handleTabChange(value)}
            buttons={[
              { value: 'posts', label: '帖子' },
              { value: 'users', label: '用户' },
            ]}
            density="medium"
            style={{ marginBottom: 14 }}
          />
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
});
