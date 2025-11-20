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
  Chip,
  SegmentedButtons,
  Button,
  IconButton,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { postsService } from '@/src/services/posts_service';
import type { PostListFilters, SortBy } from '@/src/repositories/posts_repository';
import type { Post } from '@/src/models/Post';
import type { ShareType } from '@/src/models/Post';
import { configService, type ExploreConfig, type PostTypeSubType } from '@/src/services/config_service';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { BottomSheet } from '@/src/components/overlays/bottom_sheet';
import { PostCard, estimatePostCardHeight } from '@/src/components/post_card';

type LoaderState = 'idle' | 'initial' | 'refresh';

type PostCardProps = {
  post: Post;
  onPress: (postId: string) => void;
  style?: ViewStyle;
};

type SortValue = 'latest' | 'hot' | 'trending' | 'price-asc' | 'price-desc';

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
  { value: 'price-asc', label: '价格·低到高', description: '按价格从低到高排序' },
  { value: 'price-desc', label: '价格·高到低', description: '按价格从高到低排序' },
];

function sortPostsByPrice(list: Post[], direction: 'asc' | 'desc'): Post[] {
  const factor = direction === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => {
    const aPrice = a.postType === 'share' && typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
    const bPrice = b.postType === 'share' && typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
    if (aPrice === bPrice) return 0;
    return (aPrice - bPrice) * factor;
  });
}

export default function ExploreScreen() {
  const { minHeight, maxHeight } = useWaterfallSettings();
  const bp = useBreakpoint();
  const gap = pickByBreakpoint(bp, { base: 4, sm: 6, md: 8, lg: 12, xl: 16 });
  const verticalGap = gap + 6;
  const horizontalPadding = gap;
  const verticalPadding = gap;
  const headerHeight = pickByBreakpoint(bp, { base: 48, sm: 52, md: 56, lg: 60, xl: 64 });
  const headerTitleStyle = useMemo(() => ({
    fontSize: pickByBreakpoint(bp, { base: 18, sm: 18, md: 20, lg: 20, xl: 22 }),
    fontWeight: '600' as const,
  }), [bp]);
  const typeBarVerticalPadding = pickByBreakpoint(bp, { base: 3, sm: 4, md: 6, lg: 8, xl: 8 });
  const typeBarGap = pickByBreakpoint(bp, { base: 6, sm: 8, md: 10, lg: 12, xl: 14 });
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
        const rawSort: SortValue = typeof params.sortBy === 'string' ? (params.sortBy as SortValue) : filters.sortBy;
        const sortForRequest: SortBy = rawSort === 'price-asc' || rawSort === 'price-desc' ? 'price' : (rawSort as SortBy);
        const listFilters = { ...(params as Record<string, unknown>), sortBy: sortForRequest } as PostListFilters;
        const { posts: result } = await postsService.list(listFilters);
        const processed =
          rawSort === 'price-asc' || rawSort === 'price-desc'
            ? sortPostsByPrice(result, rawSort === 'price-desc' ? 'desc' : 'asc')
            : result;
        setPosts(processed);
      } catch (e) {
        const message = (e as Error)?.message ?? '加载帖子失败';
        setError(message);
      } finally {
        setLoaderState('idle');
      }
    },
    [filters.sortBy, requestFilters]
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
      return estimatePostCardHeight(post, minHeight, maxHeight);
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

  const sortHintText = useMemo(() => {
    if (filters.sortBy === 'price-asc') {
      return filters.postType === 'share' ? '按价格从低到高排序，适用于美食分享帖子' : '价格排序仅适用于美食分享帖子';
    }
    if (filters.sortBy === 'price-desc') {
      return filters.postType === 'share' ? '按价格从高到低排序，适用于美食分享帖子' : '价格排序仅适用于美食分享帖子';
    }
    return SORT_OPTIONS.find((item) => item.value === filters.sortBy)?.description ?? '';
  }, [filters.postType, filters.sortBy]);

  return (
    <View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
      <Appbar.Header
        mode="center-aligned"
        statusBarHeight={insets.top}
        style={{ height: headerHeight }}
      >
        <Appbar.Content title="社区" titleStyle={headerTitleStyle} />
        <Appbar.Action
          icon="magnify"
          onPress={() => router.push('/search')}
          accessibilityLabel="搜索帖子"
        />
      </Appbar.Header>
      <View
        style={[styles.typeBarContainer, { paddingHorizontal: horizontalPadding, paddingVertical: typeBarVerticalPadding, gap: typeBarGap }]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.typeBarScroll, { paddingRight: typeBarGap, gap: typeBarGap }]}
        >
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
              compact
              style={styles.typeBarChip}
            >
              {option.label}
            </Chip>
          ))}
        </ScrollView>
        <IconButton
          icon="tune-variant"
          onPress={() => setFiltersSheetVisible(true)}
          style={styles.typeBarFilterButton}
        />
      </View>
      <ScrollView
        style={{ backgroundColor: pTheme.colors.background }}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingTop: verticalPadding,
          paddingBottom: verticalPadding,
          gap,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[pTheme.colors.primary]}
            tintColor={pTheme.colors.primary}
          />
        }
      >
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
            columns={{ base: 2, md: 2, lg: 3, xl: 4 }}
            gap={gap}
            verticalGap={verticalGap}
            getItemHeight={(item) => estimateHeight(item)}
            keyExtractor={(item) => item.id}
            renderItem={(item) => <PostCard post={item} onPress={onPress} appearance="flat" />}
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
            <View style={styles.advancedGroup}>
              <Text
                variant="labelMedium"
                style={[styles.subSectionTitle, { color: pTheme.colors.onSurfaceVariant }]}
              >
                食堂 / 校区
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
            </View>

            <View style={styles.advancedGroup}>
              <Text
                variant="labelMedium"
                style={[styles.subSectionTitle, { color: pTheme.colors.onSurfaceVariant }]}
              >
                内容分区
              </Text>
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
  typeBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  typeBarScroll: {
    flexDirection: 'row',
  },
  typeBarChip: {
    marginRight: 0,
  },
  typeBarFilterButton: {
    margin: 0,
  },
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
  advancedGroup: {
    gap: 8,
  },
  subSectionTitle: {
    fontWeight: '600',
    fontSize: 13,
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
