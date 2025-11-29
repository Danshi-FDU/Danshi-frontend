import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Masonry } from '@/src/components/md3/masonry';
import { useWaterfallSettings } from '@/src/context/waterfall_context';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import {
  Text,
  useTheme as usePaperTheme,
  ActivityIndicator,
  Chip,
  SegmentedButtons,
  Button,
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
import Ionicons from '@expo/vector-icons/Ionicons';

// 品牌色
const BRAND_ORANGE = '#F97316';

type LoaderState = 'idle' | 'initial' | 'refresh';

type SortValue = SortBy;

type ExploreFilters = {
  postType: Post['post_type'] | 'all';
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
  sortBy: 'latest',
};

const SORT_OPTIONS: Array<{ value: SortValue; label: string; description: string }> = [
  { value: 'trending', label: '趋势', description: '综合热度并考虑时间衰减' },
  { value: 'hot', label: '热度', description: '按互动热度排序' },
  { value: 'latest', label: '最新', description: '按发布时间倒序' },
];

const FILTERS_SUPPORTED = false;

export default function ExploreScreen() {
  const { minHeight, maxHeight } = useWaterfallSettings();
  const bp = useBreakpoint();
  // 移动端列间距极小，紧凑布局
  const gap = pickByBreakpoint(bp, { base: 4, sm: 6, md: 10, lg: 14, xl: 16 });
  const verticalGap = pickByBreakpoint(bp, { base: 4, sm: 6, md: 10, lg: 14, xl: 16 });
  const horizontalPadding = pickByBreakpoint(bp, { base: 4, sm: 6, md: 12, lg: 16, xl: 20 });
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
      limit: 20,
    };
    if (filters.sortBy !== 'latest') {
      payload.sortBy = filters.sortBy;
    }
    return payload;
  }, [filters]);

  const fetchPosts = useCallback(
    async (mode: LoaderState = 'initial', overrides?: Record<string, unknown>) => {
      setLoaderState(mode);
      if (mode !== 'refresh') setError(null);
      try {
        const params = { ...requestFilters, ...(overrides ?? {}) };
        const listFilters = { ...(params as Record<string, unknown>) } as PostListFilters;
        const { posts: result } = await postsService.list(listFilters);
        setPosts(result);
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
    if (filters.sortBy !== 'latest') {
      const label = SORT_OPTIONS.find((item) => item.value === filters.sortBy)?.label ?? '排序';
      chips.push({
        key: 'sortBy',
        label: `排序·${label}`,
        onClear: () => setFilters((prev) => ({ ...prev, sortBy: 'latest' })),
      });
    }
    return chips;
  }, [filters, postTypeOptions, selectedCanteen, setFilters, shareSubTypes]);

  const hasAnyFilters = activeFilterChips.length > 0;

  const resetFilters = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS });
  }, []);

  const sortHintText = useMemo(() => {
    return SORT_OPTIONS.find((item) => item.value === filters.sortBy)?.description ?? '';
  }, [filters.sortBy]);

  return (
    <View style={[styles.container, { backgroundColor: pTheme.colors.background }]}>
      {/* 顶部导航栏 */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8, backgroundColor: pTheme.colors.surface }]}>
        <Text style={[styles.headerTitle, { color: pTheme.colors.onSurface }]}>发现</Text>
        <Pressable
          style={styles.headerBtn}
          onPress={() => router.push('/search')}
          accessibilityLabel="搜索帖子"
        >
          <Ionicons name="search-outline" size={24} color={pTheme.colors.onSurfaceVariant} />
        </Pressable>
      </View>

      {/* 主内容区 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[BRAND_ORANGE]}
            tintColor={BRAND_ORANGE}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 筛选标签展示 */}
        {activeFilterChips.length > 0 && (
          <View style={styles.activeFiltersRow}>
            {activeFilterChips.map((chip) => (
              <Chip key={chip.key} mode="outlined" onClose={chip.onClear} compact>
                {chip.label}
              </Chip>
            ))}
          </View>
        )}

        {/* 加载状态 */}
        {isInitialLoading && (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={BRAND_ORANGE} />
            <Text style={styles.loadingText}>正在加载精彩内容…</Text>
          </View>
        )}

        {/* 错误状态 */}
        {error && !isInitialLoading && (
          <View style={styles.errorWrapper}>
            <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => fetchPosts('initial')}>
              <Ionicons name="refresh" size={18} color={BRAND_ORANGE} />
              <Text style={styles.retryText}>重新加载</Text>
            </Pressable>
          </View>
        )}

        {/* 空状态 */}
        {!isInitialLoading && !content.length && !error && (
          <View style={styles.emptyWrapper}>
            <View style={styles.emptyIcon}>
              <Ionicons name="restaurant" size={40} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>暂无内容</Text>
            <Text style={styles.emptyText}>去发布第一条美食分享吧～</Text>
          </View>
        )}

        {/* 瀑布流列表 */}
        {content.length > 0 && (
          <Masonry
            data={content}
            columns={{ base: 2, md: 2, lg: 3, xl: 4 }}
            gap={gap}
            verticalGap={verticalGap}
            getItemHeight={(item) => estimateHeight(item)}
            keyExtractor={(item) => item.id}
            renderItem={(item) => <PostCard post={item} onPress={onPress} />}
          />
        )}
      </ScrollView>

      {/* 筛选面板 */}
      {FILTERS_SUPPORTED && (
        <BottomSheet visible={filtersSheetVisible} onClose={() => setFiltersSheetVisible(false)} height={520}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
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
              {filters.postType === 'share' && shareSubTypes.length > 0 && (
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
              )}
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
              <Text variant="bodySmall" style={[styles.sortHint, { color: pTheme.colors.onSurfaceVariant }]}>
                {sortHintText}
              </Text>
            </View>

            <View style={styles.filterSection}>
              <Text variant="labelLarge" style={styles.filterTitle}>
                进阶筛选
              </Text>
              <View style={styles.advancedGroup}>
                <Text variant="labelMedium" style={[styles.subSectionTitle, { color: pTheme.colors.onSurfaceVariant }]}>
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
                <Text variant="labelMedium" style={[styles.subSectionTitle, { color: pTheme.colors.onSurfaceVariant }]}>
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

              {configLoading && (
                <Text variant="bodySmall" style={[styles.helperText, { color: pTheme.colors.onSurfaceVariant }]}>
                  正在加载配置数据…
                </Text>
              )}
              {configError && (
                <Text variant="bodySmall" style={[styles.helperText, { color: pTheme.colors.error }]}>
                  {configError}
                </Text>
              )}
            </View>

            <View style={styles.sheetActions}>
              <Button mode="outlined" icon="refresh" onPress={resetFilters} disabled={!hasAnyFilters}>
                重置筛选
              </Button>
              <Button mode="contained" onPress={() => setFiltersSheetVisible(false)}>
                完成
              </Button>
            </View>
          </ScrollView>
        </BottomSheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ==================== 顶部导航 ====================
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

  // ==================== 滚动区 ====================
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    gap: 12,
  },

  // ==================== 状态展示 ====================
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorWrapper: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 64,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },
  emptyWrapper: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // ==================== 筛选标签 ====================
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  // 筛选面板
  sheetContent: {
    paddingBottom: 24,
    gap: 16,
  },
  sheetHeader: {
    gap: 4,
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
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
});
