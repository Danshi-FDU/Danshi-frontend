import React, { useState } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Card, Chip, Text, useTheme as usePaperTheme, IconButton, Menu } from 'react-native-paper';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Post } from '@/src/models/Post';
import { UserAvatar } from '@/src/components/user_avatar';

const TYPE_LABEL: Record<Post['post_type'] | 'companion', string> = {
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

function getCompanionInfo(post: Post) {
  return (post as any).meeting_info ?? (post as any).meetingInfo;
}

type PostCardProps = {
  post: Post;
  onPress?: (postId: string) => void;
  style?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
  appearance?: 'flat' | 'elevated';
  showActions?: boolean;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
};

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  onPress, 
  style, 
  footer, 
  appearance = 'flat',
  showActions = false,
  onEdit,
  onDelete
}) => {
  const theme = usePaperTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const firstImage = post.images?.[0];
  const companionInfo = getCompanionInfo(post);
  const priceLabel =
    post.post_type === 'share' && post.share_type === 'recommend' && typeof post.price === 'number'
      ? `￥${post.price.toFixed(2)}`
      : null;
  const statusLabel =
    post.post_type === 'companion' && companionInfo?.status
      ? COMPANION_STATUS_LABEL[companionInfo.status as keyof typeof COMPANION_STATUS_LABEL]
      : null;

  const chipItems: { key: string; label: string; mode: 'flat' | 'outlined' }[] = [
    { key: 'type', label: TYPE_LABEL[post.post_type] ?? TYPE_LABEL.share, mode: 'flat' },
  ];

  if (post.post_type === 'share' && post.share_type) {
    chipItems.push({ key: 'share', label: SHARE_LABEL[post.share_type], mode: 'outlined' });
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
        <View style={styles.titleRow}>
          <Text variant="titleMedium" numberOfLines={2} style={[styles.cardTitle, showActions && styles.cardTitleWithActions]}>
            {post.title}
          </Text>
          {showActions && (
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={20}
                  onPress={() => setMenuVisible(true)}
                  style={styles.actionButton}
                />
              }
            >
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  onEdit?.(post.id);
                }}
                title="编辑"
                leadingIcon="pencil"
              />
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  onDelete?.(post.id);
                }}
                title="删除"
                leadingIcon="delete"
                titleStyle={{ color: theme.colors.error }}
              />
            </Menu>
          )}
        </View>
        <View style={styles.authorRow}>
          {post.author ? (
            <UserAvatar
              userId={post.author.id}
              name={post.author.name}
              avatar_url={post.author.avatar_url}
              showName
              size={16}
            />
          ) : (
            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={[styles.authorName, { color: theme.colors.onSurfaceVariant }]}
            >
              匿名用户
            </Text>
          )}
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
              name={post.is_liked ? 'heart' : 'heart-outline'}
              size={16}
              color={post.is_liked ? theme.colors.error : theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={[styles.likeCount, { color: theme.colors.onSurfaceVariant }] }>
              {post.stats?.like_count ?? 0}
            </Text>
          </View>
        </View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Card.Content>
    </Card>
  );
};

export function estimatePostCardHeight(post: Post, minHeight: number, maxHeight: number): number {
  const companionInfo = getCompanionInfo(post);
  const base = post.images?.length ? 260 : 190;
  const titleExtra = Math.min(140, (post.title?.length ?? 0) * 2.2);
  const chipCount =
    1 +
    (post.post_type === 'share' && post.share_type ? 1 : 0) +
    (post.category ? 1 : 0) +
    (post.canteen ? 1 : 0);
  const chipExtra = chipCount * 14;
  const middleExtra =
    post.post_type === 'share' && post.share_type === 'recommend' && typeof post.price === 'number'
      ? 26
      : post.post_type === 'companion' && companionInfo?.status
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    fontWeight: '600',
    flex: 1,
  },
  cardTitleWithActions: {
    paddingRight: 8,
  },
  actionButton: {
    margin: 0,
    marginTop: -8,
    marginRight: -8,
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
