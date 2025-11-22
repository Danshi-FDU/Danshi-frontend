import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Appbar, Card, Text, useTheme as usePaperTheme, Chip, Button, Menu, IconButton, Divider } from 'react-native-paper';
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

export default function AdminUsersScreen() {
  const pTheme = usePaperTheme();
  const insets = useSafeAreaInsets();
  const { current } = useResponsive();
  const { user } = useAuth();

  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // 过滤器状态
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all');
  const [filterActive, setFilterActive] = useState<boolean | 'all'>('all');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const headerHeight = pickByBreakpoint(current, { base: 48, sm: 52, md: 56, lg: 60, xl: 64 });
  const contentHorizontalPadding = pickByBreakpoint(current, { base: 16, sm: 18, md: 20, lg: 24, xl: 24 });
  const headerTitleStyle = {
    fontSize: pickByBreakpoint(current, { base: 18, sm: 18, md: 20, lg: 20, xl: 22 }),
    fontWeight: '600' as const,
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
      const params: any = {};
      if (filterRole !== 'all') params.role = filterRole;
      if (filterActive !== 'all') params.isActive = filterActive;
      
      const result = await adminService.getUsers(params);
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
  }, [filterRole, filterActive]);

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
      await adminService.updateUserStatus(userId, { isActive });
      setUsers(users.map(u => u.id === userId ? { ...u, isActive } : u));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const getRoleText = (role: Role) => {
    switch (role) {
      case ROLES.SUPER_ADMIN: return '超级管理员';
      case ROLES.ADMIN: return '管理员';
      case ROLES.USER: return '普通用户';
      default: return role;
    }
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case ROLES.SUPER_ADMIN: return pTheme.colors.error;
      case ROLES.ADMIN: return pTheme.colors.primary;
      case ROLES.USER: return pTheme.colors.secondary;
      default: return pTheme.colors.outline;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top} style={{ height: headerHeight }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="用户管理" titleStyle={headerTitleStyle} />
      </Appbar.Header>

      {/* 过滤器 */}
      <View style={[styles.filterBar, { backgroundColor: pTheme.colors.surface, paddingHorizontal: contentHorizontalPadding }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <Chip
            selected={filterRole === 'all'}
            onPress={() => setFilterRole('all')}
            style={styles.filterChip}
          >
            全部角色
          </Chip>
          <Chip
            selected={filterRole === ROLES.USER}
            onPress={() => setFilterRole(ROLES.USER)}
            style={styles.filterChip}
          >
            普通用户
          </Chip>
          <Chip
            selected={filterRole === ROLES.ADMIN}
            onPress={() => setFilterRole(ROLES.ADMIN)}
            style={styles.filterChip}
          >
            管理员
          </Chip>
          <Chip
            selected={filterRole === ROLES.SUPER_ADMIN}
            onPress={() => setFilterRole(ROLES.SUPER_ADMIN)}
            style={styles.filterChip}
          >
            超级管理员
          </Chip>
          
          <View style={styles.filterDivider} />
          
          <Chip
            selected={filterActive === 'all'}
            onPress={() => setFilterActive('all')}
            style={styles.filterChip}
          >
            全部状态
          </Chip>
          <Chip
            selected={filterActive === true}
            onPress={() => setFilterActive(true)}
            style={styles.filterChip}
          >
            活跃
          </Chip>
          <Chip
            selected={filterActive === false}
            onPress={() => setFilterActive(false)}
            style={styles.filterChip}
          >
            禁用
          </Chip>
        </ScrollView>
      </View>

      <ScrollView
        style={{ backgroundColor: pTheme.colors.background }}
        contentContainerStyle={{ 
          paddingTop: 12, 
          paddingBottom: 24, 
          paddingHorizontal: contentHorizontalPadding,
          gap: 12 
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadUsers(true)} />
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
            <Card key={u.id} mode="contained" style={styles.userCard}>
              <Card.Content>
                <View style={styles.userHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.userMeta}>
                      <Text variant="titleMedium" style={styles.userName}>
                        {u.name}
                      </Text>
                      {!u.isActive && (
                        <Chip 
                          compact 
                          style={{ marginLeft: 8, backgroundColor: pTheme.colors.errorContainer }}
                          textStyle={{ color: pTheme.colors.error, fontSize: 11 }}
                        >
                          已禁用
                        </Chip>
                      )}
                    </View>
                    <Text variant="bodySmall" style={{ color: pTheme.colors.onSurfaceVariant, marginTop: 4 }}>
                      {u.email}
                    </Text>
                  </View>
                  
                  <Menu
                    visible={menuVisible === u.id}
                    onDismiss={() => setMenuVisible(null)}
                    anchor={
                      <IconButton
                        icon="dots-vertical"
                        size={20}
                        onPress={() => setMenuVisible(u.id)}
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
                        handleUpdateStatus(u.id, !u.isActive);
                      }} 
                      title={u.isActive ? '禁用用户' : '启用用户'} 
                      leadingIcon={u.isActive ? 'account-cancel' : 'account-check'}
                      titleStyle={u.isActive ? { color: pTheme.colors.error } : undefined}
                    />
                  </Menu>
                </View>

                <View style={styles.roleRow}>
                  <Chip 
                    compact 
                    style={{ backgroundColor: getRoleColor(u.role) + '20' }}
                    textStyle={{ color: getRoleColor(u.role), fontSize: 11 }}
                    icon="shield-account"
                  >
                    {getRoleText(u.role)}
                  </Chip>
                </View>

                {u.stats && (
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Ionicons name="document-text-outline" size={16} color={pTheme.colors.onSurfaceVariant} />
                      <Text variant="bodySmall" style={{ marginLeft: 4, color: pTheme.colors.onSurfaceVariant }}>
                        {u.stats.postCount || 0} 帖子
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="people-outline" size={16} color={pTheme.colors.onSurfaceVariant} />
                      <Text variant="bodySmall" style={{ marginLeft: 4, color: pTheme.colors.onSurfaceVariant }}>
                        {u.stats.followerCount || 0} 粉丝
                      </Text>
                    </View>
                  </View>
                )}

                <Text variant="bodySmall" style={{ marginTop: 8, color: pTheme.colors.onSurfaceVariant }}>
                  注册于 {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                </Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  filterContent: {
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    height: 32,
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 4,
  },
  userCard: {
    elevation: 0,
    borderWidth: 0,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontWeight: '600',
  },
  roleRow: {
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
