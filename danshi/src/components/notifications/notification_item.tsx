import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import type { Notification } from '@/src/repositories/notifications_repository';
import { notificationsService } from '@/src/services/notifications_service';
import { usersService } from '@/src/services/users_service';
import { formatRelativeTime } from '@/src/utils/time_format';
import { useNotifications } from '@/src/context/notifications_context';

// ==================== Props ====================

interface NotificationItemProps {
  notification: Notification;
  /** 乐观更新回调：将该通知标记为已读 */
  onMarkAsRead?: (notificationId: string) => void;
}

// ==================== Component ====================

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const theme = useTheme();
  const { decrementUnreadCount } = useNotifications();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const { id, type, sender, content, is_read, created_at, related_id, related_type } = notification;

  // 获取动作文案
  const actionText = notificationsService.getNotificationTypeLabel(type);

  // 处理点击事件
  const handlePress = useCallback(() => {
    // 乐观更新：立即标记为已读
    if (!is_read) {
      onMarkAsRead?.(id);
      decrementUnreadCount();
      // 静默调用 API
      notificationsService.markAsRead(id).catch((e) => {
        console.warn('[NotificationItem] Failed to mark as read:', e);
      });
    }

    // 跳转逻辑
    if (type === 'follow') {
      // 关注类型跳转到对方主页
      router.push(`/user/${sender.id}`);
    } else if (related_id) {
      // 其他类型跳转到帖子详情
      router.push(`/post/${related_id}`);
    }
  }, [id, type, is_read, sender.id, related_id, onMarkAsRead, decrementUnreadCount]);

  // 处理头像点击
  const handleAvatarPress = useCallback(() => {
    router.push(`/user/${sender.id}`);
  }, [sender.id]);

  // 处理关注按钮点击
  const handleFollowPress = useCallback(async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await usersService.unfollow(sender.id);
        setIsFollowing(false);
      } else {
        await usersService.follow(sender.id);
        setIsFollowing(true);
      }
    } catch (e) {
      console.warn('[NotificationItem] Failed to toggle follow:', e);
    } finally {
      setFollowLoading(false);
    }
  }, [sender.id, isFollowing, followLoading]);

  // 未读/已读样式
  const readOpacity = is_read ? 0.7 : 1;

  return (
    <Pressable
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      onPress={handlePress}
      android_ripple={{ color: theme.colors.surfaceVariant }}
    >
      {/* 未读小圆点 */}
      {!is_read && (
        <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
      )}

      {/* 左侧：头像 */}
      <Pressable onPress={handleAvatarPress} style={styles.avatarContainer}>
        {sender.avatar_url ? (
          <Image
            source={{ uri: sender.avatar_url }}
            style={[styles.avatar, { opacity: readOpacity }]}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surfaceVariant, opacity: readOpacity }]}>
            <Ionicons name="person" size={20} color={theme.colors.onSurfaceVariant} />
          </View>
        )}
      </Pressable>

      {/* 中间：内容 */}
      <View style={[styles.content, { opacity: readOpacity }]}>
        {/* 第一行：用户名 + 动作 */}
        <Text style={styles.actionLine} numberOfLines={2}>
          <Text style={[styles.username, { color: theme.colors.onSurface }]}>{sender.name}</Text>
          <Text style={[styles.action, { color: theme.colors.onSurfaceVariant }]}> {actionText}</Text>
        </Text>

        {/* 评论/回复内容预览 */}
        {content && (type === 'comment' || type === 'reply' || type === 'mention') && (
          <Text
            style={[styles.contentPreview, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={2}
          >
            "{content}"
          </Text>
        )}

        {/* 时间 */}
        <Text style={[styles.time, { color: theme.colors.onSurfaceVariant }]}>
          {formatRelativeTime(created_at)}
        </Text>
      </View>

      {/* 右侧：关注按钮 或 缩略图 */}
      <View style={styles.rightSide}>
        {type === 'follow' ? (
          // 关注类型显示关注按钮
          <Pressable
            style={[
              styles.followBtn,
              isFollowing
                ? { backgroundColor: theme.colors.surfaceVariant }
                : { borderWidth: 1, borderColor: theme.colors.primary },
            ]}
            onPress={handleFollowPress}
            disabled={followLoading}
          >
            <Text
              style={[
                styles.followBtnText,
                { color: isFollowing ? theme.colors.onSurfaceVariant : theme.colors.primary },
              ]}
            >
              {isFollowing ? '互相关注' : '回粉'}
            </Text>
          </Pressable>
        ) : (related_type === 'post' || type === 'like_post' || type === 'comment' || type === 'mention') ? (
          // 帖子相关类型显示缩略图占位
          <View style={[styles.thumbnail, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Ionicons name="image-outline" size={20} color={theme.colors.outline} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// ==================== Styles ====================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    left: 6,
    top: 24,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  actionLine: {
    fontSize: 14,
    lineHeight: 20,
  },
  username: {
    fontWeight: '600',
  },
  action: {
    fontWeight: '400',
  },
  contentPreview: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  rightSide: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

