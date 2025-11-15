import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, ViewStyle } from 'react-native';
import { Masonry } from '@/src/components/md3/masonry';
import { useWaterfallSettings } from '@/src/context/waterfall_context';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import {
  Appbar,
  Text,
  useTheme as usePaperTheme,
  ActivityIndicator,
  Card,
  Chip,
  SegmentedButtons,
  Button,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { postsService } from '@/src/services/posts_service';
import type { Post } from '@/src/models/Post';
import type { ShareType } from '@/src/models/Post';
import { configService, type ExploreConfig, type PostTypeSubType } from '@/src/services/config_service';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { BottomSheet } from '@/src/components/overlays/bottom_sheet';

type LoaderState = 'idle' | 'initial' | 'refresh';

type PostCardProps = {
  post: Post;
  onPress: (postId: string) => void;
  style?: ViewStyle;
};

const TYPE_LABEL: Record<Post['postType'], string> = {
  share: '分享',
  seeking: '求助',
  companion: '拼单/搭子',
};

const SHARE_LABEL: Record<'recommend' | 'warning', string> = {
  recommend: '推荐',
  warning: '避雷',
};

type SortValue = 'latest' | 'hot' | 'trending' | 'price';

type ExploreFilters = {
  postType: Post['postType'] | 'all';
  shareType: ShareType | 'all';
  category: 'food' | 'recipe' | 'all';
  sortBy: SortValue;
  canteenName?: string;
};

type ActiveFilterChip = {
  key: string;
  label: string;
  onClear: () => void;
};

const INITIAL_FILTERS: ExploreFilters = {
  postType: 'all',
  shareType: 'all',
  category: 'all',
  sortBy: 'trending',
};

const SORT_OPTIONS: Array<{ value: SortValue; label: string; description: string }> = [
  { value: 'trending', label: '趋势', description: '综合热度并考虑时间衰减' },
  { value: 'hot', label: '热度', description: '点赞、收藏和浏览更高' },
  { value: 'latest', label: '最新', description: '按发布时间倒序' },
  { value: 'price', label: '价格', description: '分享帖按价格排序' },
];

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

const PostCard: React.FC<PostCardProps> = ({ post, onPress, style }) => {
  const theme = usePaperTheme();
  const firstImage = post.images?.[0];
  const hasMeta = Boolean(post.author?.name || post.createdAt);
  const hasStats = Boolean(
    typeof post.stats?.likeCount === 'number' ||
      typeof post.stats?.favoriteCount === 'number' ||
      typeof post.stats?.commentCount === 'number' ||
      typeof post.stats?.viewCount === 'number'
  );

  return (
    <Card
      mode="outlined"
      onPress={() => onPress(post.id)}
      style={[styles.card, style]}
      accessibilityLabel={`查看帖子 ${post.title}`}
    >
      {firstImage ? <Card.Cover source={{ uri: firstImage }} style={styles.cardCover} /> : null}
      <Card.Content style={styles.cardContent}>
        <View style={styles.tagRow}>
          <Chip compact selected>{TYPE_LABEL[post.postType]}</Chip>
          {post.postType === 'share' && post.shareType ? (
            <Chip compact mode="outlined">{SHARE_LABEL[post.shareType]}</Chip>
          ) : null}
          <Chip compact mode="outlined">{post.category === 'recipe' ? '食谱' : '美食'}</Chip>
          {post.canteen ? (
            <Chip compact mode="outlined">{post.canteen}</Chip>
          ) : null}
        </View>
        <Text variant="titleMedium" numberOfLines={2} style={styles.cardTitle}>
          {post.title}
        </Text>
        <Text
          variant="bodyMedium"
          numberOfLines={4}
          style={[styles.cardBody, { color: theme.colors.onSurfaceVariant }]}
        >
          {post.content}
        </Text>
        {post.tags?.length ? (
          <View style={styles.tagsWrapper}>
            {post.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} compact mode="outlined">
                #{tag}
              </Chip>
            ))}
            {post.tags.length > 3 ? <Chip compact mode="outlined">+{post.tags.length - 3}</Chip> : null}
          </View>
        ) : null}
        {post.postType === 'share' ? (
          <View style={styles.metaSection}>
            {typeof post.price === 'number' ? (
              <Text variant="labelLarge" style={styles.priceText}>
                ￥{post.price.toFixed(2)}
              </Text>
            ) : null}
            <View style={styles.metaLine}>
              {post.cuisine ? (
                <Text variant="bodySmall" style={[styles.metaChipText, { color: theme.colors.onSurfaceVariant }] }>
                  菜系：{post.cuisine}
                </Text>
              ) : null}
              {post.flavors?.length ? (
                <View style={styles.inlineChips}>
                  {post.flavors.slice(0, 3).map((flavor) => (
                    <Chip key={flavor} compact mode="outlined">
                      {flavor}
                    </Chip>
                  ))}
                  {post.flavors.length > 3 ? (
                    <Chip compact mode="outlined">+{post.flavors.length - 3}</Chip>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
        {post.postType === 'seeking' ? (
          <View style={styles.metaSection}>
            {post.budgetRange ? (
              <Text variant="bodySmall" style={[styles.metaChipText, { color: theme.colors.onSurfaceVariant }] }>
                预算：￥{post.budgetRange.min.toFixed(2)} - ￥{post.budgetRange.max.toFixed(2)}
              </Text>
            ) : null}
            {post.preferences?.preferFlavors?.length ? (
              <Text variant="bodySmall" style={[styles.metaChipText, { color: theme.colors.onSurfaceVariant }] }>
                喜欢：{post.preferences.preferFlavors.join('、')}
              </Text>
            ) : null}
            {post.preferences?.avoidFlavors?.length ? (
              <Text variant="bodySmall" style={[styles.metaChipText, { color: theme.colors.onSurfaceVariant }] }>
                忌口：{post.preferences.avoidFlavors.join('、')}
              </Text>
            ) : null}
          </View>
        ) : null}
        {post.postType === 'companion' ? (
          <View style={styles.metaSection}>
            <View style={styles.metaLine}>
              {post.meetingInfo?.status ? (
                <Chip
                  compact
                  mode="outlined"
                  style={
                    post.meetingInfo.status === 'open'
                      ? styles.statusOpen
                      : post.meetingInfo.status === 'full'
                      ? styles.statusFull
                      : styles.statusClosed
                  }
                >
                  {post.meetingInfo.status === 'open'
                    ? '招募中'
                    : post.meetingInfo.status === 'full'
                    ? '已满员'
                    : '已结束'}
                </Chip>
              ) : null}
              {typeof post.meetingInfo?.maxPeople === 'number' ? (
                <Text variant="bodySmall" style={[styles.metaChipText, { color: theme.colors.onSurfaceVariant }] }>
                  人数：{post.meetingInfo.currentPeople ?? 0}/{post.meetingInfo.maxPeople}
                </Text>
              ) : null}
            </View>
            {post.meetingInfo?.date || post.meetingInfo?.time ? (
              <Text variant="bodySmall" style={[styles.metaChipText, { color: theme.colors.onSurfaceVariant }] }>
                时间：{[post.meetingInfo?.date, post.meetingInfo?.time].filter(Boolean).join(' ')}
              </Text>
            ) : null}
            {post.meetingInfo?.location ? (
              <Text variant="bodySmall" style={[styles.metaChipText, { color: theme.colors.onSurfaceVariant }] }>
                地点：{post.meetingInfo.location}
              </Text>
            ) : null}
          </View>
        ) : null}
        {hasMeta ? (
          <Text variant="labelMedium" style={[styles.metaText, { color: theme.colors.onSurfaceVariant }] }>
            {post.author?.name ? `${post.author.name} · ` : ''}
            {formatDate(post.createdAt)}
          </Text>
        ) : null}
        {hasStats ? (
          <Text variant="labelMedium" style={[styles.statsText, { color: theme.colors.onSurfaceVariant }] }>
            👍 {post.stats?.likeCount ?? 0} · ⭐ {post.stats?.favoriteCount ?? 0} · 💬 {post.stats?.commentCount ?? 0} · 👀 {post.stats?.viewCount ?? 0}
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );
};

export default function ExploreScreen() {
  const { minHeight, maxHeight } = useWaterfallSettings();
  const bp = useBreakpoint();
  const gap = pickByBreakpoint(bp, { base: 8, sm: 10, md: 12, lg: 16, xl: 20 });
  const insets = useSafeAreaInsets();
  const pTheme = usePaperTheme();

  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaderState, setLoaderState] = useState<LoaderState>('initial');
  const [filters, setFilters] = useState<ExploreFilters>({ ...INITIAL_FILTERS });
  const [config, setConfig] = useState<ExploreConfig>({ postTypes: [], canteens: [], cuisines: [], flavors: [] });
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [filtersSheetVisible, setFiltersSheetVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;
    configService
      .getExploreConfig()
      .then((data) => {
        if (!isMounted) return;
        setConfig(data);
      })
      .catch((e) => {
        if (!isMounted) return;
        const message = (e as Error)?.message ?? '配置加载失败，已使用内置数据';
        setConfigError(message);
      })
      .finally(() => {
        if (!isMounted) return;
        setConfigLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const requestFilters = useMemo(() => {
    const payload: Record<string, unknown> = {
      limit: 30,
      sortBy: filters.sortBy,
    };
    if (filters.postType !== 'all') payload.postType = filters.postType;
    if (filters.postType === 'share' && filters.shareType !== 'all') payload.shareType = filters.shareType;
    if (filters.category !== 'all') payload.category = filters.category;
    if (filters.canteenName) payload.canteen = filters.canteenName;
    return payload;
  }, [filters]);

  const fetchPosts = useCallback(
    async (mode: LoaderState = 'initial', overrides?: Record<string, unknown>) => {
      setLoaderState(mode);
      if (mode !== 'refresh') setError(null);
      try {
        const params = { ...requestFilters, ...(overrides ?? {}) };
        const { posts: result } = await postsService.list(params);
        setPosts(result);
      } catch (e) {
        const message = (e as Error)?.message ?? '加载帖子失败';
        setError(message);
      } finally {
        setLoaderState('idle');
      }
    },
    [requestFilters]
  );

  useEffect(() => {
    fetchPosts('initial');
  }, [fetchPosts]);

  const refreshing = loaderState === 'refresh';
  const isInitialLoading = loaderState === 'initial';

  const handleRefresh = useCallback(() => {
    fetchPosts('refresh');
  }, [fetchPosts]);

  const estimateHeight = useCallback(
    (post: Post) => {
      const base = post.images?.length ? 220 : 160;
      const extra = Math.min(160, (post.content?.length ?? 0) * 0.4);
      const raw = base + extra;
      return Math.max(minHeight, Math.min(maxHeight, raw));
    },
    [maxHeight, minHeight]
  );

  const onPress = useCallback(
    (postId: string) => {
      const href: Href = { pathname: '/post/[postId]', params: { postId } } as const;
      router.push(href);
    },
    [router]
  );

  const content = useMemo(() => posts, [posts]);
  const postTypeOptions = useMemo(() => {
    if (!config.postTypes.length) {
      return [{ value: 'all' as const, label: '全部类型', description: '推荐最新趋势' }];
    }
    return [
      { value: 'all' as const, label: '全部类型', description: '推荐最新趋势' },
      ...config.postTypes.map((item) => ({
        value: item.type,
        label: `${item.icon ?? ''} ${item.name}`.trim(),
        description: item.description ?? '',
      })),
    ];
  }, [config.postTypes]);

  const shareSubTypes = useMemo<PostTypeSubType[]>(() => {
    const shareConfig = config.postTypes.find((item) => item.type === 'share');
    return shareConfig?.subTypes ?? [];
  }, [config.postTypes]);

  const selectedCanteen = useMemo(
    () => config.canteens.find((item) => item.name === filters.canteenName),
    [config.canteens, filters.canteenName]
  );

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.postType !== 'all') {
      const label = postTypeOptions.find((item) => item.value === filters.postType)?.label ?? '自定义';
      chips.push({
        key: 'postType',
        label: `类型·${label.replace(/\s+/g, ' ')}`.trim(),
        onClear: () => setFilters((prev) => ({ ...prev, postType: 'all', shareType: 'all' })),
      });
    }
    if (filters.postType === 'share' && filters.shareType !== 'all') {
      const label = shareSubTypes.find((item) => item.value === filters.shareType)?.label ?? '分享';
      chips.push({
        key: 'shareType',
        label: `分享·${label}`,
        onClear: () => setFilters((prev) => ({ ...prev, shareType: 'all' })),
      });
    }
    if (filters.category !== 'all') {
      chips.push({
        key: 'category',
        label: `分区·${filters.category === 'food' ? '美食' : '食谱'}`,
        onClear: () => setFilters((prev) => ({ ...prev, category: 'all' })),
      });
    }
    if (filters.canteenName) {
      const label = selectedCanteen?.campus ? `${filters.canteenName}·${selectedCanteen.campus}` : filters.canteenName;
      chips.push({
        key: 'canteen',
        label: `食堂·${label}`,
        onClear: () => setFilters((prev) => ({ ...prev, canteenName: undefined })),
      });
    }
    if (filters.sortBy !== 'trending') {
      const label = SORT_OPTIONS.find((item) => item.value === filters.sortBy)?.label ?? '排序';
      chips.push({
        key: 'sortBy',
        label: `排序·${label}`,
        onClear: () => setFilters((prev) => ({ ...prev, sortBy: 'trending' })),
      });
    }
    return chips;
  }, [filters, postTypeOptions, selectedCanteen, setFilters, shareSubTypes]);

  const hasAnyFilters = activeFilterChips.length > 0;

  const resetFilters = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS });
  }, []);

  useEffect(() => {
    if (filters.postType !== 'share' && filters.sortBy === 'price') {
      setFilters((prev) => ({ ...prev, sortBy: 'trending' }));
    }
  }, [filters.postType, filters.sortBy]);

  const sortHintText = useMemo(() => {
    if (filters.sortBy === 'price') {
      return filters.postType === 'share' ? '按价格从低到高排序，适用于美食分享帖子' : '价格排序仅适用于美食分享帖子';
    }
    return SORT_OPTIONS.find((item) => item.value === filters.sortBy)?.description ?? '';
  }, [filters.postType, filters.sortBy]);

  return (
    <View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top}>
        <Appbar.Content title="发现帖子" />
        <Appbar.Action
          icon="refresh"
          onPress={() => fetchPosts('initial')}
          disabled={isInitialLoading || refreshing}
          accessibilityLabel="刷新帖子"
        />
      </Appbar.Header>
      <ScrollView
        style={{ backgroundColor: pTheme.colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.hero}>
          <Text variant="headlineSmall" style={styles.heroTitle}>
            探索旦食社区
          </Text>
          <Text variant="bodyMedium" style={[styles.heroSubtitle, { color: pTheme.colors.onSurfaceVariant }] }>
            根据帖子类型、排序与食堂分类筛选，快速找到最适合你的分享、求助和搭子信息。
          </Text>
        </View>

        <View style={styles.filterToggleRow}>
          <Button
            mode="outlined"
            icon="tune-variant"
            onPress={() => setFiltersSheetVisible(true)}
          >
            打开筛选
          </Button>
          {hasAnyFilters ? (
            <Button mode="text" onPress={resetFilters}>
              重置
            </Button>
          ) : null}
        </View>

        {activeFilterChips.length ? (
          <View style={styles.activeFiltersRow}>
            {activeFilterChips.map((chip) => (
              <Chip key={chip.key} mode="outlined" onClose={chip.onClear}>
                {chip.label}
              </Chip>
            ))}
          </View>
        ) : null}

        {isInitialLoading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator />
            <Text style={[styles.loadingText, { color: pTheme.colors.onSurfaceVariant }]}>加载中…</Text>
          </View>
        ) : null}

        {error && !isInitialLoading ? (
          <View style={styles.errorWrapper}>
            <Text style={[styles.errorText, { color: pTheme.colors.error }]}>{error}</Text>
            <Chip icon="refresh" mode="outlined" onPress={() => fetchPosts('initial')}>
              重新加载
            </Chip>
          </View>
        ) : null}

        {!isInitialLoading && !content.length && !error ? (
          <View style={styles.emptyWrapper}>
            <Text variant="bodyLarge">暂无帖子</Text>
            <Text variant="bodyMedium" style={[styles.emptyText, { color: pTheme.colors.onSurfaceVariant }]}>
              打开发布页分享你的第一条动态吧～
            </Text>
          </View>
        ) : null}

        {content.length ? (
          <Masonry
            data={content}
            columns={{ base: 1, md: 2, lg: 3 }}
            gap={gap}
            getItemHeight={(item) => estimateHeight(item)}
            keyExtractor={(item) => item.id}
            renderItem={(item) => <PostCard post={item} onPress={onPress} />}
          />
        ) : null}
      </ScrollView>
      <BottomSheet visible={filtersSheetVisible} onClose={() => setFiltersSheetVisible(false)} height={520}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
        >
          <View style={styles.sheetHeader}>
            <Text variant="titleMedium">筛选帖子</Text>
            <Text variant="bodySmall" style={{ color: pTheme.colors.onSurfaceVariant }}>
              选择类型、排序与食堂筛选，集中管理所有筛选条件。
            </Text>
          </View>

          <View style={styles.filterSection}>
            <Text variant="labelLarge" style={styles.filterTitle}>
              帖子类型
            </Text>
            <View style={styles.chipsRow}>
              {postTypeOptions.map((option) => (
                <Chip
                  key={option.value}
                  selected={filters.postType === option.value}
                  onPress={() =>
                    setFilters((prev) => ({
                      ...prev,
                      postType: option.value,
                      shareType: option.value === 'share' ? prev.shareType : 'all',
                    }))
                  }
                  mode={filters.postType === option.value ? 'flat' : 'outlined'}
                >
                  {option.label}
                </Chip>
              ))}
            </View>
            {filters.postType === 'share' && shareSubTypes.length ? (
              <View style={styles.subFilterRow}>
                {shareSubTypes.map((item) => (
                  <Chip
                    key={item.value}
                    selected={filters.shareType === item.value}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        shareType: prev.shareType === item.value ? 'all' : item.value,
                      }))
                    }
                    mode={filters.shareType === item.value ? 'flat' : 'outlined'}
                    compact
                  >
                    {`${item.icon ?? ''} ${item.label}`.trim()}
                  </Chip>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.filterSection}>
            <Text variant="labelLarge" style={styles.filterTitle}>
              排序
            </Text>
            <SegmentedButtons
              value={filters.sortBy}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  sortBy: (value as SortValue) ?? prev.sortBy,
                }))
              }
              buttons={SORT_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
                style: styles.segmentButton,
                disabled: option.value === 'price' && filters.postType !== 'share',
              }))}
            />
            <Text variant="bodySmall" style={[styles.sortHint, { color: pTheme.colors.onSurfaceVariant }] }>
              {sortHintText}
            </Text>
          </View>

          <View style={styles.filterSection}>
            <Text variant="labelLarge" style={styles.filterTitle}>
              进阶筛选
            </Text>
            <View style={styles.chipsRow}>
              <Chip
                selected={!filters.canteenName}
                onPress={() => setFilters((prev) => ({ ...prev, canteenName: undefined }))}
                mode={!filters.canteenName ? 'flat' : 'outlined'}
              >
                全部食堂
              </Chip>
              {config.canteens.map((item) => (
                <Chip
                  key={item.id}
                  selected={filters.canteenName === item.name}
                  onPress={() => setFilters((prev) => ({ ...prev, canteenName: item.name }))}
                  mode={filters.canteenName === item.name ? 'flat' : 'outlined'}
                >
                  {item.campus ? `${item.name}（${item.campus}）` : item.name}
                </Chip>
              ))}
            </View>

            <View style={styles.subFilterRow}>
              {[
                { label: '全部分区', value: 'all' as const },
                { label: '美食', value: 'food' as const },
                { label: '食谱', value: 'recipe' as const },
              ].map((option) => (
                <Chip
                  key={option.value}
                  selected={filters.category === option.value}
                  onPress={() => setFilters((prev) => ({ ...prev, category: option.value }))}
                  mode={filters.category === option.value ? 'flat' : 'outlined'}
                >
                  {option.label}
                </Chip>
              ))}
            </View>

            {configLoading ? (
              <Text variant="bodySmall" style={[styles.helperText, { color: pTheme.colors.onSurfaceVariant }] }>
                正在加载配置数据…
              </Text>
            ) : null}
            {configError ? (
              <Text variant="bodySmall" style={[styles.helperText, { color: pTheme.colors.error }] }>
                {configError}
              </Text>
            ) : null}
          </View>

          <View style={styles.sheetActions}>
            <Button
              mode="outlined"
              icon="refresh"
              onPress={resetFilters}
              disabled={!hasAnyFilters}
            >
              重置筛选
            </Button>
            <Button mode="contained" onPress={() => setFiltersSheetVisible(false)}>
              完成
            </Button>
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardCover: {
    height: 180,
  },
  cardContent: {
    gap: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardTitle: {
    fontWeight: '600',
  },
  cardBody: {
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaSection: {
    gap: 6,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaText: {
  },
  metaChipText: {},
  inlineChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  priceText: {
    fontWeight: '700',
  },
  statsText: {
  },
  statusOpen: {
    borderColor: '#22c55e',
  },
  statusFull: {
    borderColor: '#f59e0b',
  },
  statusClosed: {
    borderColor: '#9ca3af',
  },
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 48,
  },
  loadingText: {},
  errorWrapper: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  errorText: {},
  emptyWrapper: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 32,
  },
  emptyText: {},
  hero: {
    gap: 8,
  },
  heroTitle: {
    fontWeight: '700',
  },
  heroSubtitle: {},
  filterToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterSection: {
    gap: 12,
  },
  filterTitle: {
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentButton: {
    minWidth: 0,
  },
  sortHint: {},
  helperText: {},
  sheetContent: {
    paddingBottom: 24,
    gap: 16,
  },
  sheetHeader: {
    gap: 4,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
});
