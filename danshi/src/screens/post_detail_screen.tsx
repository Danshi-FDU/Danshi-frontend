import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Image,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {
  Appbar,
  ActivityIndicator,
  Chip,
  Divider,
  Avatar,
  Button,
  Text,
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
            value={
              <View style={styles.inlineChipRow}>
                {post.flavors.map((flavor) => (
                  <Chip key={flavor} compact mode="outlined">
                    {flavor}
                  </Chip>
                ))}
              </View>
            }
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

  const fetchPost = useCallback(
    async (mode: LoaderState = 'initial') => {
      setLoader(mode);
      if (mode !== 'refresh') setError(null);
      try {
        const data = await postsService.get(postId);
        setPost(data);
        setActionError(null);
        setActionLoading({ like: false, favorite: false });
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

  const hasImages = post?.images?.length;

  const tags = useMemo(() => post?.tags ?? [], [post?.tags]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={post?.title ?? '帖子详情'} />
        <Appbar.Action
          icon="refresh"
          onPress={() => fetchPost('initial')}
          disabled={isInitialLoading || refreshing}
          accessibilityLabel="刷新帖子"
        />
      </Appbar.Header>

      {isInitialLoading ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator />
          <Text style={[styles.loaderText, { color: theme.colors.onSurfaceVariant }]}>加载中…</Text>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                shadowColor: theme.colors.shadow,
              },
            ]}
          >
            <View style={styles.headerSection}>
              <View style={styles.headerChips}>
                <Chip compact>{TYPE_LABEL[post.postType]}</Chip>
                {post.postType === 'share' ? (
                  <Chip compact>{SHARE_LABEL[(post as SharePost).shareType]}</Chip>
                ) : null}
                <Chip compact mode="outlined">{post.category === 'recipe' ? '食谱' : '美食'}</Chip>
              </View>
              <Text variant="headlineSmall" style={styles.title}>
                {post.title}
              </Text>
              <View style={styles.authorRow}>
                {post.author?.avatarUrl ? (
                  <Avatar.Image size={48} source={{ uri: post.author.avatarUrl }} />
                ) : (
                  <Avatar.Text size={48} label={(post.author?.name ?? '访客').slice(0, 1)} />
                )}
                <View style={styles.authorMeta}>
                  <Text variant="titleMedium">{post.author?.name ?? '匿名用户'}</Text>
                  <Text
                    variant="bodySmall"
                    style={[styles.authorSubtitle, { color: theme.colors.onSurfaceVariant }] }
                  >
                    发布于 {formatDate(post.createdAt) || '未知'}
                  </Text>
                  {post.updatedAt && post.updatedAt !== post.createdAt ? (
                    <Text
                      variant="bodySmall"
                      style={[styles.authorSubtitle, { color: theme.colors.onSurfaceVariant }] }
                    >
                      更新于 {formatDate(post.updatedAt) || '未知'}
                    </Text>
                  ) : null}
                </View>
                {post.canteen ? (
                  <Chip compact mode="outlined" style={styles.authorBadge} icon="storefront-outline">
                    {post.canteen}
                  </Chip>
                ) : null}
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
                    <Image
                      key={`${uri}-${idx}`}
                      source={{ uri }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                <Text variant="bodySmall" style={[styles.imageHint, { color: theme.colors.onSurfaceVariant }] }>
                  共 {post.images?.length ?? 0} 张图片
                </Text>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <Button
                mode={post.isLiked ? 'contained-tonal' : 'outlined'}
                icon={post.isLiked ? 'heart' : 'heart-outline'}
                onPress={handleToggleLike}
                loading={actionLoading.like}
                disabled={actionLoading.like}
                compact
                style={styles.actionButton}
              >
                {`点赞 ${post.stats?.likeCount ?? 0}`}
              </Button>
              <Button
                mode={post.isFavorited ? 'contained-tonal' : 'outlined'}
                icon={post.isFavorited ? 'bookmark' : 'bookmark-outline'}
                onPress={handleToggleFavorite}
                loading={actionLoading.favorite}
                disabled={actionLoading.favorite}
                compact
                style={styles.actionButton}
              >
                {`收藏 ${post.stats?.favoriteCount ?? 0}`}
              </Button>
              <Chip compact mode="outlined" icon="message-outline" style={styles.actionStatsChip}>
                {`评论 ${post.stats?.commentCount ?? 0}`}
              </Chip>
              <Chip compact mode="outlined" icon="eye-outline" style={styles.actionStatsChip}>
                {`浏览 ${post.stats?.viewCount ?? 0}`}
              </Chip>
            </View>
            {actionError ? (
              <Text variant="bodySmall" style={[styles.actionErrorText, { color: theme.colors.error }] }>
                {actionError}
              </Text>
            ) : null}

            <Divider />

            <Text variant="bodyLarge" style={styles.content}>
              {post.content}
            </Text>

            {tags.length ? (
              <View style={styles.tagsRow}>
                {tags.map((tag) => (
                  <Chip key={tag} compact mode="outlined">
                    #{tag}
                  </Chip>
                ))}
              </View>
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
            </View>
          </View>
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
    </View>
  );
};

export default PostDetailScreen;

const styles = StyleSheet.create({
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
  card: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
    elevation: 1,
    borderWidth: 1,
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
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flexGrow: 1,
    minWidth: 140,
    flexBasis: '48%',
  },
  actionStatsChip: {
    alignSelf: 'center',
  },
  actionErrorText: {
    marginTop: -4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  inlineChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusChipOpen: {
    borderColor: '#22c55e',
  },
  statusChipFull: {
    borderColor: '#f59e0b',
  },
  statusChipClosed: {
    borderColor: '#9ca3af',
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
});
