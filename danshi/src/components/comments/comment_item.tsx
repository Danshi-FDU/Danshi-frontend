import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Avatar, Button, IconButton, Text, useTheme as usePaperTheme } from 'react-native-paper';
import type { CommentEntity, MentionedUser } from '@/src/models/Comment';
import { UserAvatar } from '@/src/components/user_avatar';

type BaseProps = {
  onLike?: (comment: CommentEntity) => void;
  onReply?: (comment: CommentEntity) => void;
  onMoreOptions?: (comment: CommentEntity) => void;
  onShowReplies?: (comment: CommentEntity) => void;
};

type CommentItemProps = BaseProps & {
  comment: CommentEntity;
  isReply?: boolean;
  depth?: number;
  showMentionHighlight?: boolean;
  maxContentLines?: number;
  replyCount?: number;
  showReplySummary?: boolean;
};

function formatRelativeTime(dateString: string) {
  if (!dateString) return '';
  const now = Date.now();
  const target = new Date(dateString).getTime();
  const diffMs = Math.max(0, now - target);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(dateString).toLocaleDateString();
}

function MentionedText({ mentions }: { mentions?: MentionedUser[] }) {
  if (!mentions?.length) return null;
  return (
    <View style={styles.mentionRow}>
      {mentions.map((mention, idx) => (
        <React.Fragment key={mention.id}>
          <UserAvatar
            userId={mention.id}
            name={`@${mention.name}`}
            size={16}
            show_name
          />
          {idx < mentions.length - 1 ? <Text> </Text> : null}
        </React.Fragment>
      ))}
    </View>
  );
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isReply = false,
  depth = 0,
  maxContentLines,
  replyCount,
  showReplySummary = true,
  onLike,
  onReply,
  onMoreOptions,
  onShowReplies,
}) => {
  const theme = usePaperTheme();
  const isAuthor = comment.is_author;
  const handleLike = () => onLike?.(comment);
  const handleReply = () => onReply?.(comment);
  const handleMoreOptions = () => onMoreOptions?.(comment);
  const handleShowReplies = () => onShowReplies?.(comment);
  const totalReplyCount = replyCount ?? 0;
  const showReplySummaryButton = showReplySummary && totalReplyCount > 0 && !!onShowReplies;

  const isNested = isReply || depth > 0;
  const avatarSize = 40;

  const containerStyles = [styles.container];
  if (isNested) {
    containerStyles.push(styles.replyContainer);
    containerStyles.push(depth === 1 ? styles.replyFirstLevel : styles.replySubsequent);
  }

  const bodyStyles = [styles.body];

  const relativeTime = formatRelativeTime(comment.created_at);

  return (
    <View style={containerStyles}>
      <View style={[styles.avatarColumn, isNested && styles.replyAvatarColumn]}>
        {comment.author ? (
          <UserAvatar
            userId={comment.author.id}
            name={comment.author.name}
            avatar_url={comment.author.avatar_url}
            size={avatarSize}
          />
        ) : (
          <Avatar.Text size={avatarSize} label="?" />
        )}
      </View>
      <View style={bodyStyles}>
        <View style={styles.headerRow}>
          <View style={styles.authorBlock}>
            <Text style={[styles.authorName, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {comment.author?.name || '匿名用户'}
            </Text>
            {isAuthor ? (
              <Text style={[styles.authorBadge, { color: theme.colors.primary }]}>
                作者
              </Text>
            ) : null}
          </View>
          <IconButton
            icon="dots-horizontal"
            size={18}
            onPress={handleMoreOptions}
            accessibilityLabel="更多操作"
            iconColor={theme.colors.onSurfaceVariant}
            style={styles.moreButton}
            disabled={!onMoreOptions}
          />
        </View>

        <Pressable style={styles.bodyPressable} onPress={handleReply}>
          <MentionedText mentions={comment.mentioned_users} />
          {comment.reply_to ? (
            <Text style={[styles.replyingText, { color: theme.colors.primary }]}>Replying to @{comment.reply_to.name}</Text>
          ) : null}
          <Text
            variant="bodyMedium"
            style={[styles.content, { color: theme.colors.onSurface }]}
            numberOfLines={maxContentLines}
          >
            {comment.content}
          </Text>
        </Pressable>

        <View style={styles.metaRow}>
          {relativeTime ? (
            <Text style={[styles.timestamp, { color: theme.colors.onSurfaceVariant }]}>{relativeTime}</Text>
          ) : null}
          <View style={styles.metaActions}>
            <Button
              mode="text"
              compact
              onPress={handleReply}
              textColor={theme.colors.onSurfaceVariant}
              uppercase={false}
            >
              回复
            </Button>
            <Pressable style={styles.likeButton} onPress={handleLike}>
              <IconButton
                size={18}
                icon={comment.is_liked ? 'heart' : 'heart-outline'}
                iconColor={comment.is_liked ? theme.colors.error : theme.colors.onSurfaceVariant}
              />
              <Text variant="bodySmall" style={styles.actionCount}>
                {comment.like_count}
              </Text>
            </Pressable>
          </View>
        </View>

        {showReplySummaryButton ? (
          <Pressable
            onPress={handleShowReplies}
            style={styles.replySummaryButton}
          >
            <Text style={[styles.replySummaryText, { color: theme.colors.primary }]}>
              共{totalReplyCount}条回复 &gt;
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  body: {
    flex: 1,
    gap: 8,
  },
  bodyPressable: {
    gap: 6,
  },
  replyContainer: {
    paddingVertical: 6,
  },
  replyFirstLevel: {
    marginLeft: 56,
  },
  replySubsequent: {
    marginLeft: 56,
  },
  avatarColumn: {
    width: 48,
    alignItems: 'flex-start',
    position: 'relative',
  },
  replyAvatarColumn: {
    width: 48,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  authorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  authorName: {
    fontWeight: '600',
    fontSize: 14,
  },
  authorBadge: {
    fontSize: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  mentionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  content: {
    lineHeight: 20,
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionCount: {
    minWidth: 20,
    textAlign: 'left',
  },
  replySummaryButton: {
    marginTop: 8,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  replySummaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 11,
  },
  replyingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreButton: {
    margin: -8,
  },
});
