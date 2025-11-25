import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Image, ScrollView, Pressable } from 'react-native';
import { Appbar, Button, Card, Text, useTheme as usePaperTheme, IconButton } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { useTheme } from '@/src/context/theme_context';
import { useAuth } from '@/src/context/auth_context';
import { usersService } from '@/src/services/users_service';
import { statsService } from '@/src/services/stats_service';
import type { UserProfile } from '@/src/repositories/users_repository';
import type { UserAggregateStats } from '@/src/models/Stats';
import Ionicons from '@expo/vector-icons/Ionicons';

const formatCount = (value?: number | null) => {
  if (value == null) return '--';
  if (value < 1000) return String(value);
  if (value < 10000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${(value / 10000).toFixed(1).replace(/\.0$/, '')}w`;
};

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { text, icon, card, effective } = useTheme();
  const { user: currentUser } = useAuth();
  const bp = useBreakpoint();
  const insets = useSafeAreaInsets();
  const pTheme = usePaperTheme();

  const headerHeight = pickByBreakpoint(bp, { base: 48, sm: 52, md: 56, lg: 60, xl: 64 });
  const contentHorizontalPadding = pickByBreakpoint(bp, { base: 16, sm: 18, md: 20, lg: 24, xl: 24 });
  const headerTitleStyle = useMemo(() => ({
    fontSize: pickByBreakpoint(bp, { base: 18, sm: 18, md: 20, lg: 20, xl: 22 }),
    fontWeight: '600' as const,
  }), [bp]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserAggregateStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState('');

  const flatCardStyle = useMemo(
    () => ({
      backgroundColor: pTheme.colors.surface,
      borderWidth: 0,
      borderColor: 'transparent',
      elevation: 0,
      shadowColor: 'transparent',
    }),
    [pTheme.colors.surface],
  );

  const isCurrentUser = currentUser?.id === userId;

  useEffect(() => {
    if (!userId) return;
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      // const [profileData, statsData] = await Promise.all([
      //   usersService.getUser(userId),
      //   statsService.getUserStats(userId),
      // ]);
      const profileData = await usersService.getUser(userId);
      setProfile(profileData);
      // setStats(statsData);
      if (profileData.stats) {
        setStats({
          post_count: profileData.stats.post_count,
          follower_count: profileData.stats.follower_count,
          following_count: profileData.stats.following_count,
          total_likes: 0,
          total_favorites: 0,
          total_views: 0,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!userId || !profile) return;
    setFollowLoading(true);
    try {
      if (profile.is_following) {
        await usersService.unfollowUser(userId);
        setProfile({ 
          ...profile, 
          is_following: false, 
          stats: { ...profile.stats, follower_count: profile.stats.follower_count - 1 }
        });
      } else {
        await usersService.followUser(userId);
        setProfile({ 
          ...profile, 
          is_following: true, 
          stats: { ...profile.stats, follower_count: profile.stats.follower_count + 1 }
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFollowLoading(false);
    }
  };

  if (!userId) {
    return (
      <View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
        <Appbar.Header mode="center-aligned" statusBarHeight={insets.top} style={{ height: headerHeight }}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="用户主页" titleStyle={headerTitleStyle} />
        </Appbar.Header>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>用户ID缺失</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top} style={{ height: headerHeight }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="用户主页" titleStyle={headerTitleStyle} />
      </Appbar.Header>

      <ScrollView
        style={{ backgroundColor: pTheme.colors.background }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, paddingHorizontal: contentHorizontalPadding }}
      >
        {loading && !profile ? (
          <Card mode="contained" style={flatCardStyle}>
            <Card.Content style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text>加载中...</Text>
            </Card.Content>
          </Card>
        ) : error ? (
          <Card mode="contained" style={flatCardStyle}>
            <Card.Content style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: pTheme.colors.error }}>{error}</Text>
              <Button mode="text" onPress={loadUserData} style={{ marginTop: 8 }}>
                重试
              </Button>
            </Card.Content>
          </Card>
        ) : profile ? (
          <>
            {/* 用户卡片 */}
            <Card mode="contained" style={flatCardStyle}>
              <Card.Content>
                <View style={styles.profileRow}>
                  <View style={[styles.avatar, { backgroundColor: card as string }]}>
                    {profile.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} resizeMode="cover" />
                    ) : (
                      <Ionicons name="person-circle-outline" size={64} color={icon as string} />
                    )}
                  </View>
                  <View style={styles.profileMeta}>
                    <Text variant="titleLarge" style={{ fontWeight: '600' }}>{profile.name}</Text>
                    {profile.email ? <Text style={{ marginTop: 4, color: icon as string }}>{profile.email}</Text> : null}
                    {!isCurrentUser && (
                      <Button
                        mode={profile.is_following ? 'outlined' : 'contained'}
                        onPress={handleFollowToggle}
                        loading={followLoading}
                        style={{ marginTop: 8, alignSelf: 'flex-start' }}
                        icon={profile.is_following ? 'check' : 'plus'}
                      >
                        {profile.is_following ? '已关注' : '关注'}
                      </Button>
                    )}
                  </View>
                </View>

                {/* 统计数据 */}
                <View style={styles.profileStatsRow}>
                  <View style={[styles.profileStat, { backgroundColor: pTheme.colors.surfaceVariant }]}>
                    <Text variant="titleMedium" style={styles.profileStatValue}>
                      {formatCount(stats?.post_count)}
                    </Text>
                    <Text style={[styles.profileStatLabel, { color: icon as string }]}>帖子</Text>
                  </View>
                  <View style={[styles.profileStat, { backgroundColor: pTheme.colors.surfaceVariant }]}>
                    <Text variant="titleMedium" style={styles.profileStatValue}>
                      {formatCount(profile.stats.follower_count)}
                    </Text>
                    <Text style={[styles.profileStatLabel, { color: icon as string }]}>粉丝</Text>
                  </View>
                  <View style={[styles.profileStat, { backgroundColor: pTheme.colors.surfaceVariant }]}>
                    <Text variant="titleMedium" style={styles.profileStatValue}>
                      {formatCount(profile.stats.following_count)}
                    </Text>
                    <Text style={[styles.profileStatLabel, { color: icon as string }]}>关注</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* 数据概览 */}
            {stats && (
              <>
                <View style={{ height: 12 }} />
                <Card mode="contained" style={flatCardStyle}>
                  <Card.Content>
                    <Text variant="titleSmall" style={{ marginBottom: 8 }}>数据概览</Text>
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text variant="titleMedium">{formatCount(stats?.total_likes)}</Text>
                        <Text style={styles.statLabel}>获赞</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text variant="titleMedium">{formatCount(stats?.total_favorites)}</Text>
                        <Text style={styles.statLabel}>收藏</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text variant="titleMedium">{formatCount(stats?.comment_count)}</Text>
                        <Text style={styles.statLabel}>评论</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text variant="titleMedium">{formatCount(stats?.total_views)}</Text>
                        <Text style={styles.statLabel}>浏览</Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              </>
            )}

            {/* 个人简介 */}
            {profile.bio && (
              <>
                <View style={{ height: 12 }} />
                <Card mode="contained" style={flatCardStyle}>
                  <Card.Title title="个人简介" />
                  <Card.Content>
                    <Text style={{ color: icon as string }}>{profile.bio}</Text>
                  </Card.Content>
                </Card>
              </>
            )}

            {/* 其他信息 */}
            <View style={{ height: 12 }} />
            <Card mode="contained" style={flatCardStyle}>
              <Card.Content>
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={18} color={icon as string} />
                  <Text style={{ marginLeft: 8, color: icon as string }}>
                    {profile.hometown || '未设置'}
                  </Text>
                </View>
                {profile.gender && (
                  <View style={[styles.infoRow, { marginTop: 8 }]}>
                    <Ionicons name={profile.gender === 'male' ? 'male' : 'female'} size={18} color={icon as string} />
                    <Text style={{ marginLeft: 8, color: icon as string }}>
                      {profile.gender === 'male' ? '男' : '女'}
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileMeta: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  avatar: {
    height: 72,
    width: 72,
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    height: '100%',
    width: '100%',
  },
  profileStatsRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginHorizontal: -4,
  },
  profileStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  profileStatValue: {
    fontWeight: '600',
  },
  profileStatLabel: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    opacity: 0.7,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

