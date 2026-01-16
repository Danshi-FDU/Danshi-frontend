import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { Appbar, Text, useTheme as usePaperTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/src/hooks/use_responsive';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { useAuth } from '@/src/context/auth_context';
import { isAdmin, isSuperAdmin } from '@/src/lib/auth/roles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

// 断点：三列布局
const THREE_COL_BREAKPOINT = 768; // md

export default function AdminScreen() {
  const pTheme = usePaperTheme();
  const insets = useSafeAreaInsets();
  const { current } = useResponsive();
  const { user } = useAuth();
  const { width: windowWidth } = useWindowDimensions();

  // 是否为三列布局
  const isThreeCol = windowWidth >= THREE_COL_BREAKPOINT;
  
  const contentHorizontalPadding = pickByBreakpoint(current, { base: 12, sm: 16, md: 20, lg: 24, xl: 24 });
  const isDark = pTheme.dark;

  // 问候语
  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 6) setGreeting('夜深了');
    else if (hour < 12) setGreeting('早上好');
    else if (hour < 14) setGreeting('中午好');
    else if (hour < 18) setGreeting('下午好');
    else setGreeting('晚上好');
  }, []);

  // 动态样式 - 基于主题
  const dynamicStyles = useMemo(() => ({
    // 渐变卡片上的文字颜色
    gradientTextPrimary: {
      color: pTheme.colors.onSurface,
    },
    gradientTextSecondary: {
      color: pTheme.colors.onSurfaceVariant,
    },
    gradientTextTertiary: {
      color: pTheme.colors.onSurfaceVariant,
    },
    // 金色徽章
    goldBadge: {
      backgroundColor: `${pTheme.colors.primary}33`,
      borderColor: `${pTheme.colors.primary}80`,
    },
    goldIcon: pTheme.colors.primary,
    // 图标背景
    iconBgOverlay: {
      backgroundColor: isDark 
        ? `${pTheme.colors.onPrimaryContainer}26`
        : `${pTheme.colors.primary}1A`,
    },
    // 箭头背景
    arrowBg: {
      backgroundColor: isDark 
        ? `${pTheme.colors.onSecondaryContainer}26`
        : `${pTheme.colors.secondary}1A`,
    },
    // 提示卡片
    tipCard: {
      backgroundColor: isDark 
        ? `${pTheme.colors.onSurface}14`
        : `${pTheme.colors.onSurface}0A`,
      borderColor: isDark 
        ? `${pTheme.colors.onSurface}1F`
        : `${pTheme.colors.onSurface}14`,
    },
    tipIconContainer: {
      backgroundColor: `${pTheme.colors.primary}26`,
    },
  }), [pTheme.colors, isDark]);

  // 检查权限
  if (!user || !isAdmin(user.role)) {
    return (
      <View style={{ flex: 1, backgroundColor: pTheme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text>无权访问</Text>
      </View>
    );
  }

  const userIsSuperAdmin = isSuperAdmin(user.role);
  const roleText = userIsSuperAdmin ? '超级管理员' : '管理员';
  const roleTextEn = userIsSuperAdmin ? 'Super Admin' : 'Admin';

  // 背景渐变色
  const gradientColors = [
    pTheme.colors.primaryContainer, 
    pTheme.colors.secondaryContainer, 
    pTheme.colors.tertiaryContainer
  ] as const;

  const cardGradientColors = {
    posts: [
      pTheme.colors.primaryContainer, 
      isDark ? `${pTheme.colors.primary}66` : `${pTheme.colors.primary}33`
    ] as const,
    comments: [
      pTheme.colors.tertiaryContainer, 
      isDark ? `${pTheme.colors.tertiary}66` : `${pTheme.colors.tertiary}33`
    ] as const,
    users: [
      pTheme.colors.secondaryContainer, 
      isDark ? `${pTheme.colors.secondary}66` : `${pTheme.colors.secondary}33`
    ] as const,
  };

  // 三列布局时的网格高度
  const gridCardHeight = isThreeCol ? 180 : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="管理中心" />
      </Appbar.Header>

      <ScrollView
        style={{ backgroundColor: pTheme.colors.background }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: contentHorizontalPadding }
        ]}
      >
        {/* 内容容器 - 限制最大宽度 */}
        <View style={styles.contentContainer}>
          {/* 组件 A: 顶部状态卡片 */}
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerCard}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.roleContainer}>
                  <View style={[styles.goldBadge, dynamicStyles.goldBadge]}>
                    <Ionicons name="shield-checkmark" size={18} color={dynamicStyles.goldIcon} />
                  </View>
                  <View>
                    <Text style={[styles.roleText, dynamicStyles.gradientTextPrimary]}>{roleText}</Text>
                    <Text style={[styles.roleTextEn, dynamicStyles.gradientTextSecondary]}>{roleTextEn}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.headerRight}>
                <Text style={[styles.greetingText, dynamicStyles.gradientTextTertiary]}>{greeting}</Text>
                <Text style={[styles.nameText, dynamicStyles.gradientTextPrimary]}>{user.name || '管理员'}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* 组件 B: 功能入口区 */}
          {isThreeCol && userIsSuperAdmin ? (
            // 三列布局（md 及以上 + 超级管理员）
            <View style={styles.gridRowThree}>
              {/* 帖子管理 */}
              <Pressable
                style={styles.gridCardWrapperThree}
                onPress={() => router.push('/myself/admin/posts' as any)}
              >
                <LinearGradient
                  colors={cardGradientColors.posts}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.gridCard, { height: gridCardHeight, aspectRatio: undefined }]}
                >
                  <View style={[styles.gridCardIconBg, dynamicStyles.iconBgOverlay]}>
                    <Ionicons name="document-text" size={32} color={pTheme.colors.primary} style={{ opacity: 0.9 }} />
                  </View>
                  <View style={styles.gridCardBottom}>
                    <Text style={[styles.gridCardTitle, { color: pTheme.colors.onPrimaryContainer }]}>帖子管理</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              {/* 评论管理 */}
              <Pressable
                style={styles.gridCardWrapperThree}
                onPress={() => router.push('/myself/admin/comments' as any)}
              >
                <LinearGradient
                  colors={cardGradientColors.comments}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.gridCard, { height: gridCardHeight, aspectRatio: undefined }]}
                >
                  <View style={[styles.gridCardIconBg, { backgroundColor: `${pTheme.colors.tertiary}1A` }]}>
                    <Ionicons name="chatbubbles" size={32} color={pTheme.colors.tertiary} style={{ opacity: 0.9 }} />
                  </View>
                  <View style={styles.gridCardBottom}>
                    <Text style={[styles.gridCardTitle, { color: pTheme.colors.onTertiaryContainer }]}>评论管理</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              {/* 用户管理（三列时提上来） */}
              <Pressable
                style={styles.gridCardWrapperThree}
                onPress={() => router.push('/myself/admin/users' as any)}
              >
                <LinearGradient
                  colors={cardGradientColors.users}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.gridCard, { height: gridCardHeight, aspectRatio: undefined }]}
                >
                  <View style={[styles.gridCardIconBg, { backgroundColor: `${pTheme.colors.secondary}1A` }]}>
                    <Ionicons name="people" size={32} color={pTheme.colors.secondary} style={{ opacity: 0.9 }} />
                  </View>
                  <View style={styles.gridCardBottom}>
                    <Text style={[styles.gridCardTitle, { color: pTheme.colors.onSecondaryContainer }]}>用户管理</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            // 两列布局（窄屏 或 非超级管理员）
            <>
              <View style={styles.gridRow}>
                {/* 帖子管理 */}
                <Pressable
                  style={styles.gridCardWrapper}
                  onPress={() => router.push('/myself/admin/posts' as any)}
                >
                  <LinearGradient
                    colors={cardGradientColors.posts}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gridCard}
                  >
                    <View style={[styles.gridCardIconBg, dynamicStyles.iconBgOverlay]}>
                      <Ionicons name="document-text" size={36} color={pTheme.colors.primary} style={{ opacity: 0.9 }} />
                    </View>
                    <View style={styles.gridCardBottom}>
                      <Text style={[styles.gridCardTitle, { color: pTheme.colors.onPrimaryContainer }]}>帖子管理</Text>
                    </View>
                  </LinearGradient>
                </Pressable>

                {/* 评论管理 */}
                <Pressable
                  style={styles.gridCardWrapper}
                  onPress={() => router.push('/myself/admin/comments' as any)}
                >
                  <LinearGradient
                    colors={cardGradientColors.comments}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gridCard}
                  >
                    <View style={[styles.gridCardIconBg, { backgroundColor: `${pTheme.colors.tertiary}1A` }]}>
                      <Ionicons name="chatbubbles" size={36} color={pTheme.colors.tertiary} style={{ opacity: 0.9 }} />
                    </View>
                    <View style={styles.gridCardBottom}>
                      <Text style={[styles.gridCardTitle, { color: pTheme.colors.onTertiaryContainer }]}>评论管理</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>

              {/* 用户管理通栏（仅超级管理员 + 窄屏） */}
              {userIsSuperAdmin && (
                <Pressable
                  onPress={() => router.push('/myself/admin/users' as any)}
                >
                  <LinearGradient
                    colors={cardGradientColors.users}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.userCard}
                  >
                    <View style={[styles.userCardIconBg, { backgroundColor: `${pTheme.colors.secondary}1A` }]}>
                      <Ionicons name="people" size={28} color={pTheme.colors.secondary} style={{ opacity: 0.9 }} />
                    </View>
                    <View style={styles.userCardContent}>
                      <Text style={[styles.userCardTitle, { color: pTheme.colors.onSecondaryContainer }]}>用户管理</Text>
                      <Text style={[styles.userCardDesc, { color: pTheme.colors.onSurfaceVariant }]}>修改用户身份、封禁管理</Text>
                    </View>
                    <View style={[styles.userCardArrow, { backgroundColor: `${pTheme.colors.secondary}1A` }]}>
                      <Ionicons name="chevron-forward" size={24} color={pTheme.colors.secondary} />
                    </View>
                  </LinearGradient>
                </Pressable>
              )}
            </>
          )}

          {/* 组件 C: 底部警示卡 */}
          <View style={[styles.tipCard, dynamicStyles.tipCard]}>
            <View style={[styles.tipIconContainer, dynamicStyles.tipIconContainer]}>
              <Text style={styles.tipIcon}>💡</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: pTheme.colors.onSurface }]}>
                管理员提示
              </Text>
              <Text style={[styles.tipText, { color: pTheme.colors.onSurfaceVariant }]}>
                您拥有{roleText}权限，请谨慎使用管理功能。
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 16, 
    paddingBottom: 24,
    alignItems: 'center', // 居中内容
  },
  // 内容容器 - 限制最大宽度
  contentContainer: {
    width: '100%',
    maxWidth: 800, // 限制最大宽度
    gap: 16,
  },

  // 组件 A: 顶部卡片
  headerCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goldBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  roleText: {
    fontSize: 18,
    fontWeight: '700',
  },
  roleTextEn: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  greetingText: {
    fontSize: 14,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },

  // 组件 B: 两列网格
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCardWrapper: {
    flex: 1,
  },
  gridCard: {
    borderRadius: 20,
    padding: 16,
    aspectRatio: 1,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  gridCardIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  // 三列网格
  gridRowThree: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCardWrapperThree: {
    flex: 1,
  },

  // 用户管理卡片（通栏）
  userCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  userCardIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCardContent: {
    flex: 1,
  },
  userCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  userCardDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  userCardArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 组件 C: 底部提示卡
  tipCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
  },
  tipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipIcon: {
    fontSize: 18,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
