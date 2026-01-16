import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Appbar, Card, Text, useTheme as usePaperTheme, Button, Menu, IconButton, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/src/hooks/use_responsive';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { useAuth } from '@/src/context/auth_context';
import { isAdmin, isSuperAdmin } from '@/src/lib/auth/roles';
import { adminService } from '@/src/services/admin_service';
import type { AdminUserSummary } from '@/src/repositories/admin_repository';
import type { Role } from '@/src/constants/app';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ROLES } from '@/src/constants/app';
import { UserAvatar } from '@/src/components/user_avatar';
import { LinearGradient } from 'expo-linear-gradient';

// 身份标签组件
type RoleBadgeProps = {
  role: Role;
};

const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const pTheme = usePaperTheme();
  
  if (role === ROLES.SUPER_ADMIN) {
    return (
      <LinearGradient
        colors={[pTheme.colors.error, pTheme.colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.roleBadge}
      >
        <Ionicons name="shield-checkmark" size={10} color={pTheme.colors.onError} />
        <Text style={[styles.roleBadgeText, { color: pTheme.colors.onError }]}>超管</Text>
      </LinearGradient>
    );
  }
  
  if (role === ROLES.ADMIN) {
    return (
      <View style={[styles.roleBadge, { backgroundColor: pTheme.colors.primaryContainer }]}>
        <Ionicons name="shield" size={10} color={pTheme.colors.primary} />
        <Text style={[styles.roleBadgeText, { color: pTheme.colors.primary }]}>管理</Text>
      </View>
    );
  }
  
  // 普通用户不显示标签
  return null;
};

export default function AdminUsersScreen() {
  const pTheme = usePaperTheme();
  const insets = useSafeAreaInsets();
  const { current } = useResponsive();
  const { user } = useAuth();

  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const contentHorizontalPadding = pickByBreakpoint(current, { base: 12, sm: 16, md: 20, lg: 24, xl: 24 });

  // 获取扩展的主题色
  const colors = pTheme.colors as typeof pTheme.colors & {
    surfaceContainer: string;
    surfaceContainerHigh: string;
  };

  // 权限检查
  if (!user || !isAdmin(user.role)) {
    return (
      <View style={{ flex: 1, backgroundColor: pTheme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text>无权访问</Text>
      </View>
    );
  }

  const canManageRole = isSuperAdmin(user.role);

  const loadUsers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    
    try {
      const result = await adminService.getUsers({});
      setUsers(result.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateRole = async (userId: string, role: Role) => {
    try {
      await adminService.updateUserRole(userId, { role });
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleUpdateStatus = async (userId: string, isActive: boolean) => {
    try {
      await adminService.updateUserStatus(userId, { is_active: isActive });
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: isActive } : u));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="用户管理" />
      </Appbar.Header>

      <ScrollView
        style={{ backgroundColor: pTheme.colors.background }}
        contentContainerStyle={{ 
          paddingTop: 12, 
          paddingBottom: 24, 
          paddingHorizontal: contentHorizontalPadding,
          gap: 8 
        }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => loadUsers(true)}
            colors={[pTheme.colors.primary]}
            tintColor={pTheme.colors.primary}
            progressBackgroundColor={pTheme.colors.surface}
          />
        }
      >
        {loading && users.length === 0 ? (
          <Card mode="contained">
            <Card.Content style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text>加载中...</Text>
            </Card.Content>
          </Card>
        ) : error ? (
          <Card mode="contained">
            <Card.Content style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: pTheme.colors.error }}>{error}</Text>
              <Button mode="text" onPress={() => loadUsers()} style={{ marginTop: 8 }}>
                重试
              </Button>
            </Card.Content>
          </Card>
        ) : users.length === 0 ? (
          <Card mode="contained">
            <Card.Content style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="people-outline" size={48} color={pTheme.colors.onSurfaceDisabled} />
              <Text style={{ marginTop: 12, color: pTheme.colors.onSurfaceVariant }}>暂无用户</Text>
            </Card.Content>
          </Card>
        ) : (
          users.map((u) => (
            <Pressable
              key={u.id}
              style={[styles.userTile, { backgroundColor: colors.surfaceContainer }]}
            >
              {/* 左侧头像 */}
              <UserAvatar
                userId={u.id}
                name={u.name}
                avatar_url={u.avatar_url}
                size={44}
              />
              
              {/* 中间用户信息 */}
              <View style={styles.userInfo}>
                {/* 第一行：用户名 + 身份标签 + 状态标签 */}
                <View style={styles.userNameRow}>
                  <Text style={[styles.userName, { color: pTheme.colors.onSurface }]} numberOfLines={1}>
                    {u.name}
                  </Text>
                  <RoleBadge role={u.role} />
                  {!u.is_active && (
                    <View style={[styles.statusBadge, { backgroundColor: pTheme.colors.errorContainer }]}>
                      <Text style={[styles.statusBadgeText, { color: pTheme.colors.error }]}>已禁用</Text>
                    </View>
                  )}
                </View>
                
                {/* 第二行：邮箱 */}
                <Text style={[styles.userEmail, { color: pTheme.colors.onSurfaceVariant }]} numberOfLines={1}>
                  {u.email}
                </Text>
                
                {/* 第三行：数据 + 时间 */}
                <View style={styles.userMeta}>
                  <Ionicons name="document-text-outline" size={11} color={pTheme.colors.onSurfaceVariant} />
                  <Text style={[styles.metaText, { color: pTheme.colors.onSurfaceVariant }]}>
                    {u.stats?.post_count || 0}
                  </Text>
                  <Text style={[styles.metaSeparator, { color: pTheme.colors.outline }]}>·</Text>
                  <Ionicons name="people-outline" size={11} color={pTheme.colors.onSurfaceVariant} />
                  <Text style={[styles.metaText, { color: pTheme.colors.onSurfaceVariant }]}>
                    {u.stats?.follower_count || 0}
                  </Text>
                  <Text style={[styles.metaSeparator, { color: pTheme.colors.outline }]}>·</Text>
                  <Ionicons name="time-outline" size={11} color={pTheme.colors.onSurfaceVariant} />
                  <Text style={[styles.metaText, { color: pTheme.colors.onSurfaceVariant }]}>
                    {formatDate(u.created_at)}
                  </Text>
                </View>
              </View>
              
              {/* 右侧更多菜单 */}
              <Menu
                visible={menuVisible === u.id}
                onDismiss={() => setMenuVisible(null)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={18}
                    onPress={() => setMenuVisible(u.id)}
                    style={styles.moreBtn}
                  />
                }
              >
                {canManageRole && (
                  <>
                    <Menu.Item 
                      onPress={() => {
                        setMenuVisible(null);
                        handleUpdateRole(u.id, ROLES.USER);
                      }} 
                      title="设为普通用户" 
                      leadingIcon="account"
                      disabled={u.role === ROLES.USER}
                    />
                    <Menu.Item 
                      onPress={() => {
                        setMenuVisible(null);
                        handleUpdateRole(u.id, ROLES.ADMIN);
                      }} 
                      title="设为管理员" 
                      leadingIcon="shield-account"
                      disabled={u.role === ROLES.ADMIN}
                    />
                    <Menu.Item 
                      onPress={() => {
                        setMenuVisible(null);
                        handleUpdateRole(u.id, ROLES.SUPER_ADMIN);
                      }} 
                      title="设为超级管理员" 
                      leadingIcon="shield-crown"
                      disabled={u.role === ROLES.SUPER_ADMIN}
                    />
                    <Divider />
                  </>
                )}
                <Menu.Item 
                  onPress={() => {
                    setMenuVisible(null);
                    handleUpdateStatus(u.id, !u.is_active);
                  }} 
                  title={u.is_active ? '禁用用户' : '启用用户'} 
                  leadingIcon={u.is_active ? 'account-cancel' : 'account-check'}
                  titleStyle={u.is_active ? { color: pTheme.colors.error } : undefined}
                />
              </Menu>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // 用户列表项
  userTile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 12,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
  },
  metaSeparator: {
    fontSize: 11,
  },

  // 身份标签
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // 状态标签
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // 更多按钮
  moreBtn: {
    margin: 0,
  },
});
