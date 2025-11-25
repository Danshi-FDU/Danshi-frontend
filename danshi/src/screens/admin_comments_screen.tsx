import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Appbar, Card, Text, useTheme as usePaperTheme, Button, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/src/hooks/use_responsive';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { useAuth } from '@/src/context/auth_context';
import { isAdmin } from '@/src/lib/auth/roles';
import { adminService } from '@/src/services/admin_service';
import type { AdminCommentSummary } from '@/src/repositories/admin_repository';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function AdminCommentsScreen() {
  const pTheme = usePaperTheme();
  const insets = useSafeAreaInsets();
  const { current } = useResponsive();
  const { user } = useAuth();

  const [comments, setComments] = useState<AdminCommentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const contentHorizontalPadding = pickByBreakpoint(current, { base: 16, sm: 18, md: 20, lg: 24, xl: 24 });

  // 权限检查
  if (!user || !isAdmin(user.role)) {
    return (
      <View style={{ flex: 1, backgroundColor: pTheme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text>无权访问</Text>
      </View>
    );
  }

  const loadComments = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    
    try {
      // const result = await adminService.getComments({});
      // setComments(result.comments);
      setComments([]);
      setError('评论管理功能暂未开放');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, []);

  const handleDelete = async (commentId: string) => {
    try {
      // await adminService.deleteComment(commentId);
      // setComments(comments.filter(c => c.id !== commentId));
      Alert.alert('提示', '删除功能暂未开放');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const confirmDelete = (commentId: string) => {
    Alert.alert(
      '删除评论',
      '确定要删除这条评论吗？此操作不可撤销。',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '删除', 
          style: 'destructive',
          onPress: () => handleDelete(commentId)
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="评论管理" />
      </Appbar.Header>

      <ScrollView
        style={{ backgroundColor: pTheme.colors.background }}
        contentContainerStyle={{ 
          paddingTop: 12, 
          paddingBottom: 24, 
          paddingHorizontal: contentHorizontalPadding,
          gap: 12 
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadComments(true)} />
        }
      >
        {loading && comments.length === 0 ? (
          <Card mode="contained">
            <Card.Content style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text>加载中...</Text>
            </Card.Content>
          </Card>
        ) : error ? (
          <Card mode="contained">
            <Card.Content style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: pTheme.colors.error }}>{error}</Text>
              <Button mode="text" onPress={() => loadComments()} style={{ marginTop: 8 }}>
                重试
              </Button>
            </Card.Content>
          </Card>
        ) : comments.length === 0 ? (
          <Card mode="contained">
            <Card.Content style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="chatbox-outline" size={48} color={pTheme.colors.onSurfaceDisabled} />
              <Text style={{ marginTop: 12, color: pTheme.colors.onSurfaceVariant }}>暂无评论</Text>
            </Card.Content>
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} mode="contained" style={styles.commentCard}>
              <Card.Content>
                <View style={styles.commentHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.authorRow}>
                      <View style={[styles.authorAvatar, { backgroundColor: pTheme.colors.surfaceVariant }]}>
                        <Ionicons name="person" size={14} color={pTheme.colors.onSurfaceVariant} />
                      </View>
                      <Text variant="titleSmall" style={styles.authorName}>
                        {comment.author.name}
                      </Text>
                        {comment.parent_id && (
                        <View style={[styles.replyBadge, { backgroundColor: pTheme.colors.tertiaryContainer }]}>
                          <Ionicons name="return-down-forward" size={10} color={pTheme.colors.onTertiaryContainer} />
                          <Text style={{ fontSize: 10, color: pTheme.colors.onTertiaryContainer, marginLeft: 2 }}>
                            回复
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text variant="bodySmall" style={{ color: pTheme.colors.onSurfaceVariant, marginTop: 2 }}>
                      {comment.author.email || 'ID: ' + comment.author.id}
                    </Text>
                  </View>
                  
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor={pTheme.colors.error}
                    onPress={() => confirmDelete(comment.id)}
                  />
                </View>

                <Text variant="bodyMedium" style={{ marginTop: 12, marginBottom: 8 }}>
                  {comment.content}
                </Text>

                <View style={styles.commentFooter}>
                  <View style={styles.statsRow}>
                    <Ionicons name="heart-outline" size={14} color={pTheme.colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={{ marginLeft: 4, color: pTheme.colors.onSurfaceVariant }}>
                      {comment.like_count || 0}
                    </Text>
                    <Ionicons name="chatbox-outline" size={14} color={pTheme.colors.onSurfaceVariant} style={{ marginLeft: 12 }} />
                    <Text variant="bodySmall" style={{ marginLeft: 4, color: pTheme.colors.onSurfaceVariant }}>
                      {comment.reply_count || 0}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Button 
                      mode="text" 
                      compact 
                      onPress={() => router.push(`/post/${comment.post_id}`)}
                      style={{ marginRight: 8 }}
                    >
                      查看帖子
                    </Button>
                    <Text variant="bodySmall" style={{ color: pTheme.colors.onSurfaceVariant }}>
                      {new Date(comment.created_at).toLocaleString('zh-CN')}
                    </Text>
                  </View>
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
  commentCard: {
    elevation: 0,
    borderWidth: 0,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  authorName: {
    fontWeight: '600',
  },
  replyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
