import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Card, Chip, Text, useTheme as usePaperTheme } from 'react-native-paper';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Post } from '@/src/models/Post';

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

type PostCardProps = {
  post: Post;
  onPress?: (postId: string) => void;
  style?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
  appearance?: 'flat' | 'elevated';
};

export const PostCard: React.FC<PostCardProps> = ({ post, onPress, style, footer, appearance = 'flat' }) => {
  const theme = usePaperTheme();
  const firstImage = post.images?.[0];
  const priceLabel =
    post.postType === 'share' && post.shareType === 'recommend' && typeof post.price === 'number'
      ? `￥${post.price.toFixed(2)}`
      : null;
  const statusLabel =
    post.postType === 'companion' && post.meetingInfo?.status
      ? COMPANION_STATUS_LABEL[post.meetingInfo.status]
      : null;

  const chipItems: { key: string; label: string; mode: 'flat' | 'outlined' }[] = [
    { key: 'type', label: TYPE_LABEL[post.postType], mode: 'flat' },
  ];

  if (post.postType === 'share' && post.shareType) {
    chipItems.push({ key: 'share', label: SHARE_LABEL[post.shareType], mode: 'outlined' });
  }

  chipItems.push({ key: 'category', label: post.category === 'recipe' ? '食谱' : '美食', mode: 'outlined' });

  if (post.canteen) {
    chipItems.push({ key: 'canteen', label: post.canteen, mode: 'outlined' });
  }

  const handlePress = () => {
    if (onPress) onPress(post.id);
  };

  return (
    <Card
      mode={appearance === 'flat' ? 'contained' : 'elevated'}
      onPress={handlePress}
      style={[
        styles.card,
        appearance === 'flat' ? [styles.flatCard, { backgroundColor: theme.colors.surface }] : null,
        style,
      ]}
      accessibilityLabel={`查看帖子 ${post.title}`}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {firstImage ? <Card.Cover source={{ uri: firstImage }} style={styles.cardCover} /> : null}
      <Card.Content style={styles.cardContent}>
        <View style={styles.tagRow}>
          {chipItems.map((chip) => (
            <Chip key={chip.key} compact mode={chip.mode} style={styles.tagChip} textStyle={styles.tagChipText}>
              {chip.label}
            </Chip>
          ))}
        </View>
        <Text variant="titleMedium" numberOfLines={2} style={styles.cardTitle}>
          {post.title}
        </Text>
        <View style={styles.authorRow}>
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={[styles.authorName, { color: theme.colors.onSurfaceVariant }]}
          >
            {post.author?.name ?? '匿名用户'}
          </Text>
          {priceLabel ? (
            <Text variant="bodySmall" style={[styles.middleMeta, { color: theme.colors.primary }] }>
              {priceLabel}
            </Text>
          ) : null}
          {statusLabel && !priceLabel ? (
            <Text variant="bodySmall" style={[styles.middleMeta, { color: theme.colors.tertiary }] }>
              {statusLabel}
            </Text>
          ) : null}
          <View style={styles.likesRow}>
            <Ionicons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={16}
              color={post.isLiked ? theme.colors.error : theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={[styles.likeCount, { color: theme.colors.onSurfaceVariant }] }>
              {post.stats?.likeCount ?? 0}
            </Text>
          </View>
        </View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Card.Content>
    </Card>
  );
};

export function estimatePostCardHeight(post: Post, minHeight: number, maxHeight: number): number {
  const base = post.images?.length ? 260 : 190;
  const titleExtra = Math.min(140, (post.title?.length ?? 0) * 2.2);
  const chipCount =
    1 +
    (post.postType === 'share' && post.shareType ? 1 : 0) +
    (post.category ? 1 : 0) +
    (post.canteen ? 1 : 0);
  const chipExtra = chipCount * 14;
  const middleExtra =
    post.postType === 'share' && post.shareType === 'recommend' && typeof post.price === 'number'
      ? 26
      : post.postType === 'companion' && post.meetingInfo?.status
      ? 22
      : 14;
  const idSeed = post.id
    ? Array.from(post.id).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 48
    : 0;
  const raw = base + titleExtra + chipExtra + middleExtra + idSeed;
  return Math.max(minHeight, Math.min(maxHeight, raw));
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  flatCard: {
    elevation: 0,
    shadowColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  cardCover: {
    height: 160,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  cardContent: {
    gap: 10,
    paddingVertical: 14,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    height: 28,
  },
  tagChipText: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardTitle: {
    fontWeight: '600',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    flexShrink: 1,
  },
  middleMeta: {
    fontWeight: '600',
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  likeCount: {
    fontVariant: ['tabular-nums'],
  },
  footer: {
    marginTop: 4,
    gap: 6,
  },
});
