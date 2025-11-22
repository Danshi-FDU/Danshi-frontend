import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Image, RefreshControl } from 'react-native';
import { Appbar, Card, Text, useTheme as usePaperTheme, Chip, Button, Menu, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/src/hooks/use_responsive';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { useAuth } from '@/src/context/auth_context';
import { isAdmin } from '@/src/lib/auth/roles';
import { adminService } from '@/src/services/admin_service';
import type { Post } from '@/src/models/Post';
import type { AdminPendingPostSummary } from '@/src/repositories/admin_repository';
import Ionicons from '@expo/vector-icons/Ionicons';

type PostStatus = 'pending' | 'approved' | 'rejected';
type PostType = 'share' | 'seeking';

export default function AdminPostsScreen() {
  const pTheme = usePaperTheme();
  const insets = useSafeAreaInsets();
  const { current } = useResponsive();
  const { user } = useAuth();

  const [posts, setPosts] = useState<AdminPendingPostSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // 过滤器状态
  const [filterStatus, setFilterStatus] = useState<PostStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<PostType | 'all'>('all');
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

  const loadPosts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    
    try {
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterType !== 'all') params.postType = filterType;
      
      const result = await adminService.getPosts(params);
      setPosts(result.posts);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [filterStatus, filterType]);

  const handleReview = async (postId: string, action: 'approve' | 'reject') => {
    try {
      await adminService.reviewPost(postId, { status: action === 'approve' ? 'approved' : 'rejected' });
      await loadPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await adminService.deletePost(postId);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return pTheme.colors.primary;
      case 'rejected': return pTheme.colors.error;
      case 'pending': return pTheme.colors.tertiary;
      default: return pTheme.colors.outline;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return '已通过';
      case 'rejected': return '已拒绝';
      case 'pending': return '待审核';
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'share': return '分享';
      case 'seeking': return '求推荐';
      default: return type;
    }
  };

  const filteredPosts = useMemo(() => {
    return posts;
  }, [posts]);

  return (
    <View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top} style={{ height: headerHeight }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="帖子管理" titleStyle={headerTitleStyle} />
      </Appbar.Header>

      {/* 过滤器 */}
      <View style={[styles.filterBar, { backgroundColor: pTheme.colors.surface, paddingHorizontal: contentHorizontalPadding }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <Chip
            selected={filterStatus === 'all'}
            onPress={() => setFilterStatus('all')}
            style={styles.filterChip}
          >
            全部状态
          </Chip>
          <Chip
            selected={filterStatus === 'pending'}
            onPress={() => setFilterStatus('pending')}
            style={styles.filterChip}
          >
            待审核
          </Chip>
          <Chip
            selected={filterStatus === 'approved'}
            onPress={() => setFilterStatus('approved')}
            style={styles.filterChip}
          >
            已通过
          </Chip>
          <Chip
            selected={filterStatus === 'rejected'}
            onPress={() => setFilterStatus('rejected')}
            style={styles.filterChip}
          >
            已拒绝
          </Chip>
          
          <View style={styles.filterDivider} />
          
          <Chip
            selected={filterType === 'all'}
            onPress={() => setFilterType('all')}
            style={styles.filterChip}
          >
            全部类型
          </Chip>
          <Chip
            selected={filterType === 'share'}
            onPress={() => setFilterType('share')}
            style={styles.filterChip}
          >
            分享
          </Chip>
          <Chip
            selected={filterType === 'seeking'}
            onPress={() => setFilterType('seeking')}
            style={styles.filterChip}
          >
            求推荐
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
          <RefreshControl refreshing={refreshing} onRefresh={() => loadPosts(true)} />
        }
      >
        {loading && posts.length === 0 ? (
          <Card mode="contained">
            <Card.Content style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text>加载中...</Text>
            </Card.Content>
          </Card>
        ) : error ? (
          <Card mode="contained">
            <Card.Content style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: pTheme.colors.error }}>{error}</Text>
              <Button mode="text" onPress={() => loadPosts()} style={{ marginTop: 8 }}>
                重试
              </Button>
            </Card.Content>
          </Card>
        ) : filteredPosts.length === 0 ? (
          <Card mode="contained">
            <Card.Content style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="document-text-outline" size={48} color={pTheme.colors.onSurfaceDisabled} />
              <Text style={{ marginTop: 12, color: pTheme.colors.onSurfaceVariant }}>暂无帖子</Text>
            </Card.Content>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <Card key={post.id} mode="contained" style={styles.postCard}>
              <Card.Content>
                <View style={styles.postHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.postMeta}>
                      <Chip 
                        compact 
                        style={{ backgroundColor: getStatusColor((post as any).status) + '20' }}
                        textStyle={{ color: getStatusColor((post as any).status), fontSize: 11 }}
                      >
                        {getStatusText((post as any).status || 'approved')}
                      </Chip>
                      <Chip 
                        compact 
                        style={{ marginLeft: 6, backgroundColor: pTheme.colors.secondaryContainer }}
                        textStyle={{ fontSize: 11 }}
                      >
                        {getTypeText(post.postType || 'share')}
                      </Chip>
                    </View>
                    <Text variant="titleMedium" style={styles.postTitle}>
                      {post.title}
                    </Text>
                  </View>
                  
                  <Menu
                    visible={menuVisible === post.id}
                    onDismiss={() => setMenuVisible(null)}
                    anchor={
                      <IconButton
                        icon="dots-vertical"
                        size={20}
                        onPress={() => setMenuVisible(post.id)}
                      />
                    }
                  >
                    {((post as any).status === 'pending' || !(post as any).status) && (
                      <>
                        <Menu.Item 
                          onPress={() => {
                            setMenuVisible(null);
                            handleReview(post.id, 'approve');
                          }} 
                          title="通过" 
                          leadingIcon="check-circle"
                        />
                        <Menu.Item 
                          onPress={() => {
                            setMenuVisible(null);
                            handleReview(post.id, 'reject');
                          }} 
                          title="拒绝" 
                          leadingIcon="close-circle"
                        />
                      </>
                    )}
                    <Menu.Item 
                      onPress={() => {
                        setMenuVisible(null);
                        router.push(`/post/${post.id}`);
                      }} 
                      title="查看详情" 
                      leadingIcon="eye"
                    />
                    <Menu.Item 
                      onPress={() => {
                        setMenuVisible(null);
                        handleDelete(post.id);
                      }} 
                      title="删除" 
                      leadingIcon="delete"
                      titleStyle={{ color: pTheme.colors.error }}
                    />
                  </Menu>
                </View>

                <Text variant="bodyMedium" numberOfLines={2} style={{ marginTop: 8, color: pTheme.colors.onSurfaceVariant }}>
                  {post.content}
                </Text>

                {post.images && post.images.length > 0 && (
                  <View style={styles.imageRow}>
                    {post.images.slice(0, 3).map((img, idx) => (
                      <Image
                        key={idx}
                        source={{ uri: img }}
                        style={styles.postImage}
                        resizeMode="cover"
                      />
                    ))}
                    {post.images.length > 3 && (
                      <View style={[styles.postImage, styles.moreImages, { backgroundColor: pTheme.colors.surfaceVariant }]}>
                        <Text style={{ color: pTheme.colors.onSurfaceVariant }}>+{post.images.length - 3}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.postFooter}>
                  {post.author && (
                    <View style={styles.authorInfo}>
                      <View style={[styles.authorAvatar, { backgroundColor: pTheme.colors.surfaceVariant }]}>
                        <Ionicons name="person" size={12} color={pTheme.colors.onSurfaceVariant} />
                      </View>
                      <Text variant="bodySmall" style={{ color: pTheme.colors.onSurfaceVariant }}>
                        {post.author.name}
                      </Text>
                    </View>
                  )}
                  <Text variant="bodySmall" style={{ color: pTheme.colors.onSurfaceVariant }}>
                    {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                  </Text>
                </View>
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
  postCard: {
    elevation: 0,
    borderWidth: 0,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postTitle: {
    fontWeight: '600',
  },
  imageRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  postImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  moreImages: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
