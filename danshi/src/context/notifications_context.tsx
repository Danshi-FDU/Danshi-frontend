import React, { createContext, useContext, useCallback, useEffect, useState, useRef, type PropsWithChildren } from 'react';
import { notificationsService } from '@/src/services/notifications_service';
import { useAuth } from '@/src/context/auth_context';

// ==================== 类型定义 ====================

type NotificationsContextValue = {
  /** 未读通知数量 */
  unreadCount: number;
  /** 是否正在加载 */
  loading: boolean;
  /** 刷新未读数量 */
  refreshUnreadCount: () => Promise<void>;
  /** 减少未读数量（乐观更新） */
  decrementUnreadCount: () => void;
  /** 清零未读数量（全部已读后） */
  clearUnreadCount: () => void;
};

// ==================== Context ====================

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// ==================== Provider ====================

/** 轮询间隔（毫秒）：60秒 */
const POLL_INTERVAL = 60 * 1000;

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    
    setLoading(true);
    try {
      const { unread_count } = await notificationsService.getUnreadCount();
      setUnreadCount(unread_count);
    } catch (error) {
      console.warn('[NotificationsContext] Failed to fetch unread count:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const decrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const clearUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // 登录后立即获取未读数量，并启动轮询
  useEffect(() => {
    if (user) {
      refreshUnreadCount();
      
      // 启动轮询
      intervalRef.current = setInterval(() => {
        refreshUnreadCount();
      }, POLL_INTERVAL);
    } else {
      setUnreadCount(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, refreshUnreadCount]);

  const value: NotificationsContextValue = {
    unreadCount,
    loading,
    refreshUnreadCount,
    decrementUnreadCount,
    clearUnreadCount,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

// ==================== Hook ====================

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}

// ==================== 工具函数：格式化未读数量显示 ====================

export function formatUnreadCount(count: number): string | null {
  if (count <= 0) return null;
  if (count > 99) return '99+';
  return String(count);
}

