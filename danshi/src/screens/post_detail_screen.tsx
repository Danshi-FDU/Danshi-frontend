import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Image,
  RefreshControl,
  StyleSheet,
  Pressable,
  Alert,
  Share,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Text,
  useTheme as usePaperTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { postsService } from '@/src/services/posts_service';
import { usersService } from '@/src/services/users_service';
import type { Post, SeekingPost, SharePost } from '@/src/models/Post';
import type { Comment, CommentReply, CommentsPagination } from '@/src/models/Comment';
import { CommentItem } from '@/src/components/comments/comment_item';
import { CommentComposer } from '@/src/components/comments/comment_composer';
import ImageViewer from '@/src/components/image_viewer';
import { commentsService } from '@/src/services/comments_service';
import { BottomSheet } from '@/src/components/overlays/bottom_sheet';
import Ionicons from '@expo/vector-icons/Ionicons';

// 响应式断点
const BREAKPOINTS = {
  desktop: 768,
};

// 图片展示配置
const IMAGE_CONFIG = {
  aspectRatio: 4 / 3,
  maxHeightRatio: 0.5,
  desktopLeftRatio: 0.55,
};

const TYPE_LABEL: Record<Post['post_type'], string> = {
  share: '分享',
  seeking: '求助',
};

const SHARE_LABEL: Record<'recommend' | 'warning', string> = {
  recommend: '推荐',
  warning: '避雷',
};

type LoaderState = 'idle' | 'initial' | 'refresh';

type Props = {
  postId: string;
};

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;

  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}-${d}`;
}

const PostDetailScreen: React.FC<Props> = ({ postId }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = usePaperTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [post, setPost] = useState<Post | null>(null);
  const [loader, setLoader] = useState<LoaderState>('initial');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState({ like: false, favorite: false, follow: false });
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentSort, setCommentSort] = useState<'latest' | 'hot'>('latest');
  const [commentPagination, setCommentPagination] = useState({ page: 1, total: 0, total_pages: 1 });
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentReplies, setCommentReplies] = useState<Record<string, CommentReply[]>>({});
  const [commentRepliesPagination, setCommentRepliesPagination] = useState<Record<string, CommentsPagination>>({});
  const [commentRepliesLoading, setCommentRepliesLoading] = useState<Record<string, boolean>>({});
  const [commentRepliesExpanded, setCommentRepliesExpanded] = useState<Record<string, boolean>>({});
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentReplyTarget, setCommentReplyTarget] = useState<Comment | CommentReply | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageViewer, setImageViewer] = useState<{ visible: boolean; index: number }>({ visible: false, index: 0 });
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);

  const commentSortRef = useRef<'latest' | 'hot'>(commentSort);
  const scrollRef = useRef<ScrollView | null>(null);
  const commentsOffsetRef = useRef(0);

  const isDesktop = windowWidth >= BREAKPOINTS.desktop;

  // 图片布局计算
  const imageLayout = useMemo(() => {
    if (isDesktop) {
      const leftWidth = windowWidth * IMAGE_CONFIG.desktopLeftRatio;
      return {
        width: leftWidth,
        height: windowHeight - insets.top,
        containerWidth: leftWidth,
      };
    }
    const imageHeight = Math.min(windowWidth / IMAGE_CONFIG.aspectRatio, windowHeight * IMAGE_CONFIG.maxHeightRatio);
    return {
      width: windowWidth,
      height: imageHeight,
      containerWidth: windowWidth,
    };
  }, [windowWidth, windowHeight, isDesktop, insets.top]);

  // ==================== 数据获取 ====================
  const fetchComments = useCallback(async (postIdValue: string, sort: 'latest' | 'hot') => {
    setCommentLoading(true);
    try {
      const res = await commentsService.listByPost(postIdValue, { sortBy: sort, limit: 10 });
      setComments(res.comments);
      setCommentPagination(res.pagination);
      setCommentReplies({});
      setCommentRepliesPagination({});
      setCommentRepliesExpanded({});
    } catch (e) {
      console.warn('load comments failed', e);
    } finally {
      setCommentLoading(false);
    }
  }, []);

  const fetchPost = useCallback(async (mode: LoaderState = 'initial') => {
    setLoader(mode);
    if (mode !== 'refresh') setError(null);
    try {
      const data = await postsService.get(postId);
      await fetchComments(data.id, commentSortRef.current);
      setPost({
        ...data,
        is_liked: data.is_liked ?? false,
        is_favorited: data.is_favorited ?? false,
        stats: { ...(data.stats ?? {}), comment_count: data.stats?.comment_count ?? 0 },
      });
      if (data.author && typeof (data.author as any).is_following === 'boolean') {
        setIsFollowed((data.author as any).is_following);
      }
    } catch (e) {
      setError((e as Error)?.message ?? '加载帖子失败');
    } finally {
      setLoader('idle');
    }
  }, [postId, fetchComments]);

  useEffect(() => {
    fetchPost('initial');
  }, [fetchPost]);

  useEffect(() => {
    commentSortRef.current = commentSort;
  }, [commentSort]);

  useEffect(() => {
    if (post?.id) fetchComments(post.id, commentSort);
  }, [post?.id, commentSort, fetchComments]);

  const refreshing = loader === 'refresh';
  const isInitialLoading = loader === 'initial';

  // ==================== 交互处理 ====================
  const handleRefresh = useCallback(() => fetchPost('refresh'), [fetchPost]);

  const handleToggleLike = useCallback(async () => {
    if (!post) return;
    const currentlyLiked = post.is_liked;
    const currentLikeCount = post.stats?.like_count ?? 0;

    setActionLoading((prev) => ({ ...prev, like: true }));
    setPost((prev) =>
      prev ? {
        ...prev,
        is_liked: !currentlyLiked,
        stats: { ...(prev.stats ?? {}), like_count: currentLikeCount + (currentlyLiked ? -1 : 1) },
      } : prev
    );

    try {
      const result = currentlyLiked
        ? await postsService.unlike(post.id)
        : await postsService.like(post.id);
      setPost((prev) =>
        prev ? {
          ...prev,
          is_liked: result?.is_liked ?? !currentlyLiked,
          stats: { ...(prev.stats ?? {}), like_count: result?.like_count ?? currentLikeCount + (currentlyLiked ? -1 : 1) },
        } : prev
      );
    } catch (e) {
      setPost((prev) =>
        prev ? {
          ...prev,
          is_liked: currentlyLiked,
          stats: { ...(prev.stats ?? {}), like_count: currentLikeCount },
        } : prev
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, like: false }));
    }
  }, [post]);

  const handleToggleFavorite = useCallback(async () => {
    if (!post) return;
    const currentlyFavorited = post.is_favorited;
    const currentFavoriteCount = post.stats?.favorite_count ?? 0;

    setActionLoading((prev) => ({ ...prev, favorite: true }));
    setPost((prev) =>
      prev ? {
        ...prev,
        is_favorited: !currentlyFavorited,
        stats: { ...(prev.stats ?? {}), favorite_count: currentFavoriteCount + (currentlyFavorited ? -1 : 1) },
      } : prev
    );

    try {
      const result = currentlyFavorited
        ? await postsService.unfavorite(post.id)
        : await postsService.favorite(post.id);
      setPost((prev) =>
        prev ? {
          ...prev,
          is_favorited: result?.is_favorited ?? !currentlyFavorited,
          stats: { ...(prev.stats ?? {}), favorite_count: result?.favorite_count ?? currentFavoriteCount + (currentlyFavorited ? -1 : 1) },
        } : prev
      );
    } catch (e) {
      setPost((prev) =>
        prev ? {
          ...prev,
          is_favorited: currentlyFavorited,
          stats: { ...(prev.stats ?? {}), favorite_count: currentFavoriteCount },
        } : prev
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, favorite: false }));
    }
  }, [post]);

  const handleToggleFollow = useCallback(async () => {
    if (!post?.author?.id) return;
    setActionLoading((prev) => ({ ...prev, follow: true }));
    try {
      const { is_following } = isFollowed
        ? await usersService.unfollowUser(post.author.id)
        : await usersService.followUser(post.author.id);
      setIsFollowed(is_following);
    } catch (e) {
      Alert.alert('操作失败', (e as Error)?.message ?? '请稍后重试');
    } finally {
      setActionLoading((prev) => ({ ...prev, follow: false }));
    }
  }, [post?.author?.id, isFollowed]);

  const patchCommentEntity = useCallback((targetId: string, patch: Partial<Comment | CommentReply>) => {
    setComments((prev) => {
      const next = prev.map((comment) => {
        if (comment.id === targetId) return { ...comment, ...patch } as Comment;
        if (!comment.replies?.length) return comment;
        const replies = comment.replies.map((reply) =>
          reply.id === targetId ? { ...reply, ...patch } as CommentReply : reply
        );
        return { ...comment, replies };
      });
      return next;
    });
    setCommentReplies((prev) => {
      const next: Record<string, CommentReply[]> = {};
      for (const [parentId, list] of Object.entries(prev)) {
        next[parentId] = list.map((reply) =>
          reply.id === targetId ? { ...reply, ...patch } as CommentReply : reply
        );
      }
      return next;
    });
  }, []);

  const handleToggleCommentLike = useCallback(async (entity: Comment | CommentReply) => {
    const currentlyLiked = entity.is_liked;
    patchCommentEntity(entity.id, {
      is_liked: !currentlyLiked,
      like_count: (entity.like_count ?? 0) + (currentlyLiked ? -1 : 1),
    });
    try {
      const result = currentlyLiked
        ? await commentsService.unlike(entity.id)
        : await commentsService.like(entity.id);
      patchCommentEntity(entity.id, {
        is_liked: result?.is_liked ?? !currentlyLiked,
        like_count: result?.like_count ?? (entity.like_count ?? 0) + (currentlyLiked ? -1 : 1),
      });
    } catch (e) {
      patchCommentEntity(entity.id, { is_liked: currentlyLiked, like_count: entity.like_count });
    }
  }, [patchCommentEntity]);

  const handleOpenCommentSheet = useCallback(() => setCommentSheetVisible(true), []);
  const handleReplyToComment = useCallback((entity: Comment | CommentReply) => {
    setCommentReplyTarget(entity);
    setCommentSheetVisible(true);
  }, []);
  const handleCancelReply = useCallback(() => setCommentReplyTarget(null), []);
  const handleCloseCommentSheet = useCallback(() => {
    setCommentSheetVisible(false);
    setCommentReplyTarget(null);
  }, []);

  const handleToggleReplies = useCallback(async (commentId: string, expand: boolean) => {
    if (!expand) {
      setCommentRepliesExpanded((prev) => ({ ...prev, [commentId]: false }));
      return;
    }
    setCommentRepliesLoading((prev) => ({ ...prev, [commentId]: true }));
    try {
      const res = await commentsService.listReplies(commentId, { limit: 20 });
      setCommentReplies((prev) => ({ ...prev, [commentId]: res.replies }));
      setCommentRepliesPagination((prev) => ({ ...prev, [commentId]: res.pagination }));
      setCommentRepliesExpanded((prev) => ({ ...prev, [commentId]: true }));
    } catch (e) {
      Alert.alert('加载失败', (e as Error)?.message ?? '暂时无法加载更多回复');
    } finally {
      setCommentRepliesLoading((prev) => ({ ...prev, [commentId]: false }));
    }
  }, []);

  const handleOpenImageViewer = useCallback((index: number) => {
    setImageViewer({ visible: true, index });
  }, []);

  const handleCloseImageViewer = useCallback(() => {
    setImageViewer((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleShareToPlatform = useCallback(async () => {
    if (!post) return;
    setShareSheetVisible(false);
    try {
      await Share.share({ message: `${post.title}\n来自旦食社区，快来看看！` });
    } catch (error) {
      console.warn('[post_detail] share failed', error);
    }
  }, [post]);

  const handleCopyPostId = useCallback(async () => {
    if (!post) return;
    setShareSheetVisible(false);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(post.id);
        Alert.alert('已复制', '帖子 ID 已复制到剪贴板');
      } else {
        await Share.share({ message: `帖子 ID：${post.id}` });
      }
    } catch {
      Alert.alert('复制失败', `请手动复制帖子 ID：${post.id}`);
    }
  }, [post]);

  const handleSubmitComment = useCallback(async () => {
    if (!post) return;
    const content = commentInput.trim();
    if (!content) return;
    try {
      await commentsService.create(post.id, {
        content,
        parent_id: commentReplyTarget?.parent_id ?? commentReplyTarget?.id,
        reply_to_user_id: commentReplyTarget?.author?.id,
      });
      setCommentInput('');
      setCommentReplyTarget(null);
      setCommentSheetVisible(false);
      await fetchComments(post.id, commentSort);
      setPost((prev) =>
        prev ? {
          ...prev,
          stats: { ...(prev.stats ?? {}), comment_count: (prev.stats?.comment_count ?? 0) + 1 },
        } : prev
      );
    } catch (e) {
      Alert.alert('评论失败', (e as Error)?.message ?? '暂时无法发表评论');
    }
  }, [commentInput, commentReplyTarget, post, fetchComments, commentSort]);

  const handleCycleCommentSort = useCallback(() => {
    setCommentSort((prev) => (prev === 'latest' ? 'hot' : 'latest'));
  }, []);

  // ==================== 数据派生 ====================
  const hasImages = !!post?.images?.length;
  const tags = post?.tags ?? [];
  const sharePostData = post?.post_type === 'share' ? (post as SharePost) : null;
  const seekingPostData = post?.post_type === 'seeking' ? (post as SeekingPost) : null;
  const likeCount = post?.stats?.like_count ?? 0;
  const favoriteCount = post?.stats?.favorite_count ?? 0;
  const viewCount = post?.stats?.view_count ?? 0;
  const commentCount = post?.stats?.comment_count ?? commentPagination.total;

  // 根据帖子类型生成渐变色
  const gradientColors = useMemo(() => {
    if (post?.post_type === 'seeking') {
      // 求助类型：蓝紫色系
      return { primary: '#667EEA', secondary: '#764BA2', accent: '#A78BFA' };
    } else if (sharePostData?.share_type === 'warning') {
      // 避雷类型：红橙色系
      return { primary: '#F093FB', secondary: '#F5576C', accent: '#FDA4AF' };
    } else {
      // 推荐/分享类型：橙黄色系
      return { primary: '#F97316', secondary: '#F59E0B', accent: '#FDBA74' };
    }
  }, [post?.post_type, sharePostData?.share_type]);

  // ==================== 统一顶部媒体区（Fallback Cover）====================
  const renderUnifiedHeroSection = () => {
    // 有图模式：渲染图片轮播
    if (hasImages) {
      const images = post?.images ?? [];
      return (
        <View style={[styles.carouselContainer, { height: imageLayout.height }]}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `${item}-${index}`}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / imageLayout.width);
              setCurrentImageIndex(index);
            }}
            renderItem={({ item, index }) => (
              <Pressable onPress={() => handleOpenImageViewer(index)}>
                <Image
                  source={{ uri: item }}
                  style={[styles.carouselImage, { width: imageLayout.width, height: imageLayout.height }]}
                  resizeMode="cover"
                />
              </Pressable>
            )}
          />
          {images.length > 1 && (
            <View style={styles.imageIndicator}>
              <Text style={styles.imageIndicatorText}>
                {currentImageIndex + 1}/{images.length}
              </Text>
            </View>
          )}
        </View>
      );
    }

    // 无图模式：渲染 Mesh Gradient Fallback Cover
    const typeLabel = sharePostData?.share_type 
      ? SHARE_LABEL[sharePostData.share_type] 
      : TYPE_LABEL[post?.post_type ?? 'share'];

    const typeIcon = post?.post_type === 'seeking' ? 'help-circle' : 
      sharePostData?.share_type === 'warning' ? 'alert-circle' : 'heart';

    return (
      <View style={[styles.fallbackCover, { paddingTop: insets.top + 56 }]}>
        {/* Mesh Gradient 背景 */}
        <View style={[styles.fallbackGradientBase, { backgroundColor: gradientColors.primary }]} />
        <View style={[styles.fallbackMeshLayer1, { backgroundColor: gradientColors.secondary }]} />
        <View style={[styles.fallbackMeshLayer2, { backgroundColor: gradientColors.accent }]} />
        <View style={[styles.fallbackMeshLayer3, { backgroundColor: gradientColors.primary }]} />
        
        {/* 装饰性 Blur 圆圈 */}
        <View style={styles.fallbackDecorations}>
          <View style={[styles.fallbackCircle1, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
          <View style={[styles.fallbackCircle2, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
          <View style={[styles.fallbackCircle3, { backgroundColor: gradientColors.accent, opacity: 0.2 }]} />
        </View>

        {/* 中央内容 - 大类型图标 */}
        <View style={styles.fallbackContent}>
          <View style={styles.fallbackIconContainer}>
            <Ionicons name={typeIcon as any} size={64} color="rgba(255,255,255,0.85)" />
          </View>
          <View style={styles.fallbackTypeBadge}>
            <Text style={styles.fallbackTypeBadgeText}>{typeLabel}</Text>
          </View>
        </View>
      </View>
    );
  };

  // ==================== 作者栏渲染 ====================
  const renderAuthorBar = () => (
    <View style={styles.authorBar}>
      <Pressable style={styles.authorInfo} onPress={() => post?.author?.id && router.push(`/user/${post.author.id}`)}>
        {post?.author?.avatar_url ? (
          <Avatar.Image size={44} source={{ uri: post.author.avatar_url }} />
        ) : (
          <Avatar.Text
            size={44}
            label={(post?.author?.name ?? '访').slice(0, 1)}
            style={{ backgroundColor: theme.colors.primaryContainer }}
            labelStyle={{ color: theme.colors.onPrimaryContainer }}
          />
        )}
        <View style={styles.authorTextWrap}>
          <Text style={styles.authorName}>{post?.author?.name ?? '匿名用户'}</Text>
          <Text style={[styles.authorMeta, { color: theme.colors.onSurfaceVariant }]}>
            {formatDate(post?.created_at)}
          </Text>
        </View>
      </Pressable>
      <Pressable
        style={[
          styles.followBtn,
          isFollowed
            ? { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }
            : { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleToggleFollow}
        disabled={actionLoading.follow}
      >
        {actionLoading.follow ? (
          <ActivityIndicator size={14} color={isFollowed ? theme.colors.onSurfaceVariant : theme.colors.onPrimary} />
        ) : (
          <Text
            style={[
              styles.followBtnText,
              { color: isFollowed ? theme.colors.onSurfaceVariant : theme.colors.onPrimary },
            ]}
          >
            {isFollowed ? '已关注' : '+ 关注'}
          </Text>
        )}
      </Pressable>
    </View>
  );

  // ==================== 内容区域渲染 ====================
  const renderContentSection = () => (
    <View style={styles.contentSection}>
      {/* 标题 */}
      <Text style={styles.title}>{post?.title}</Text>

      {/* 正文 */}
      <Text style={styles.contentText}>{post?.content}</Text>

      {/* 结构化信息卡片 */}
      {sharePostData && (sharePostData.cuisine || typeof sharePostData.price === 'number' || (sharePostData.flavors && sharePostData.flavors.length > 0)) ? (
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={styles.infoCardRow}>
            {sharePostData.cuisine ? (
              <View style={styles.infoCardItem}>
                <Ionicons name="restaurant-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.infoCardLabel, { color: theme.colors.onSurfaceVariant }]}>菜系</Text>
                <Text style={[styles.infoCardValue, { color: theme.colors.onSurface }]}>{sharePostData.cuisine}</Text>
              </View>
            ) : null}
            {typeof sharePostData.price === 'number' ? (
              <View style={styles.infoCardItem}>
                <Ionicons name="cash-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.infoCardLabel, { color: theme.colors.onSurfaceVariant }]}>人均</Text>
                <Text style={[styles.infoCardValue, { color: theme.colors.onSurface }]}>¥{sharePostData.price}</Text>
              </View>
            ) : null}
          </View>
          {sharePostData.flavors && sharePostData.flavors.length > 0 ? (
            <View style={styles.infoCardFlavors}>
              {sharePostData.flavors.map((flavor, idx) => (
                <View key={idx} style={[styles.flavorBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <Text style={[styles.flavorBadgeText, { color: theme.colors.onSecondaryContainer }]}>{flavor}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* SeekingPost 信息 */}
      {seekingPostData && (seekingPostData.budget_range || seekingPostData.preferences) ? (
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={styles.infoCardRow}>
            {seekingPostData.budget_range ? (
              <View style={styles.infoCardItem}>
                <Ionicons name="wallet-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.infoCardLabel, { color: theme.colors.onSurfaceVariant }]}>预算</Text>
                <Text style={[styles.infoCardValue, { color: theme.colors.onSurface }]}>
                  ¥{seekingPostData.budget_range.min}-{seekingPostData.budget_range.max}
                </Text>
              </View>
            ) : null}
          </View>
          {seekingPostData.preferences?.prefer_flavors && seekingPostData.preferences.prefer_flavors.length > 0 ? (
            <View style={styles.infoCardFlavors}>
              <Text style={[styles.preferenceLabel, { color: theme.colors.tertiary }]}>喜欢：</Text>
              {seekingPostData.preferences.prefer_flavors.map((f, idx) => (
                <View key={idx} style={[styles.flavorBadge, { backgroundColor: theme.colors.tertiaryContainer }]}>
                  <Text style={[styles.flavorBadgeText, { color: theme.colors.onTertiaryContainer }]}>{f}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {seekingPostData.preferences?.avoid_flavors && seekingPostData.preferences.avoid_flavors.length > 0 ? (
            <View style={styles.infoCardFlavors}>
              <Text style={[styles.preferenceLabel, { color: theme.colors.error }]}>忌口：</Text>
              {seekingPostData.preferences.avoid_flavors.map((f, idx) => (
                <View key={idx} style={[styles.flavorBadge, { backgroundColor: theme.colors.errorContainer }]}>
                  <Text style={[styles.flavorBadgeText, { color: theme.colors.onErrorContainer }]}>{f}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 标签栏 */}
      <View style={styles.tagsRow}>
        {/* 位置 */}
        {post?.canteen ? (
          <View style={[styles.tagBadge, styles.locationBadge]}>
            <Ionicons name="location" size={12} color="#6B7280" />
            <Text style={styles.tagBadgeText}>{post.canteen}</Text>
          </View>
        ) : null}
        {/* 类型标签 */}
        {post && (
          <View style={[styles.tagBadge, sharePostData?.share_type === 'warning' ? styles.warningBadge : styles.recommendBadge]}>
            <Text style={[styles.tagBadgeText, sharePostData?.share_type === 'warning' ? styles.warningText : styles.recommendText]}>
              {sharePostData && sharePostData.share_type ? SHARE_LABEL[sharePostData.share_type] : TYPE_LABEL[post.post_type]}
            </Text>
          </View>
        )}
        {/* 话题标签 */}
        {tags.filter(tag => tag && tag.trim()).map((tag, index) => (
          <Text key={index} style={[styles.topicTag, { color: theme.colors.primary }]}>
            #{tag}
          </Text>
        ))}
      </View>

      {/* 浏览量和时间 */}
      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { color: theme.colors.outline }]}>
          {viewCount} 浏览
        </Text>
        <Text style={[styles.metaText, { color: theme.colors.outline }]}>
          发布于 {formatDate(post?.created_at)}
        </Text>
      </View>
    </View>
  );

  // ==================== 评论区渲染 ====================
  const renderCommentsSection = () => (
    <View
      style={styles.commentsSection}
      onLayout={(e) => { commentsOffsetRef.current = e.nativeEvent.layout.y; }}
    >
      {/* 评论头部 */}
      <View style={styles.commentsHeader}>
        <Text style={styles.commentsTitle}>共 {commentCount} 条评论</Text>
        <Pressable style={styles.sortBtn} onPress={handleCycleCommentSort}>
          <Ionicons name="swap-vertical" size={16} color={theme.colors.onSurfaceVariant} />
          <Text style={[styles.sortBtnText, { color: theme.colors.onSurfaceVariant }]}>
            {commentSort === 'latest' ? '最新' : '最热'}
          </Text>
        </Pressable>
      </View>

      {/* 评论列表 */}
      {commentLoading ? (
        <View style={styles.commentsLoading}>
          <ActivityIndicator size="small" />
          <Text style={[styles.commentsLoadingText, { color: theme.colors.onSurfaceVariant }]}>
            加载评论中...
          </Text>
        </View>
      ) : comments.length ? (
        <View style={styles.commentsList}>
          {comments.map((item) => {
            const expanded = !!commentRepliesExpanded[item.id];
            const repliesPreview = expanded ? commentReplies[item.id] ?? [] : (item.replies ?? []).slice(0, 2);
            const replyTotal = commentRepliesPagination[item.id]?.total ?? item.reply_count ?? repliesPreview.length;
            return (
              <View key={item.id} style={styles.commentItem}>
                <CommentItem
                  comment={item}
                  replyPreview={replyTotal > 0 ? repliesPreview : undefined}
                  replyTotal={replyTotal > 0 ? replyTotal : undefined}
                  repliesExpanded={expanded}
                  onLike={handleToggleCommentLike}
                  onReply={handleReplyToComment}
                  onToggleReplies={handleToggleReplies}
                  loadingReplies={!!commentRepliesLoading[item.id]}
                />
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyComments}>
          <Ionicons name="chatbubble-outline" size={48} color={theme.colors.outlineVariant} />
          <Text style={[styles.emptyCommentsText, { color: theme.colors.onSurfaceVariant }]}>
            还没有评论，快来抢沙发吧～
          </Text>
        </View>
      )}
    </View>
  );

  // ==================== 底部操作栏渲染 ====================
  const renderBottomBar = () => (
    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8, backgroundColor: theme.colors.surface }]}>
      {/* 输入框 */}
      <Pressable
        style={[styles.commentInput, { backgroundColor: theme.colors.surfaceVariant }]}
        onPress={handleOpenCommentSheet}
      >
        <Ionicons name="chatbubble-outline" size={18} color={theme.colors.outline} />
        <Text style={[styles.commentInputText, { color: theme.colors.outline }]}>说点什么...</Text>
      </Pressable>

      {/* 操作按钮 */}
      <View style={styles.bottomActions}>
        <Pressable style={styles.actionBtn} onPress={handleToggleLike} disabled={actionLoading.like}>
          <Ionicons
            name={post?.is_liked ? 'heart' : 'heart-outline'}
            size={22}
            color={post?.is_liked ? '#EF4444' : theme.colors.onSurfaceVariant}
          />
          {likeCount > 0 && (
            <Text style={[styles.actionCount, { color: post?.is_liked ? '#EF4444' : theme.colors.onSurfaceVariant }]}>
              {likeCount}
            </Text>
          )}
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={handleToggleFavorite} disabled={actionLoading.favorite}>
          <Ionicons
            name={post?.is_favorited ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={post?.is_favorited ? '#F59E0B' : theme.colors.onSurfaceVariant}
          />
          {favoriteCount > 0 && (
            <Text style={[styles.actionCount, { color: post?.is_favorited ? '#F59E0B' : theme.colors.onSurfaceVariant }]}>
              {favoriteCount}
            </Text>
          )}
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={handleOpenCommentSheet}>
          <Ionicons name="chatbubble-outline" size={22} color={theme.colors.onSurfaceVariant} />
          {commentCount > 0 && (
            <Text style={[styles.actionCount, { color: theme.colors.onSurfaceVariant }]}>{commentCount}</Text>
          )}
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={() => setShareSheetVisible(true)}>
          <Ionicons name="share-outline" size={22} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      </View>
    </View>
  );

  // ==================== 桌面端布局 ====================
  if (isDesktop) {
    const leftPanelWidth = windowWidth * IMAGE_CONFIG.desktopLeftRatio;

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* 返回按钮 */}
        <Pressable
          style={[styles.desktopBackBtn, { top: insets.top + 12 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={[styles.desktopContainer, { paddingTop: insets.top }]}>
          {/* 左侧图片区 */}
          <View style={[styles.desktopLeft, { width: leftPanelWidth }]}>
            {isInitialLoading ? (
              <ActivityIndicator color="#fff" />
            ) : hasImages ? (
              <>
                <FlatList
                  data={post?.images ?? []}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / leftPanelWidth);
                    setCurrentImageIndex(index);
                  }}
                  renderItem={({ item, index }) => (
                    <Pressable onPress={() => handleOpenImageViewer(index)}>
                      <Image
                        source={{ uri: item }}
                        style={{ width: leftPanelWidth, height: windowHeight - insets.top }}
                        resizeMode="contain"
                      />
                    </Pressable>
                  )}
                />
                {(post?.images?.length ?? 0) > 1 && (
                  <View style={styles.desktopImageIndicator}>
                    <Text style={styles.imageIndicatorText}>
                      {currentImageIndex + 1}/{post?.images?.length}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              // 桌面端无图模式 - 渐变背景
              <View style={[styles.desktopNoImageHero, { backgroundColor: gradientColors.primary }]}>
                <View style={styles.heroPattern}>
                  <View style={[styles.heroCircle, styles.desktopHeroCircle1, { backgroundColor: gradientColors.secondary }]} />
                  <View style={[styles.heroCircle, styles.desktopHeroCircle2, { backgroundColor: gradientColors.secondary }]} />
                </View>
                <View style={styles.desktopHeroContent}>
                  <View style={styles.heroTypeBadge}>
                    <Text style={styles.heroTypeBadgeText}>
                      {sharePostData?.share_type ? SHARE_LABEL[sharePostData.share_type] : TYPE_LABEL[post?.post_type ?? 'share']}
                    </Text>
                  </View>
                  <Text style={styles.desktopHeroTitle} numberOfLines={4}>{post?.title}</Text>
                  <Text style={styles.heroMeta}>{formatDate(post?.created_at)}</Text>
                </View>
              </View>
            )}
          </View>

          {/* 右侧内容区 */}
          <View style={styles.desktopRight}>
            {/* 作者栏 */}
            <View style={[styles.desktopHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
              {renderAuthorBar()}
            </View>

            {/* 滚动内容 */}
            <ScrollView
              style={styles.desktopContent}
              contentContainerStyle={{ paddingBottom: 16 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
              showsVerticalScrollIndicator={false}
            >
              {isInitialLoading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator />
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>加载中...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorWrap}>
                  <Text style={{ color: theme.colors.error }}>{error}</Text>
                  <Button mode="contained-tonal" onPress={() => fetchPost('initial')}>重试</Button>
                </View>
              ) : post ? (
                <>
                  {renderContentSection()}
                  <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                  {renderCommentsSection()}
                </>
              ) : null}
            </ScrollView>

            {/* 底部操作 */}
            <View style={[styles.desktopFooter, { borderTopColor: theme.colors.outlineVariant }]}>
              {renderBottomBar()}
            </View>
          </View>
        </View>

        {/* Sheets */}
        <BottomSheet visible={shareSheetVisible} onClose={() => setShareSheetVisible(false)} height={200}>
          <View style={styles.shareSheet}>
            <Text style={styles.shareSheetTitle}>分享</Text>
            <View style={styles.shareSheetBtns}>
              <Button mode="contained-tonal" icon="share-variant" onPress={handleShareToPlatform}>
                分享到...
              </Button>
              <Button mode="outlined" icon="content-copy" onPress={handleCopyPostId}>
                复制 ID
              </Button>
            </View>
          </View>
        </BottomSheet>

        <BottomSheet visible={commentSheetVisible} onClose={handleCloseCommentSheet} height={360}>
          <CommentComposer
            value={commentInput}
            onChange={setCommentInput}
            onSubmit={handleSubmitComment}
            replyTarget={commentReplyTarget?.author?.name}
            onCancelReply={handleCancelReply}
          />
        </BottomSheet>

        <ImageViewer
          visible={imageViewer.visible}
          images={post?.images ?? []}
          initialIndex={imageViewer.index}
          onClose={handleCloseImageViewer}
        />
      </View>
    );
  }

  // ==================== 移动端布局 ====================
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 顶部导航 - 悬浮在图片/Hero上 */}
      <View style={[styles.mobileHeader, { paddingTop: insets.top }]}>
        <Pressable style={[styles.headerBtn, !hasImages && styles.headerBtnLight]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Pressable style={[styles.headerBtn, !hasImages && styles.headerBtnLight]} onPress={() => setShareSheetVisible(true)}>
          <Ionicons name="share-outline" size={22} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {isInitialLoading ? (
          <View style={[styles.loaderWrap, { paddingTop: insets.top + 60 }]}>
            <ActivityIndicator />
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>加载中...</Text>
          </View>
        ) : error ? (
          <View style={[styles.errorWrap, { paddingTop: insets.top + 60 }]}>
            <Text style={{ color: theme.colors.error }}>{error}</Text>
            <Button mode="contained-tonal" onPress={() => fetchPost('initial')}>重试</Button>
          </View>
        ) : post ? (
          <>
            {/* 统一布局：媒体区域 / Fallback Cover */}
            {renderUnifiedHeroSection()}

            {/* 作者栏 - 紧跟封面 */}
            <View style={styles.mobileAuthorBar}>
              {renderAuthorBar()}
            </View>

            {/* 内容区域 - 统一样式 */}
            {renderContentSection()}

            {/* 分隔线 */}
            <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

            {/* 评论 */}
            {renderCommentsSection()}
          </>
        ) : (
          <View style={[styles.errorWrap, { paddingTop: insets.top + 60 }]}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>帖子不存在或已被删除</Text>
          </View>
        )}
      </ScrollView>

      {/* 底部栏 */}
      {renderBottomBar()}

      {/* Sheets */}
      <BottomSheet visible={shareSheetVisible} onClose={() => setShareSheetVisible(false)} height={200}>
        <View style={styles.shareSheet}>
          <Text style={styles.shareSheetTitle}>分享</Text>
          <View style={styles.shareSheetBtns}>
            <Button mode="contained-tonal" icon="share-variant" onPress={handleShareToPlatform}>
              分享到...
            </Button>
            <Button mode="outlined" icon="content-copy" onPress={handleCopyPostId}>
              复制 ID
            </Button>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet visible={commentSheetVisible} onClose={handleCloseCommentSheet} height={360}>
        <CommentComposer
          value={commentInput}
          onChange={setCommentInput}
          onSubmit={handleSubmitComment}
          replyTarget={commentReplyTarget?.author?.name}
          onCancelReply={handleCancelReply}
        />
      </BottomSheet>

      <ImageViewer
        visible={imageViewer.visible}
        images={post?.images ?? []}
        initialIndex={imageViewer.index}
        onClose={handleCloseImageViewer}
      />
    </View>
  );
};

export default PostDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // ==================== Mobile Header ====================
  mobileHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnLight: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // ==================== Image Carousel ====================
  carouselContainer: {
    position: 'relative',
    backgroundColor: '#000',
  },
  carouselImage: {
    backgroundColor: '#1a1a1a',
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },

  // ==================== Author Bar ====================
  mobileAuthorBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  authorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  authorTextWrap: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  authorMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 72,
    alignItems: 'center',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ==================== Content Section ====================
  contentSection: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    color: '#111827',
  },
  contentText: {
    fontSize: 15,
    lineHeight: 26,
    color: '#374151',
  },

  // ==================== Info Card ====================
  infoCard: {
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  infoCardRow: {
    flexDirection: 'row',
    gap: 20,
  },
  infoCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoCardLabel: {
    fontSize: 13,
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCardFlavors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  preferenceLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  flavorBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  flavorBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ==================== Tags Row ====================
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  tagBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  locationBadge: {
    backgroundColor: '#F3F4F6',
  },
  recommendBadge: {
    backgroundColor: '#D1FAE5',
  },
  warningBadge: {
    backgroundColor: '#FEE2E2',
  },
  recommendText: {
    color: '#059669',
  },
  warningText: {
    color: '#DC2626',
  },
  topicTag: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ==================== Meta Row ====================
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  metaText: {
    fontSize: 12,
  },

  // ==================== Divider ====================
  divider: {
    height: 8,
    marginVertical: 8,
  },

  // ==================== Comments ====================
  commentsSection: {
    padding: 16,
    gap: 16,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  commentsLoading: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  commentsLoadingText: {
    fontSize: 13,
  },
  commentsList: {
    gap: 16,
  },
  commentItem: {},
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyCommentsText: {
    fontSize: 14,
  },

  // ==================== Bottom Bar ====================
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
  },
  commentInputText: {
    fontSize: 14,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 44,
  },
  actionCount: {
    fontSize: 11,
    marginTop: 2,
  },

  // ==================== Share Sheet ====================
  shareSheet: {
    gap: 16,
  },
  shareSheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  shareSheetBtns: {
    flexDirection: 'row',
    gap: 12,
  },

  // ==================== Loaders ====================
  loaderWrap: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  errorWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },

  // ==================== Desktop Layout ====================
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopLeft: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopImageIndicator: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  noImagePlaceholder: {
    alignItems: 'center',
  },
  // 桌面端无图渐变样式
  desktopNoImageHero: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  desktopHeroCircle1: {
    width: 300,
    height: 300,
    borderRadius: 150,
    position: 'absolute',
    right: -100,
    top: -50,
    opacity: 0.3,
  },
  desktopHeroCircle2: {
    width: 200,
    height: 200,
    borderRadius: 100,
    position: 'absolute',
    left: -50,
    bottom: 50,
    opacity: 0.2,
  },
  desktopHeroContent: {
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  desktopHeroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 36,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  desktopRight: {
    flex: 1,
    maxWidth: 480,
  },
  desktopHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  desktopContent: {
    flex: 1,
  },
  desktopFooter: {
    borderTopWidth: 1,
  },
  desktopBackBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==================== No-Image Hero Header ====================
  heroContainer: {
    position: 'relative',
    minHeight: 280,
    overflow: 'hidden',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  heroCircle1: {
    width: 200,
    height: 200,
    top: -60,
    right: -40,
  },
  heroCircle2: {
    width: 150,
    height: 150,
    bottom: -30,
    left: -30,
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  heroTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    color: '#fff',
    letterSpacing: -0.3,
  },
  heroMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  heroAuthorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  heroAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  heroAuthorText: {
    flex: 1,
  },
  heroAuthorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  heroAuthorBio: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  heroFollowBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroFollowBtnFollowed: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  heroFollowBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // ==================== No-Image Content Section ====================
  noImageContentSection: {
    padding: 20,
    gap: 20,
  },
  noImageTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    color: '#111827',
  },
  noImageContentText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#374151',
  },
  // 美化信息卡片
  infoCardEnhanced: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  infoCardEnhancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoCardEnhancedIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardEnhancedLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoCardEnhancedValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  // ==================== Fallback Cover (无图帖子占位封面) ====================
  fallbackCover: {
    position: 'relative',
    minHeight: 300,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackGradientBase: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackMeshLayer1: {
    position: 'absolute',
    width: '70%',
    height: '70%',
    top: -20,
    right: -30,
    borderRadius: 200,
    opacity: 0.6,
    transform: [{ rotate: '15deg' }],
  },
  fallbackMeshLayer2: {
    position: 'absolute',
    width: '80%',
    height: '60%',
    bottom: -40,
    left: -40,
    borderRadius: 150,
    opacity: 0.4,
    transform: [{ rotate: '-20deg' }],
  },
  fallbackMeshLayer3: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    top: '30%',
    left: '25%',
    borderRadius: 100,
    opacity: 0.3,
  },
  fallbackDecorations: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  fallbackCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -40,
    right: -40,
  },
  fallbackCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: 20,
    left: -30,
  },
  fallbackCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: '50%',
    right: '20%',
  },
  fallbackContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    gap: 16,
  },
  fallbackIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fallbackTypeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  fallbackTypeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
