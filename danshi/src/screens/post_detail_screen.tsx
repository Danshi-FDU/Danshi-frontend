import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Image,
  RefreshControl,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  Share,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  Appbar,
  ActivityIndicator,
  Chip,
  Divider,
  Avatar,
  Button,
  Text,
  IconButton,
  Badge,
  useTheme as usePaperTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { postsService } from '@/src/services/posts_service';
import type { Post, SeekingPost, SharePost } from '@/src/models/Post';
import type { Comment, CommentReply, CommentsPagination } from '@/src/models/Comment';
import { CommentItem } from '@/src/components/comments/comment_item';
import { CommentComposer } from '@/src/components/comments/comment_composer';
import { commentsService } from '@/src/services/comments_service';
import { BottomSheet } from '@/src/components/overlays/bottom_sheet';
import { UserAvatar } from '@/src/components/user_avatar';

const TYPE_LABEL: Record<Post['post_type'], string> = {
  share: '分享',
  seeking: '求助',
};

const SHARE_LABEL: Record<'recommend' | 'warning', string> = {
  recommend: '推荐',
  warning: '避雷',
};

const COMMENTS_SUPPORTED = true;

type LoaderState = 'idle' | 'initial' | 'refresh';

type Props = {
  postId: string;
};

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${d} ${hh}:${mm}`;
}

type InfoItemProps = {
  label: string;
  value?: React.ReactNode;
};

const InfoItem: React.FC<InfoItemProps> = ({ label, value }) => {
  const theme = usePaperTheme();
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Text variant="labelMedium" style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }] }>
        {label}
      </Text>
      <View style={styles.infoValueWrapper}>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Text variant="bodyMedium" style={styles.infoValue}>
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
};

function ShareDetails({ post }: { post: SharePost }) {
  return (
    <View style={styles.detailSection}>
      <Text variant="titleSmall" style={styles.sectionTitle}>
        分享信息
      </Text>
      <View style={styles.sectionBody}>
        {/* <InfoItem label="分享类型" value={SHARE_LABEL[post.share_type]} /> */}
        {typeof post.price === 'number' ? (
          <InfoItem label="参考价格" value={`￥${post.price.toFixed(2)}`} />
        ) : null}
        <InfoItem label="菜系" value={post.cuisine} />
        {post.flavors?.length ? (
          <InfoItem
            label="口味标签"
            value={post.flavors.join('、')}
          />
        ) : null}
      </View>
    </View>
  );
}

function SeekingDetails({ post }: { post: SeekingPost }) {
  const budget = post.budget_range;
  const prefers = post.preferences;
  return (
    <View style={styles.detailSection}>
      <Text variant="titleSmall" style={styles.sectionTitle}>
        求助需求
      </Text>
      <View style={styles.sectionBody}>
        {budget ? (
          <InfoItem label="预算范围" value={`￥${budget.min.toFixed(2)} - ￥${budget.max.toFixed(2)}`} />
        ) : null}
        {prefers?.prefer_flavors?.length ? (
          <InfoItem label="偏好口味" value={prefers.prefer_flavors.join('、')} />
        ) : null}
        {prefers?.avoid_flavors?.length ? (
          <InfoItem label="忌口" value={prefers.avoid_flavors.join('、')} />
        ) : null}
      </View>
    </View>
  );
}


const PostDetailScreen: React.FC<Props> = ({ postId }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = usePaperTheme();
  const [post, setPost] = useState<Post | null>(null);
  const [loader, setLoader] = useState<LoaderState>('initial');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState({ like: false, favorite: false });
  const [actionError, setActionError] = useState<string | null>(null);
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
  const [imageViewer, setImageViewer] = useState<{ visible: boolean; index: number }>({ visible: false, index: 0 });
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const commentSortRef = useRef<'latest' | 'hot'>(commentSort);
  const scrollRef = useRef<ScrollView | null>(null);
  const commentsOffsetRef = useRef(0);
  const viewerScrollRef = useRef<ScrollView | null>(null);
  const windowWidth = useWindowDimensions().width;

  const fetchComments = useCallback(
    async (postIdValue: string, sort: 'latest' | 'hot') => {
      if (!COMMENTS_SUPPORTED) return;
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
    },
    []
  );

  const fetchPost = useCallback(
    async (mode: LoaderState = 'initial') => {
      setLoader(mode);
      if (mode !== 'refresh') setError(null);
      try {
        const data = await postsService.get(postId);
        await fetchComments(data.id, commentSortRef.current);
        setPost({
          ...data,
          stats: { ...(data.stats ?? {}), comment_count: data.stats?.comment_count ?? 0 },
        });
        setActionError(null);
        setActionLoading({ like: false, favorite: false });
        setShareSheetVisible(false);
        if (mode === 'initial') setCommentInput('');
      } catch (e) {
        const message = (e as Error)?.message ?? '加载帖子失败';
        setError(message);
      } finally {
        setLoader('idle');
      }
    },
    [postId, fetchComments]
  );

  useEffect(() => {
    fetchPost('initial');
  }, [fetchPost]);

  useEffect(() => {
    if (!COMMENTS_SUPPORTED) return;
    commentSortRef.current = commentSort;
  }, [commentSort]);

  useEffect(() => {
    if (!COMMENTS_SUPPORTED || !post?.id) return;
    fetchComments(post.id, commentSort);
  }, [post?.id, commentSort, fetchComments]);

  const refreshing = loader === 'refresh';
  const isInitialLoading = loader === 'initial';

  const handleRefresh = useCallback(() => {
    fetchPost('refresh');
  }, [fetchPost]);

  const handleToggleLike = useCallback(async () => {
    if (!post) return;
    setActionError(null);
    setActionLoading((prev) => ({ ...prev, like: true }));
    try {
      const { is_liked, like_count } = post.is_liked
        ? await postsService.unlike(post.id)
        : await postsService.like(post.id);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              is_liked,
              stats: { ...(prev.stats ?? {}), like_count },
            }
          : prev
      );
    } catch (e) {
      const message = (e as Error)?.message ?? '点赞失败，请稍后重试';
      setActionError(message);
    } finally {
      setActionLoading((prev) => ({ ...prev, like: false }));
    }
  }, [post?.id, post?.is_liked]);

  const handleToggleFavorite = useCallback(async () => {
    if (!post) return;
    setActionError(null);
    setActionLoading((prev) => ({ ...prev, favorite: true }));
    try {
      const { is_favorited, favorite_count } = post.is_favorited
        ? await postsService.unfavorite(post.id)
        : await postsService.favorite(post.id);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              is_favorited,
              stats: { ...(prev.stats ?? {}), favorite_count },
            }
          : prev
      );
    } catch (e) {
      const message = (e as Error)?.message ?? '收藏失败，请稍后重试';
      setActionError(message);
    } finally {
      setActionLoading((prev) => ({ ...prev, favorite: false }));
    }
  }, [post?.id, post?.is_favorited]);

  const hasImages = post?.images?.length;

  const tags = useMemo(() => post?.tags ?? [], [post?.tags]);

  const headerChips = useMemo(() => {
    if (!post) return [] as React.ReactNode[];
    const chips: React.ReactNode[] = [];
    if (post.canteen) {
      chips.push(
        <Chip compact mode="outlined" icon="storefront-outline" key="canteen">
          {post.canteen}
        </Chip>
      );
    }
    chips.push(
      <Chip compact key="type">
        {TYPE_LABEL[post.post_type]}
      </Chip>
    );
    if (post.post_type === 'share') {
      chips.push(
        <Chip compact key="shareType">
          {SHARE_LABEL[(post as SharePost).share_type]}
        </Chip>
      );
    }
    chips.push(
      <Chip compact mode="outlined" key="category">
        {post.category === 'recipe' ? '食谱' : '美食'}
      </Chip>
    );
    return chips;
  }, [post]);
  const likeCount = post?.stats?.like_count ?? 0;
  const favoriteCount = post?.stats?.favorite_count ?? 0;
  const viewCount = post?.stats?.view_count ?? 0;
  const commentCount = COMMENTS_SUPPORTED ? post?.stats?.comment_count ?? commentPagination.total : 0;
  const commentSortLabel = commentSort === 'latest' ? '按最新排序' : '按热度排序';

  const handleCycleCommentSort = useCallback(() => {
    if (!COMMENTS_SUPPORTED) return;
    setCommentSort((prev) => (prev === 'latest' ? 'hot' : 'latest'));
  }, []);

  const patchCommentEntity = useCallback(
    (targetId: string, patch: Partial<Comment | CommentReply>) => {
      setComments((prev) => {
        let updated = false;
        const next = prev.map((comment) => {
          if (comment.id === targetId) {
            updated = true;
            return { ...comment, ...patch } as Comment;
          }
          if (!comment.replies?.length) return comment;
          let repliesChanged = false;
          const replies = comment.replies.map((reply) => {
            if (reply.id === targetId) {
              repliesChanged = true;
              updated = true;
              return { ...reply, ...patch } as CommentReply;
            }
            return reply;
          });
          return repliesChanged ? { ...comment, replies } : comment;
        });
        return updated ? next : prev;
      });

      setCommentReplies((prev) => {
        let updated = false;
        const next: Record<string, CommentReply[]> = {};
        for (const [parentId, list] of Object.entries(prev)) {
          let changed = false;
          const replies = list.map((reply) => {
            if (reply.id === targetId) {
              changed = true;
              updated = true;
              return { ...reply, ...patch } as CommentReply;
            }
            return reply;
          });
          next[parentId] = changed ? replies : list;
        }
        return updated ? next : prev;
      });
    },
    []
  );

  const handleToggleCommentLike = useCallback(
    async (entity: Comment | CommentReply) => {
      try {
        const result = entity.is_liked
          ? await commentsService.unlike(entity.id)
          : await commentsService.like(entity.id);
        patchCommentEntity(entity.id, { is_liked: result.is_liked, like_count: result.like_count });
      } catch (e) {
        Alert.alert('操作失败', (e as Error)?.message ?? '暂时无法完成点赞操作');
      }
    },
    [patchCommentEntity]
  );

  const handleOpenCommentSheet = useCallback(() => {
    setCommentSheetVisible(true);
  }, []);

  const handleReplyToComment = useCallback((entity: Comment | CommentReply) => {
    setCommentReplyTarget(entity);
    setCommentSheetVisible(true);
  }, []);

  const handleCancelReply = useCallback(() => {
    setCommentReplyTarget(null);
  }, []);

  const handleCloseCommentSheet = useCallback(() => {
    setCommentSheetVisible(false);
    setCommentReplyTarget(null);
  }, []);

  const handleChangeCommentSort = useCallback((value: string) => {
    if (value === 'latest' || value === 'hot') {
      setCommentSort(value);
    }
  }, []);

  const handleToggleReplies = useCallback(
    async (commentId: string, expand: boolean) => {
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
    },
    []
  );

  const handleScrollToComments = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ y: commentsOffsetRef.current, animated: true });
  }, []);

  const handleOpenImageViewer = useCallback((index: number) => {
    setImageViewer({ visible: true, index });
  }, []);

  const handleCloseImageViewer = useCallback(() => {
    setImageViewer((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleOpenShareSheet = useCallback(() => {
    setShareSheetVisible(true);
  }, []);

  const handleViewerMomentum = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!windowWidth) return;
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
      setImageViewer((prev) => (prev.index === nextIndex ? prev : { ...prev, index: nextIndex }));
    },
    [windowWidth]
  );

  useEffect(() => {
    if (imageViewer.visible && viewerScrollRef.current) {
      viewerScrollRef.current.scrollTo({ x: windowWidth * imageViewer.index, animated: false });
    }
  }, [imageViewer.index, imageViewer.visible, windowWidth]);

  const handleShareToPlatform = useCallback(
    async (platform: 'qq' | 'wechat') => {
      if (!post) return;
      setShareSheetVisible(false);
      const platformLabel = platform === 'qq' ? 'QQ' : '微信';
      try {
        await Share.share({
          message: `${post.title}\n楼层 ID：${post.id}\n来自旦食社区，快来看看！`,
        });
      } catch (error) {
        console.warn('[post_detail] share failed', error);
        Alert.alert('分享失败', `暂时无法分享到${platformLabel}，请稍后再试。`);
      }
    },
    [post]
  );

  const handleCopyPostId = useCallback(async () => {
    if (!post) return;
    setShareSheetVisible(false);
    let copied = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(post.id);
        copied = true;
      }
    } catch (error) {
      console.warn('[post_detail] clipboard write failed', error);
    }

    if (copied) {
      Alert.alert('已复制', '楼层 ID 已复制到剪贴板');
      return;
    }

    try {
      await Share.share({ message: `楼层 ID：${post.id}` });
      Alert.alert('已复制', '楼层 ID 已通过系统分享面板可复制');
    } catch {
      Alert.alert('复制失败', `请手动复制楼层 ID：${post.id}`);
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
        prev
          ? {
              ...prev,
              stats: { ...(prev.stats ?? {}), comment_count: (prev.stats?.comment_count ?? 0) + 1 },
            }
          : prev
      );
      if (commentReplyTarget) {
        setTimeout(() => {
          const targetCommentId = commentReplyTarget.parent_id ?? commentReplyTarget.id;
          const targetIndex = comments.findIndex((c) => c.id === targetCommentId);
          const scrollY = targetIndex >= 0 ? commentsOffsetRef.current + targetIndex * 120 : commentsOffsetRef.current;
          scrollRef.current?.scrollTo({ y: scrollY, animated: true });
        }, 300);
      } else {
        scrollRef.current?.scrollTo({ y: commentsOffsetRef.current, animated: true });
      }
    } catch (e) {
      Alert.alert('评论失败', (e as Error)?.message ?? '暂时无法发表评论');
    }
  }, [commentInput, commentReplyTarget, post, fetchComments, commentSort, comments]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top}>
        <Appbar.BackAction onPress={() => router.back()} />
        {post ? (
          <View style={styles.appbarMain}>
            <View style={styles.appbarAuthorInfo}>
              {post.author?.avatar_url ? (
                <Avatar.Image size={36} source={{ uri: post.author.avatar_url }} />
              ) : (
                <Avatar.Text size={36} label={(post.author?.name ?? '访客').slice(0, 1)} />
              )}
              <View style={styles.appbarAuthorMeta}>
                <Text variant="titleMedium" numberOfLines={1}>
                  {post.author?.name ?? '匿名用户'}
                </Text>
              </View>
            </View>
            <View style={styles.appbarActions}>
              <Chip compact mode="outlined" icon={post.post_type === 'share' ? 'food' : 'account'}>
                {TYPE_LABEL[post.post_type]}
              </Chip>
              <IconButton
                icon="share-variant"
                size={20}
                onPress={handleOpenShareSheet}
                accessibilityLabel="分享帖子"
              />
            </View>
          </View>
        ) : (
          <Appbar.Content title="帖子详情" />
        )}
      </Appbar.Header>

      <ScrollView
        ref={scrollRef}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]}
      >
        {isInitialLoading ? (
          <View style={styles.loaderWrapper}>
            <ActivityIndicator />
            <Text variant="bodyMedium" style={styles.loaderText}>
              正在加载帖子…
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorWrapper}>
            <Text variant="bodyLarge" style={styles.errorText}>
              {error}
            </Text>
            <Button mode="contained-tonal" onPress={() => fetchPost('initial')}>
              重试
            </Button>
          </View>
        ) : post ? (
          <>
            <View style={styles.postContainer}>
              <View style={styles.headerSection}>
                <View style={styles.headerChips}>{headerChips}</View>
                <Text variant="headlineSmall" style={styles.title}>
                  {post.title}
                </Text>
                <View style={styles.authorRow}>
                  <Text
                    variant="bodySmall"
                    style={[styles.authorSubtitle, { color: theme.colors.onSurfaceVariant }]}
                  >
                    由
                  </Text>
                  {post.author ? (
                    <UserAvatar
                      userId={post.author.id}
                      name={post.author.name}
                      avatar_url={post.author.avatar_url}
                      show_name
                      size={20}
                    />
                  ) : (
                    <Text
                      variant="bodySmall"
                      style={[styles.authorSubtitle, { color: theme.colors.onSurfaceVariant }]}
                    >
                      匿名用户
                    </Text>
                  )}
                  <Text
                    variant="bodySmall"
                    style={[styles.authorSubtitle, { color: theme.colors.onSurfaceVariant }]}
                  >
                    发布
                  </Text>
                </View>
              </View>

              {hasImages ? (
                <View style={styles.imageContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.imagesRow}
                  >
                    {post.images?.map((uri, idx) => (
                      <Pressable key={`${uri}-${idx}`} onPress={() => handleOpenImageViewer(idx)}>
                        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Text variant="bodySmall" style={[styles.imageHint, { color: theme.colors.onSurfaceVariant }] }>
                    共 {post.images?.length ?? 0} 张图片
                  </Text>
                </View>
              ) : null}

              <Text variant="bodyLarge" style={styles.content}>
                {post.content}
              </Text>

              {tags.length ? (
                <Text variant="bodySmall" style={[styles.tagsText, { color: theme.colors.onSurfaceVariant }] }>
                  话题：{tags.map((tag) => `#${tag}`).join('、')}
                </Text>
              ) : null}

              <Divider />

              {post.post_type === 'share' ? <ShareDetails post={post as SharePost} /> : null}
              {post.post_type === 'seeking' ? <SeekingDetails post={post as SeekingPost} /> : null}
              {/* {post.post_type === 'companion' ? <CompanionDetails post={post as CompanionPost} /> : null} */}

              <Divider />

              <View style={styles.metaFooter}>
                <Text variant="bodySmall" style={[styles.metaFooterText, { color: theme.colors.onSurfaceVariant }] }>
                  帖子编号：{post.id}
                </Text>
                <Text variant="bodySmall" style={[styles.metaFooterText, { color: theme.colors.onSurfaceVariant }] }>
                  最近更新：{formatDate(post.updated_at ?? post.created_at) || '暂无'}
                </Text>
                <Text variant="bodySmall" style={[styles.metaFooterText, { color: theme.colors.onSurfaceVariant }] }>
                  发布于：{formatDate(post.created_at) || '暂无'}
                </Text>
              </View>
            </View>

            <View
              style={[styles.sectionDividerThick, { backgroundColor: theme.colors.outlineVariant }]}
            />

            <View
              style={styles.commentsSection}
              onLayout={(event) => {
                commentsOffsetRef.current = event.nativeEvent.layout.y;
              }}
            >
              <View style={styles.commentsHeader}>
                <Text variant="titleMedium">共 {commentCount} 条评论</Text>
                <Pressable
                  style={[styles.sortToggle]}
                  onPress={handleCycleCommentSort}
                >
                  <IconButton
                    icon="swap-vertical"
                    size={18}
                    iconColor={theme.colors.onSecondaryContainer}
                    containerColor="transparent"
                    style={styles.sortToggleIcon}
                  />
                  <Text
                    variant="bodySmall"
                    style={[styles.sortToggleText, { color: theme.colors.onSecondaryContainer }]}
                  >
                    {commentSortLabel}
                  </Text>
                </Pressable>
              </View>
              <Text variant="bodySmall" style={[styles.commentsMeta, { color: theme.colors.onSurfaceVariant }]}>
                浏览 {viewCount}
              </Text>
              {actionError ? (
                <Text variant="bodySmall" style={[styles.actionErrorText, { color: theme.colors.error }]}> 
                  {actionError}
                </Text>
              ) : null}
              {commentLoading ? (
                <View style={styles.commentsLoading}>
                  <ActivityIndicator />
                  <Text variant="bodySmall" style={[styles.emptyCommentText, { color: theme.colors.onSurfaceVariant }] }>
                    正在载入评论…
                  </Text>
                </View>
              ) : comments.length ? (
                <View style={styles.commentsList}>
                  {comments.map((item) => {
                    const expanded = !!commentRepliesExpanded[item.id];
                    const repliesPreview = expanded
                      ? commentReplies[item.id] ?? []
                      : (item.replies ?? []).slice(0, 2);
                    const replyTotal = commentRepliesPagination[item.id]?.total ?? item.reply_count ?? repliesPreview.length;
                    const hasReplies = replyTotal > 0;
                    return (
                      <View key={item.id} style={styles.commentCard}>
                        <CommentItem
                          comment={item}
                          replyPreview={hasReplies ? repliesPreview : undefined}
                          replyTotal={hasReplies ? replyTotal : undefined}
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
                  <Text variant="bodyMedium" style={[styles.emptyCommentText, { color: theme.colors.onSurfaceVariant }] }>
                    还没有评论，快来抢沙发吧～
                  </Text>
                  <Button mode="outlined" onPress={handleOpenCommentSheet}>
                    抢个沙发
                  </Button>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyWrapper}>
            <Text variant="bodyLarge">帖子不存在或已被删除</Text>
            <Text variant="bodyMedium" style={[styles.meta, { color: theme.colors.onSurfaceVariant }] }>
              尝试刷新或返回探索页
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
            shadowColor: theme.colors.shadow,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <Pressable
          style={[styles.commentTrigger, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}
          onPress={handleOpenCommentSheet}
        >
          <Text variant="bodyMedium" style={[styles.commentTriggerText, { color: theme.colors.onSurfaceVariant }] }>
            写评论…
          </Text>
        </Pressable>
        <View style={styles.bottomActions}>
          <View style={styles.iconButtonWrapper}>
            <IconButton
              icon={post?.is_favorited ? 'bookmark' : 'bookmark-outline'}
              size={24}
              onPress={handleToggleFavorite}
              disabled={actionLoading.favorite}
              iconColor={post?.is_favorited ? theme.colors.primary : theme.colors.onSurface}
            />
            {favoriteCount ? (
              <Badge style={styles.iconBadge}>{favoriteCount}</Badge>
            ) : null}
          </View>
          <View style={styles.iconButtonWrapper}>
            <IconButton
              icon={post?.is_liked ? 'heart' : 'heart-outline'}
              size={24}
              onPress={handleToggleLike}
              disabled={actionLoading.like}
              iconColor={post?.is_liked ? theme.colors.error : theme.colors.onSurface}
            />
            {likeCount ? (
              <Badge style={styles.iconBadge}>{likeCount}</Badge>
            ) : null}
          </View>
          {/* <View style={styles.iconButtonWrapper}>
            <IconButton icon="message-outline" size={24} onPress={handleScrollToComments} />
            {commentCount ? (
              <Badge style={styles.iconBadge}>{commentCount}</Badge>
            ) : null}
          </View> */}
        </View>
      </View>

      <BottomSheet visible={shareSheetVisible} onClose={() => setShareSheetVisible(false)} height={240}>
        <View style={styles.shareSheetContent}>
          <Text variant="titleMedium">分享至</Text>
          <Text variant="bodySmall" style={[styles.shareSheetHint, { color: theme.colors.onSurfaceVariant }]}>
            选择渠道或复制楼层 ID，方便好友快速找到这条帖子。
          </Text>
          <View style={styles.shareSheetButtons}>
            <Button
              mode="contained-tonal"
              icon="chat-outline"
              onPress={() => handleShareToPlatform('qq')}
              style={styles.shareSheetButton}
            >
              分享到 QQ
            </Button>
            <Button
              mode="contained-tonal"
              icon="wechat"
              onPress={() => handleShareToPlatform('wechat')}
              style={styles.shareSheetButton}
            >
              分享到微信
            </Button>
          </View>
          <Button mode="outlined" icon="content-copy" onPress={handleCopyPostId}>
            复制楼层 ID
          </Button>
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
      <Modal visible={imageViewer.visible} transparent animationType="fade" onRequestClose={handleCloseImageViewer}>
        <View style={styles.viewerOverlay}>
          <IconButton
            icon="close"
            size={24}
            onPress={handleCloseImageViewer}
            iconColor="#fff"
            containerColor="rgba(0,0,0,0.45)"
            style={[styles.viewerCloseButton, { top: insets.top + 12 }]}
          />
          <View style={styles.viewerContent}>
            <ScrollView
              ref={viewerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.viewerScroll}
              contentContainerStyle={styles.viewerPager}
              onMomentumScrollEnd={handleViewerMomentum}
            >
              {(post?.images ?? []).map((uri, idx) => (
                <ScrollView
                  key={`${uri}-${idx}`}
                  style={[styles.viewerPage, { width: windowWidth }]}
                  contentContainerStyle={styles.viewerZoomContainer}
                  minimumZoomScale={1}
                  maximumZoomScale={3}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  centerContent
                  bouncesZoom
                  nestedScrollEnabled
                >
                  <Image
                    source={{ uri }}
                    style={[styles.viewerImage, { width: windowWidth }]}
                    resizeMode="contain"
                  />
                </ScrollView>
              ))}
            </ScrollView>
          </View>
          <Text style={[styles.viewerHint, { color: theme.colors.onPrimary }]}>
            {post?.images?.length ? `${imageViewer.index + 1}/${post.images.length}` : '0/0'} · 捏合放大，左右滑动查看
          </Text>
        </View>
      </Modal>
    </View>
  );
};

export default PostDetailScreen;

const styles = StyleSheet.create({
  appbarMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingRight: 8,
  },
  appbarAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  appbarAuthorMeta: {
    flexShrink: 1,
  },
  appbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loaderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  loaderText: {},
  errorWrapper: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  errorText: {},
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 24,
  },
  postContainer: {
    gap: 16,
  },
  headerSection: {
    gap: 8,
  },
  headerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  authorMeta: {
    flex: 1,
    gap: 2,
    flexShrink: 1,
  },
  authorSubtitle: {
  },
  authorBadge: {
    alignSelf: 'flex-start',
  },
  title: {
    fontWeight: '700',
  },
  meta: {},
  imageContainer: {
    gap: 6,
  },
  imagesRow: {
    gap: 12,
    paddingBottom: 4,
  },
  image: {
    width: 180,
    height: 120,
    borderRadius: 12,
  },
  imageHint: {
    textAlign: 'right',
  },
  content: {
    lineHeight: 22,
  },
  tagsText: {
    marginTop: 4,
  },
  detailSection: {
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  sectionBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    minWidth: 72,
  },
  infoValueWrapper: {
    flex: 1,
  },
  infoValue: {
    flexShrink: 1,
  },
  statusChipOpen: {
    borderColor: '#22c55e',
    paddingHorizontal: 6,
  },
  statusChipFull: {
    borderColor: '#f59e0b',
    paddingHorizontal: 6,
  },
  statusChipClosed: {
    borderColor: '#9ca3af',
    paddingHorizontal: 6,
  },
  metaFooter: {
    gap: 4,
    paddingTop: 4,
  },
  metaFooterText: {},
  emptyWrapper: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 32,
  },
  sectionDividerThick: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    marginVertical: 4,
  },
  commentsSection: {
    gap: 16,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 0,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentsMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  sortToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 999,
    gap: 4,
    borderColor: 'transparent',
  },
  sortToggleIcon: {
    margin: 0,
  },
  sortToggleActive: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  sortToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortPanel: {
    marginTop: 8,
    marginBottom: 4,
  },
  commentsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    flexWrap: 'wrap',
  },
  commentsList: {
    gap: 16,
  },
  commentsLoading: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  actionErrorText: {
    marginBottom: -8,
  },
  commentCard: {
    gap: 12,
    paddingVertical: 8,
    paddingLeft: 0,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  commentBody: {
    flex: 1,
    gap: 4,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  commentTimestamp: {},
  commentContent: {
    lineHeight: 20,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  emptyCommentText: {
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
    borderTopWidth: 1,
    elevation: 8,
  },
  commentTrigger: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  commentTriggerText: {
    color: '#666',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButtonWrapper: {
    position: 'relative',
  },
  iconBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  commentSheetContent: {
    gap: 12,
  },
  commentSheetHint: {},
  commentSheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  shareSheetContent: {
    gap: 16,
    paddingBottom: 12,
  },
  shareSheetHint: {},
  shareSheetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  shareSheetButton: {
    flex: 1,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  viewerCloseButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  viewerContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  viewerScroll: {
    flex: 1,
  },
  viewerPager: {
    flexGrow: 1,
    alignItems: 'center',
  },
  viewerPage: {
    flex: 1,
  },
  viewerZoomContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    height: '85%',
  },
  viewerHint: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
});
