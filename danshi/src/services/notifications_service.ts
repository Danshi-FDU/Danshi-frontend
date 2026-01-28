import { AppError } from '@/src/lib/errors/app_error';
import {
  notificationsRepository,
  type ListNotificationsParams,
  type ListNotificationsResponse,
  type UnreadCountResponse,
  type MarkAllReadResponse,
  type Notification,
  type NotificationType,
} from '@/src/repositories/notifications_repository';

// ==================== 工具函数 ====================

const isNonEmpty = (v?: string | null) => !!v && v.trim().length > 0;

const sanitizePagination = <T extends { page?: number; limit?: number }>(params: T): T => {
  const result = { ...params };
  if (result.page !== undefined) {
    result.page = Math.max(1, Math.floor(result.page));
  }
  if (result.limit !== undefined) {
    result.limit = Math.min(50, Math.max(1, Math.floor(result.limit)));
  }
  return result;
};

// ==================== 通知类型映射 ====================

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  comment: '评论了你的帖子',
  reply: '回复了你的评论',
  like_post: '点赞了你的帖子',
  like_comment: '点赞了你的评论',
  follow: '关注了你',
  mention: '@提到了你',
};

/**
 * 获取通知类型的中文描述
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_TYPE_LABELS[type] || type;
}

/**
 * 获取通知类型对应的图标名称 (Ionicons)
 */
export function getNotificationTypeIcon(type: NotificationType): string {
  switch (type) {
    case 'comment':
      return 'chatbubble';
    case 'reply':
      return 'chatbubbles';
    case 'like_post':
    case 'like_comment':
      return 'heart';
    case 'follow':
      return 'person-add';
    case 'mention':
      return 'at';
    default:
      return 'notifications';
  }
}

// ==================== Service ====================

export const notificationsService = {
  /**
   * 获取通知列表
   */
  async list(params: ListNotificationsParams = {}): Promise<ListNotificationsResponse> {
    const sanitized = sanitizePagination(params);
    return notificationsRepository.list(sanitized);
  },

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    return notificationsRepository.getUnreadCount();
  },

  /**
   * 标记单个通知为已读
   */
  async markAsRead(notificationId: string): Promise<void> {
    if (!isNonEmpty(notificationId)) {
      throw new AppError('缺少通知ID');
    }
    await notificationsRepository.markAsRead(notificationId);
  },

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(): Promise<MarkAllReadResponse> {
    return notificationsRepository.markAllAsRead();
  },

  /**
   * 获取通知类型的中文描述
   */
  getNotificationTypeLabel(type: NotificationType): string {
    return getNotificationTypeLabel(type);
  },

  /**
   * 获取通知类型对应的图标名称 (Ionicons)
   */
  getNotificationTypeIcon(type: NotificationType): string {
    return getNotificationTypeIcon(type);
  },

  /**
   * 根据通知跳转到相关页面（返回路由参数）
   * 
   * @returns 返回 { pathname, params } 用于 router.push
   */
  getNotificationRoute(notification: Notification): { pathname: string; params?: Record<string, string> } | null {
    const { type, related_id, related_type, sender } = notification;

    switch (type) {
      case 'comment':
      case 'reply':
      case 'like_post':
      case 'mention':
        // 跳转到帖子详情
        if (related_type === 'post' && related_id) {
          return { pathname: '/post/[postId]', params: { postId: related_id } };
        }
        // 如果是评论相关，也尝试跳转到帖子
        if (related_type === 'comment' && related_id) {
          // 评论详情可能需要单独处理，暂时返回 null
          return null;
        }
        return null;

      case 'like_comment':
        // 评论点赞，可能需要跳转到帖子详情
        if (related_id) {
          return null; // 需要后端返回 post_id 才能跳转
        }
        return null;

      case 'follow':
        // 跳转到用户主页
        if (sender?.id) {
          return { pathname: '/user/[userId]', params: { userId: sender.id } };
        }
        return null;

      default:
        return null;
    }
  },
};

// ==================== 类型导出 ====================

export type {
  Notification,
  NotificationType,
  NotificationSender,
  NotificationRelatedType,
  ListNotificationsParams,
  ListNotificationsResponse,
  UnreadCountResponse,
  MarkAllReadResponse,
} from '@/src/repositories/notifications_repository';

