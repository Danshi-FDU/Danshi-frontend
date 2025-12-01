import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Appbar, Card, Text, useTheme as usePaperTheme, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/src/hooks/use_responsive';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { useAuth } from '@/src/context/auth_context';
import { isAdmin, isSuperAdmin } from '@/src/lib/auth/roles';
import Ionicons from '@expo/vector-icons/Ionicons';

type AdminCard = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  requireSuperAdmin?: boolean; // 是否需要超级管理员权限
};

export default function AdminScreen() {
  const pTheme = usePaperTheme();
  const insets = useSafeAreaInsets();
  const { current } = useResponsive();
  const { user } = useAuth();

  const contentHorizontalPadding = pickByBreakpoint(current, { base: 16, sm: 18, md: 20, lg: 24, xl: 24 });

  // 检查权限
  if (!user || !isAdmin(user.role)) {
    return (
      <View style={{ flex: 1, backgroundColor: pTheme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text>无权访问</Text>
      </View>
    );
  }

  const userIsSuperAdmin = isSuperAdmin(user.role);

  const allAdminCards: AdminCard[] = [
    {
      title: '帖子管理',
      description: '审核、查看、删除帖子',
      icon: 'document-text',
      route: '/myself/admin/posts',
      color: '#2563eb', // 蓝色
    },
    {
      title: '评论管理',
      description: '查看、删除评论',
      icon: 'chatbox',
      route: '/myself/admin/comments',
      color: '#0891b2', // 青色
    },
    {
      title: '用户管理',
      description: '修改用户身份',
      icon: 'people',
      route: '/myself/admin/users',
      color: '#9333ea', // 紫色 - 暗示更高阶操作
      requireSuperAdmin: true,
    },
  ];

  // 根据权限过滤卡片
  const adminCards = useMemo(() => 
    allAdminCards.filter(card => !card.requireSuperAdmin || userIsSuperAdmin),
    [userIsSuperAdmin]
  );

  return (
    <View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="管理中心" />
      </Appbar.Header>

      <ScrollView
        style={{ backgroundColor: pTheme.colors.background }}
        contentContainerStyle={{ 
          paddingTop: 16, 
          paddingBottom: 24, 
          paddingHorizontal: contentHorizontalPadding,
          gap: 12 
        }}
      >
        {adminCards.map((card) => (
          <Pressable
            key={card.route}
            onPress={() => router.push(card.route as any)}
            android_ripple={{ color: pTheme.colors.surfaceDisabled }}
          >
            <Card mode="contained" style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={[styles.iconCircle, { backgroundColor: `${card.color}20` }]}>
                  <Ionicons name={card.icon} size={32} color={card.color} />
                </View>
                <View style={styles.cardText}>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    {card.title}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: pTheme.colors.onSurfaceVariant }}>
                    {card.description}
                  </Text>
                </View>
                <IconButton icon="chevron-right" size={24} />
              </Card.Content>
            </Card>
          </Pressable>
        ))}

        <View style={{ height: 12 }} />
        
        <Card mode="contained" style={styles.infoCard}>
          <Card.Content>
            <Text variant="bodySmall" style={{ color: pTheme.colors.onSurfaceVariant }}>
              💡 管理员提示
            </Text>
            <Text variant="bodyMedium" style={{ marginTop: 8, color: pTheme.colors.onSurface }}>
              您拥有{user.role === 'super_admin' ? '超级管理员' : '管理员'}权限，请谨慎使用管理功能。
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    elevation: 0,
    borderWidth: 0,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  infoCard: {
    elevation: 0,
    borderWidth: 0,
  },
});
