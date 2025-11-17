import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Avatar, Button, Chip, IconButton, Text, useTheme as usePaperTheme } from 'react-native-paper';
import type { Comment, CommentReply, CommentEntity, MentionedUser } from '@/src/models/Comment';

type BaseProps = {
  onLike?: (comment: CommentEntity) => void;
  onReply?: (comment: CommentEntity) => void;
  onToggleReplies?: (commentId: string, expand: boolean) => void;
  loadingReplies?: boolean;
};

type CommentItemProps = BaseProps & {
  comment: CommentEntity;
  isReply?: boolean;
  showMentionHighlight?: boolean;
  maxContentLines?: number;
  replyPreview?: CommentReply[];
  replyTotal?: number;
  repliesExpanded?: boolean;
};

function MentionedText({ mentions }: { mentions?: MentionedUser[] }) {
  if (!mentions?.length) return null;
  return (
    <Text variant="bodyMedium" style={styles.mentionRow}>
      {mentions.map((mention, idx) => (
        <Text key={mention.id} style={styles.mentionText}>
          @{mention.name}
          {idx < mentions.length - 1 ? ' ' : ''}
        </Text>
      ))}
    </Text>
  );
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isReply = false,
  maxContentLines,
  replyPreview,
  replyTotal,
  repliesExpanded = false,
  onLike,
  onReply,
  onToggleReplies,
  loadingReplies,
}) => {
  const theme = usePaperTheme();
  const isAuthor = comment.isAuthor;
  const handleLike = () => onLike?.(comment);
  const handleReply = () => onReply?.(comment);
  const handleToggleReplies = () => comment.id && onToggleReplies?.(comment.id, !repliesExpanded);
  const visibleReplyCount = replyPreview?.length ?? 0;
  const totalReplyCount = replyTotal ?? 0;
  const allRepliesVisible = repliesExpanded || (totalReplyCount > 0 && visibleReplyCount >= totalReplyCount);

  const avatarSize = isReply ? 28 : 40;
  const avatarNode = comment.author?.avatarUrl ? (
    <Avatar.Image size={avatarSize} source={{ uri: comment.author.avatarUrl }} />
  ) : (
    <Avatar.Text size={avatarSize} label={comment.author?.name?.slice(0, 1) ?? '?'} />
  );

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      {avatarNode}
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={styles.authorBlock}>
            <Text
              variant={isReply ? 'labelSmall' : 'labelLarge'}
              numberOfLines={1}
              style={isReply ? styles.replyAuthorText : undefined}
            >
              {comment.author?.name || '匿名用户'}
            </Text>
            {isAuthor ? (
              <Chip compact icon="crown-outline" style={styles.authorChip}>
                作者
              </Chip>
            ) : null}
            {comment.author?.isFollowing ? (
              <Chip compact style={styles.followChip}>
                已关注
              </Chip>
            ) : null}
          </View>
        </View>

        <Pressable style={styles.bodyPressable} onPress={handleReply}>
          <MentionedText mentions={comment.mentionedUsers} />
          <Text
            variant="bodyMedium"
            style={styles.content}
            numberOfLines={maxContentLines}
          >
            {comment.replyTo ? (
              <Text style={styles.replyPrefix}>
                回复 <Text style={styles.replyTarget}>@{comment.replyTo.name}</Text>：
              </Text>
            ) : null}
            {comment.content}
          </Text>
        </Pressable>

        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <Text variant="bodySmall" style={[styles.timestamp, { color: theme.colors.onSurfaceVariant }]}>
              {new Date(comment.createdAt).toLocaleString()}
            </Text>
          </View>
          <View style={styles.likeButton}>
            <IconButton
              size={18}
              icon={comment.isLiked ? 'heart' : 'heart-outline'}
              iconColor={comment.isLiked ? theme.colors.error : theme.colors.onSurfaceVariant}
              onPress={handleLike}
            />
            <Text variant="bodySmall" style={styles.actionCount}>
              {comment.likeCount}
            </Text>
          </View>
        </View>

        {replyTotal ? (
          <View style={styles.replyPreviewBlock}>
            {replyPreview?.length
              ? replyPreview.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    isReply
                    onLike={onLike}
                    onReply={onReply}
                  />
                ))
              : null}
            {replyTotal > 0 && !allRepliesVisible ? (
              <Button
                mode="text"
                onPress={handleToggleReplies}
                compact
                loading={loadingReplies}
                icon={repliesExpanded ? 'chevron-up' : 'chevron-down'}
              >
                {repliesExpanded ? '收起回复' : `展开 ${replyTotal} 条回复`}
              </Button>
            ) : null}
          </View>
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
  },
  body: {
    flex: 1,
    gap: 6,
  },
  bodyPressable: {
    gap: 6,
  },
  replyContainer: {
    marginLeft: 0,
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
  authorChip: {
    height: 22,
  },
  followChip: {
    height: 22,
  },
  mentionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  mentionText: {
    color: '#ef4444',
  },
  content: {
    lineHeight: 20,
  },
  replyPrefix: {
    color: '#6b7280',
  },
  replyTarget: {
    color: '#ef4444',
  },
  replyAuthorText: {
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: -8,
  },
  actionCount: {
    minWidth: 24,
    textAlign: 'left',
  },
  replyPreviewBlock: {
    marginTop: 8,
    gap: 8,
  },
  timestamp: {
    fontSize: 12,
  },
});
