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
  TextInput,
  useTheme as usePaperTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { postsService } from '@/src/services/posts_service';
import type {
  CompanionPost,
  Post,
  SeekingPost,
  SharePost,
} from '@/src/models/Post';
import { BottomSheet } from '@/src/components/overlays/bottom_sheet';

const TYPE_LABEL: Record<Post['postType'], string> = {
  share: '分享',
  seeking: '求助',
  companion: '拼单/搭子',
};

const SHARE_LABEL: Record<'recommend' | 'warning', string> = {
  recommend: '推荐',
  warning: '避雷',
};

const COMPANION_STATUS_LABEL: Record<'open' | 'full' | 'closed', string> = {
  open: '招募中',
  full: '已满员',
  closed: '已结束',
};

const CONTACT_LABEL: Record<'comment' | 'wechat' | 'other', string> = {
  comment: '评论交流',
  wechat: '微信',
  other: '其他方式',
};

type CommentItem = {
  id: string;
  author: string;
  avatarUrl?: string;
  content: string;
  createdAt: string;
};

const COMMENT_SEEDS: Record<Post['postType'] | 'default', Array<Omit<CommentItem, 'id' | 'createdAt'>>> = {
  share: [
    {
      author: '赵一凡',
      avatarUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=80&h=80&crop=faces',
      content: '感谢分享！椒麻鸡看起来好馋人，下次去南区必须试试。',
    },
    {
      author: '宋瑶',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&crop=faces',
      content: '同感！推荐搭配他们家的酸梅汤，超级解腻。',
    },
  ],
  seeking: [
    {
      author: '徐晨',
      avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=80&h=80&crop=faces',
      content: '江湾一楼的清粥小菜不错，建议早上 8 点前去人少。',
    },
    {
      author: '韩子墨',
      content: '可以试试豆浆摊的全麦包子，很清爽。',
    },
  ],
  companion: [
    {
      author: '顾明远',
      avatarUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80&h=80&crop=faces',
      content: '已私信，周五一起！',
    },
    {
      author: '冯琳',
      content: '能不能顺便试试隔壁的烤冷面？',
    },
  ],
  default: [
    {
      author: '校园吃货',
      content: '赞！已经收藏。',
    },
  ],
};

function buildMockComments(post: Post): CommentItem[] {
  const baseTime = post.updatedAt ?? post.createdAt ?? new Date().toISOString();
  const baseMs = new Date(baseTime).getTime() || Date.now();
  const seeds = COMMENT_SEEDS[post.postType] ?? COMMENT_SEEDS.default;
  return seeds.map((seed, index) => ({
    id: `${post.id}-comment-${index + 1}`,
    author: seed.author,
    avatarUrl: seed.avatarUrl,
    content: seed.content,
    createdAt: new Date(baseMs - (index + 1) * 3600 * 1000).toISOString(),
  }));
}

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
        <InfoItem label="分享类型" value={SHARE_LABEL[post.shareType]} />
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
  const budget = post.budgetRange;
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
        {prefers?.preferFlavors?.length ? (
          <InfoItem label="偏好口味" value={prefers.preferFlavors.join('、')} />
        ) : null}
        {prefers?.avoidFlavors?.length ? (
          <InfoItem label="忌口" value={prefers.avoidFlavors.join('、')} />
        ) : null}
      </View>
    </View>
  );
}

function CompanionDetails({ post }: { post: CompanionPost }) {
  const meeting = post.meetingInfo;
  const contact = post.contact;
  const statusLabel = meeting?.status ? COMPANION_STATUS_LABEL[meeting.status] : undefined;
  const statusChip = meeting?.status ? (
    <Chip
      compact
      mode="outlined"
      style={
        meeting.status === 'open'
          ? styles.statusChipOpen
          : meeting.status === 'full'
          ? styles.statusChipFull
          : styles.statusChipClosed
      }
    >
      {statusLabel}
    </Chip>
  ) : null;
  const methodLabel = contact?.method ? CONTACT_LABEL[contact.method] ?? CONTACT_LABEL.other : undefined;
  const timeValue = [meeting?.date, meeting?.time].filter(Boolean).join(' ');
  const peopleValue =
    typeof meeting?.maxPeople === 'number'
      ? `${meeting.currentPeople ?? 0}/${meeting.maxPeople}`
      : undefined;

  return (
    <View style={styles.detailSection}>
      <Text variant="titleSmall" style={styles.sectionTitle}>
        拼单/搭子信息
      </Text>
      <View style={styles.sectionBody}>
        <InfoItem label="时间" value={timeValue || undefined} />
        <InfoItem label="地点" value={meeting?.location} />
        <InfoItem label="人数" value={peopleValue} />
        <InfoItem label="费用分摊" value={meeting?.costSharing} />
        <InfoItem label="当前状态" value={statusChip} />
        <InfoItem label="沟通方式" value={methodLabel} />
        <InfoItem label="备注" value={contact?.note} />
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [imageViewer, setImageViewer] = useState<{ visible: boolean; index: number }>({ visible: false, index: 0 });
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const commentsOffsetRef = useRef(0);
  const viewerScrollRef = useRef<ScrollView | null>(null);
  const windowWidth = useWindowDimensions().width;

  const fetchPost = useCallback(
    async (mode: LoaderState = 'initial') => {
      setLoader(mode);
      if (mode !== 'refresh') setError(null);
      try {
        const data = await postsService.get(postId);
        const seededComments = buildMockComments(data);
        let nextComments: CommentItem[] = [];
        setComments((prev) => {
          const next = mode === 'initial' ? seededComments : prev.length ? prev : seededComments;
          nextComments = next;
          return next;
        });
        setPost({
          ...data,
          stats: { ...(data.stats ?? {}), commentCount: nextComments.length },
        });
        setActionError(null);
        setActionLoading({ like: false, favorite: false });
        setShareSheetVisible(false);
        if (mode === 'initial') setIsFollowing(false);
        if (mode === 'initial') setCommentInput('');
      } catch (e) {
        const message = (e as Error)?.message ?? '加载帖子失败';
        setError(message);
      } finally {
        setLoader('idle');
      }
    },
    [postId]
  );

  useEffect(() => {
    fetchPost('initial');
  }, [fetchPost]);

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
      const { isLiked, likeCount } = post.isLiked
        ? await postsService.unlike(post.id)
        : await postsService.like(post.id);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              isLiked,
              stats: { ...(prev.stats ?? {}), likeCount },
            }
          : prev
      );
    } catch (e) {
      const message = (e as Error)?.message ?? '点赞失败，请稍后重试';
      setActionError(message);
    } finally {
      setActionLoading((prev) => ({ ...prev, like: false }));
    }
  }, [post?.id, post?.isLiked]);

  const handleToggleFavorite = useCallback(async () => {
    if (!post) return;
    setActionError(null);
    setActionLoading((prev) => ({ ...prev, favorite: true }));
    try {
      const { isFavorited, favoriteCount } = post.isFavorited
        ? await postsService.unfavorite(post.id)
        : await postsService.favorite(post.id);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              isFavorited,
              stats: { ...(prev.stats ?? {}), favoriteCount },
            }
          : prev
      );
    } catch (e) {
      const message = (e as Error)?.message ?? '收藏失败，请稍后重试';
      setActionError(message);
    } finally {
      setActionLoading((prev) => ({ ...prev, favorite: false }));
    }
  }, [post?.id, post?.isFavorited]);

  const handleToggleFollow = useCallback(() => {
    setIsFollowing((prev) => !prev);
  }, []);

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
        {TYPE_LABEL[post.postType]}
      </Chip>
    );
    if (post.postType === 'share') {
      chips.push(
        <Chip compact key="shareType">
          {SHARE_LABEL[(post as SharePost).shareType]}
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
  const likeCount = post?.stats?.likeCount ?? 0;
  const favoriteCount = post?.stats?.favoriteCount ?? 0;
  const viewCount = post?.stats?.viewCount ?? 0;
  const commentCount = post?.stats?.commentCount ?? comments.length;

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
    } catch (error) {
      Alert.alert('复制失败', `请手动复制楼层 ID：${post.id}`);
    }
  }, [post]);

  const handleSubmitComment = useCallback(() => {
    if (!post) return;
    const content = commentInput.trim();
    if (!content) return;
    const now = new Date().toISOString();
    const newComment: CommentItem = {
      id: `${post.id}-comment-${Date.now()}`,
      author: '我',
      content,
      createdAt: now,
    };
    setComments((prev) => [newComment, ...prev]);
    setPost((prev) =>
      prev
        ? {
            ...prev,
            stats: { ...(prev.stats ?? {}), commentCount: (prev.stats?.commentCount ?? 0) + 1 },
          }
        : prev
    );
    setCommentInput('');
    setCommentSheetVisible(false);
  }, [commentInput, post]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top}>
        <Appbar.BackAction onPress={() => router.back()} />
        {post ? (
          <View style={styles.appbarMain}>
            <View style={styles.appbarAuthorInfo}>
              {post.author?.avatarUrl ? (
                <Avatar.Image size={36} source={{ uri: post.author.avatarUrl }} />
              ) : (
                <Avatar.Text size={36} label={(post.author?.name ?? '访客').slice(0, 1)} />
              )}
              <View style={styles.appbarAuthorMeta}>
                <Text variant="titleMedium" numberOfLines={1}>
                  {post.author?.name ?? '匿名用户'}
                </Text>
                <Text
                  variant="bodySmall"
                  numberOfLines={1}
                  style={[styles.appbarAuthorSubtitle, { color: theme.colors.onSurfaceVariant }]}
                >
                  发布于 {formatDate(post.createdAt) || '未知'}
                </Text>
              </View>
            </View>
            <View style={styles.appbarActions}>
              <Button
                mode={isFollowing ? 'contained-tonal' : 'outlined'}
                compact
                onPress={handleToggleFollow}
              >
                {isFollowing ? '已关注' : '关注'}
              </Button>
              <IconButton
                icon="share-variant"
                onPress={() => setShareSheetVisible(true)}
                accessibilityLabel="分享帖子"
              />
            </View>
          </View>
        ) : (
          <View style={styles.appbarMain} />
        )}
      </Appbar.Header>

      {isInitialLoading ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator />
          <Text style={[styles.loaderText, { color: theme.colors.onSurfaceVariant }]}>加载中…</Text>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 160, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {error && !isInitialLoading ? (
          <View style={styles.errorWrapper}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
            <Chip icon="refresh" mode="outlined" onPress={() => fetchPost('initial')}>
              重新加载
            </Chip>
          </View>
        ) : null}

        {post ? (
          <>
            <View style={styles.postContainer}>
              <View style={styles.headerSection}>
                <View style={styles.headerChips}>{headerChips}</View>
                <Text variant="headlineSmall" style={styles.title}>
                  {post.title}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.authorSubtitle, { color: theme.colors.onSurfaceVariant }]}
                >
                  由 {post.author?.name ?? '匿名用户'} 发布
                </Text>
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

              {post.postType === 'share' ? <ShareDetails post={post as SharePost} /> : null}
              {post.postType === 'seeking' ? <SeekingDetails post={post as SeekingPost} /> : null}
              {post.postType === 'companion' ? <CompanionDetails post={post as CompanionPost} /> : null}

              <Divider />

              <View style={styles.metaFooter}>
                <Text variant="bodySmall" style={[styles.metaFooterText, { color: theme.colors.onSurfaceVariant }] }>
                  帖子编号：{post.id}
                </Text>
                <Text variant="bodySmall" style={[styles.metaFooterText, { color: theme.colors.onSurfaceVariant }] }>
                  最近更新：{formatDate(post.updatedAt ?? post.createdAt) || '暂无'}
                </Text>
                <Text variant="bodySmall" style={[styles.metaFooterText, { color: theme.colors.onSurfaceVariant }] }>
                  发布于：{formatDate(post.createdAt) || '暂无'}
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
                <Text variant="titleMedium">评论</Text>
                <View style={styles.commentsHeaderBadges}>
                  <Chip compact icon="message-outline" mode="outlined">
                    共 {commentCount}
                  </Chip>
                  <Chip compact icon="eye-outline" mode="outlined">
                    浏览 {viewCount}
                  </Chip>
                </View>
              </View>
              {actionError ? (
                <Text variant="bodySmall" style={[styles.actionErrorText, { color: theme.colors.error }]}>
                  {actionError}
                </Text>
              ) : null}
              {comments.length ? (
                <View style={styles.commentsList}>
                  {comments.map((item) => (
                    <View key={item.id} style={styles.commentItem}>
                      {item.avatarUrl ? (
                        <Avatar.Image size={40} source={{ uri: item.avatarUrl }} />
                      ) : (
                        <Avatar.Text size={40} label={item.author.slice(0, 1)} />
                      )}
                      <View style={styles.commentBody}>
                        <View style={styles.commentHeaderRow}>
                          <Text variant="labelLarge">{item.author}</Text>
                          <Text variant="bodySmall" style={[styles.commentTimestamp, { color: theme.colors.onSurfaceVariant }]}>
                            {formatDate(item.createdAt)}
                          </Text>
                        </View>
                        <Text variant="bodyMedium" style={styles.commentContent}>
                          {item.content}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyComments}>
                  <Text variant="bodyMedium" style={[styles.emptyCommentText, { color: theme.colors.onSurfaceVariant }] }>
                    还没有评论，快来抢沙发吧～
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : null}

        {!post && !error && !isInitialLoading ? (
          <View style={styles.emptyWrapper}>
            <Text variant="bodyLarge">帖子不存在或已被删除</Text>
            <Text variant="bodyMedium" style={[styles.meta, { color: theme.colors.onSurfaceVariant }] }>
              尝试刷新或返回探索页
            </Text>
          </View>
        ) : null}
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
          onPress={() => setCommentSheetVisible(true)}
        >
          <Text variant="bodyMedium" style={[styles.commentTriggerText, { color: theme.colors.onSurfaceVariant }]}>
            写评论…
          </Text>
        </Pressable>
        <View style={styles.bottomActions}>
          <View style={styles.iconButtonWrapper}>
            <IconButton
              icon={post?.isFavorited ? 'bookmark' : 'bookmark-outline'}
              size={24}
              onPress={handleToggleFavorite}
              disabled={actionLoading.favorite}
              iconColor={post?.isFavorited ? theme.colors.primary : theme.colors.onSurface}
            />
            {favoriteCount ? (
              <Badge style={styles.iconBadge}>{favoriteCount}</Badge>
            ) : null}
          </View>
          <View style={styles.iconButtonWrapper}>
            <IconButton
              icon={post?.isLiked ? 'heart' : 'heart-outline'}
              size={24}
              onPress={handleToggleLike}
              disabled={actionLoading.like}
              iconColor={post?.isLiked ? theme.colors.error : theme.colors.onSurface}
            />
            {likeCount ? (
              <Badge style={styles.iconBadge}>{likeCount}</Badge>
            ) : null}
          </View>
          <View style={styles.iconButtonWrapper}>
            <IconButton icon="message-outline" size={24} onPress={handleScrollToComments} />
            {commentCount ? (
              <Badge style={styles.iconBadge}>{commentCount}</Badge>
            ) : null}
          </View>
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
      <BottomSheet visible={commentSheetVisible} onClose={() => setCommentSheetVisible(false)} height={280}>
        <View style={styles.commentSheetContent}>
          <Text variant="titleMedium">写评论</Text>
          <Text variant="bodySmall" style={[styles.commentSheetHint, { color: theme.colors.onSurfaceVariant }]}>
            分享你的想法吧～
          </Text>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder="说点什么..."
            value={commentInput}
            onChangeText={setCommentInput}
          />
          <View style={styles.commentSheetActions}>
            <Button mode="text" onPress={() => setCommentSheetVisible(false)}>
              取消
            </Button>
            <Button mode="contained" onPress={handleSubmitComment} disabled={!commentInput.trim()}>
              发送
            </Button>
          </View>
        </View>
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
  appbarAuthorSubtitle: {},
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
    gap: 12,
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
    width: 220,
    height: 160,
    borderRadius: 12,
  },
  imageHint: {
    alignSelf: 'flex-end',
  },
  content: {
    lineHeight: 22,
  },
  actionErrorText: {
    marginTop: -4,
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
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentsHeaderBadges: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  commentsList: {
    gap: 16,
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
