import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Appbar, Button, Text, TextInput, useTheme as usePaperTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/auth_context';
import { usersService } from '@/src/services/users_service';
import type { UserAggregateStats } from '@/src/models/Stats';
import type { UserProfile } from '@/src/repositories/users_repository';
import { DEFAULT_HOMETOWN, HOMETOWN_OPTIONS, findOptionLabel } from '@/src/constants/selects';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import BottomSheet from '@/src/components/overlays/bottom_sheet';
import CenterPicker from '@/src/components/overlays/center_picker';
import { isAdmin } from '@/src/lib/auth/roles';

const formatCount = (value?: number | null) => {
  if (value == null) return '--';
  if (value < 1000) return String(value);
  if (value < 10000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${(value / 10000).toFixed(1).replace(/\.0$/, '')}w`;
};

export default function MyselfScreen() {
  const { user, preview, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const paperTheme = usePaperTheme();
  const breakpoint = useBreakpoint();

  const headerHeight = pickByBreakpoint(breakpoint, { base: 48, sm: 52, md: 56, lg: 60, xl: 64 });
  const contentHorizontalPadding = pickByBreakpoint(breakpoint, { base: 16, sm: 18, md: 20, lg: 24, xl: 24 });
  const headerTitleStyle = useMemo(
    () => ({
      fontSize: pickByBreakpoint(breakpoint, { base: 18, sm: 18, md: 20, lg: 20, xl: 22 }),
      fontWeight: '600' as const,
    }),
    [breakpoint]
  );

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserAggregateStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [hometownPickerOpen, setHometownPickerOpen] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const [activeEdit, setActiveEdit] = useState<'none' | 'bio' | 'name' | 'hometown'>('none');
  const [bioDraft, setBioDraft] = useState('');

  const displayName = useMemo(
    () => profile?.name ?? user?.name ?? preview?.name ?? '未登录',
    [profile?.name, user?.name, preview?.name]
  );
  const displayEmail = useMemo(
    () => profile?.email ?? user?.email ?? undefined,
    [profile?.email, user?.email]
  );
  const avatarUrl = useMemo(
    () => profile?.avatar_url ?? user?.avatar_url ?? preview?.avatar_url ?? null,
    [profile?.avatar_url, user?.avatar_url, preview?.avatar_url]
  );

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const fetchedProfile = await usersService.getUser(user.id);
      setProfile(fetchedProfile);
      setBioDraft(fetchedProfile.bio ?? '');
      if (fetchedProfile.stats) {
        setStats({
          post_count: fetchedProfile.stats.post_count,
          follower_count: fetchedProfile.stats.follower_count,
          following_count: fetchedProfile.stats.following_count,
          total_likes: 0,
          total_favorites: 0,
          total_views: 0,
          comment_count: 0,
        });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 页面获得焦点时刷新数据
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleNavigateTo = (
    path: '/(tabs)/myself/posts' | '/(tabs)/myself/followers' | '/(tabs)/myself/following'
  ) => {
    if (!user?.id) return;
    router.push(path);
  };

  const handleSaveBio = async () => {
    if (!user?.id) return;
    const updated = await usersService.updateUser(user.id, { bio: bioDraft });
    setProfile(updated);
    setActiveEdit('none');
  };

  const handleSaveName = async () => {
    if (!user?.id || !profile) return;
    const updated = await usersService.updateUser(user.id, { name: profile.name });
    setProfile(updated);
    setActiveEdit('none');
  };

  const handleSaveHometown = async (value: string) => {
    if (!user?.id) return;
    const updated = await usersService.updateUser(user.id, { hometown: value });
    setProfile(updated);
    setHometownPickerOpen(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top} style={{ height: headerHeight }}>
        <Appbar.Content title="个人中心" titleStyle={headerTitleStyle} />
        <Appbar.Action
          icon="cog-outline"
          onPress={() => router.push('/myself/settings')}
          accessibilityLabel="打开设置"
        />
      </Appbar.Header>

      <ScrollView
        style={{ backgroundColor: paperTheme.colors.background }}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 40, paddingHorizontal: contentHorizontalPadding }}
      >
        {errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: paperTheme.colors.errorContainer }]}>
            <Ionicons name="alert-circle" size={18} color={paperTheme.colors.error} />
            <Text style={{ color: paperTheme.colors.error, flex: 1 }}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.profileHeader}>
          <Pressable
            onPress={() => {
              setAvatarDraft(profile?.avatar_url ?? null);
              setAvatarSheetOpen(true);
              setActiveEdit('none');
            }}
            onHoverIn={() => setAvatarHover(true)}
            onHoverOut={() => setAvatarHover(false)}
            style={[styles.avatar, { backgroundColor: paperTheme.colors.surfaceVariant }]}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <Ionicons name="person-circle-outline" size={64} color={paperTheme.colors.onSurfaceVariant} />
            )}
            {Platform.OS === 'web' && avatarHover ? (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="pencil" size={14} color="#fff" />
              </View>
            ) : null}
          </Pressable>
          <View style={styles.profileMeta}>
            <Text variant="titleLarge" style={{ fontWeight: '600' }}>{displayName}</Text>
            {displayEmail ? (
              <Text variant="bodySmall" style={{ marginTop: 4, color: paperTheme.colors.onSurfaceVariant }}>
                {displayEmail}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: '帖子', value: stats?.post_count, route: '/(tabs)/myself/posts' as const },
            { label: '粉丝', value: stats?.follower_count, route: '/(tabs)/myself/followers' as const },
            { label: '关注', value: stats?.following_count, route: '/(tabs)/myself/following' as const },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => handleNavigateTo(item.route)}
              style={({ pressed }) => [styles.statBlock, pressed && { opacity: 0.7 }]}
            >
              <Text variant="headlineSmall" style={[styles.statNumber, { color: paperTheme.colors.primary }]}>
                {formatCount(item.value)}
              </Text>
              <Text variant="labelMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: paperTheme.colors.outlineVariant }]} />

        <Pressable
          style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: paperTheme.colors.surfaceVariant }]}
          onPress={() => {
            if (activeEdit === 'bio') return;
            setBioDraft(profile?.bio ?? '');
            setActiveEdit('bio');
          }}
        >
          <View style={styles.listItemContent}>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurface, fontWeight: '500' }}>个人简介</Text>
            {activeEdit !== 'bio' ? (
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={1}>
                {(profile?.bio ?? '').trim() || '暂无'}
              </Text>
            ) : null}
          </View>
          {activeEdit !== 'bio' ? (
            <Ionicons name="pencil-outline" size={20} color={paperTheme.colors.onSurfaceVariant} />
          ) : null}
        </Pressable>
        {activeEdit === 'bio' ? (
          <View style={styles.editSection}>
            <TextInput
              mode="flat"
              value={bioDraft}
              onChangeText={setBioDraft}
              placeholder="填写你的个人简介"
              multiline
              style={{ backgroundColor: paperTheme.colors.surfaceVariant }}
            />
            <View style={styles.editActions}>
              <Button mode="text" onPress={() => { setBioDraft(profile?.bio ?? ''); setActiveEdit('none'); }}>取消</Button>
              <Button mode="contained" onPress={handleSaveBio}>保存</Button>
            </View>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: paperTheme.colors.surfaceVariant }]}
          onPress={() => {
            if (!profile || activeEdit === 'name') return;
            setActiveEdit('name');
          }}
        >
          <View style={styles.listItemContent}>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurface, fontWeight: '500' }}>昵称</Text>
            {activeEdit !== 'name' ? (
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>
                {(profile?.name ?? '').trim() || '暂无'}
              </Text>
            ) : null}
          </View>
          {activeEdit !== 'name' ? (
            <Ionicons name="pencil-outline" size={20} color={paperTheme.colors.onSurfaceVariant} />
          ) : null}
        </Pressable>
        {activeEdit === 'name' ? (
          <View style={styles.editSection}>
            <TextInput
              mode="flat"
              value={profile?.name ?? ''}
              onChangeText={(value) => setProfile((prev) => (prev ? { ...prev, name: value } : prev))}
              placeholder="输入你的昵称"
              style={{ backgroundColor: paperTheme.colors.surfaceVariant }}
            />
            <View style={styles.editActions}>
              <Button mode="text" onPress={() => setActiveEdit('none')}>取消</Button>
              <Button mode="contained" onPress={handleSaveName}>保存</Button>
            </View>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: paperTheme.colors.surfaceVariant }]}
          onPress={() => setHometownPickerOpen(true)}
        >
          <View style={styles.listItemContent}>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurface, fontWeight: '500' }}>家乡</Text>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>
              {findOptionLabel(HOMETOWN_OPTIONS, profile?.hometown) ?? DEFAULT_HOMETOWN}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>

        {user && isAdmin(user.role) ? (
          <Pressable
            onPress={() => router.push('/myself/admin')}
            style={({ pressed }) => [
              styles.adminBanner,
              { backgroundColor: paperTheme.colors.primaryContainer },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={[styles.adminIconWrap, { backgroundColor: `${paperTheme.colors.primary}1A` }]}>
              <Ionicons name="shield-checkmark" size={24} color={paperTheme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ fontWeight: '600' }}>管理中心</Text>
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 2 }}>
                管理帖子、用户和评论
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={paperTheme.colors.onSurfaceVariant} />
          </Pressable>
        ) : null}

        <Button
          mode="contained"
          onPress={signOut}
          style={{ marginTop: 24 }}
          buttonColor={paperTheme.colors.error}
        >
          登出
        </Button>
      </ScrollView>

      <BottomSheet visible={avatarSheetOpen} onClose={() => setAvatarSheetOpen(false)}>
        <Text style={{ marginBottom: 8 }}>修改头像</Text>
        <TextInput
          mode="flat"
          placeholder="输入图片 URL，留空使用自动头像"
          value={avatarDraft ?? ''}
          onChangeText={(value) => setAvatarDraft(value)}
          style={{ backgroundColor: paperTheme.colors.surfaceVariant }}
        />
        <View style={styles.editActions}>
          <Button
            mode="text"
            onPress={() => {
              setAvatarSheetOpen(false);
              setAvatarDraft(null);
            }}
          >
            取消
          </Button>
          <Button
            mode="contained"
            loading={loading}
            onPress={async () => {
              if (!user?.id) return;
              setLoading(true);
              setErrorMessage('');
              try {
                const normalized = avatarDraft && avatarDraft.trim() !== '' ? avatarDraft : null;
                const updated = await usersService.updateUser(user.id, { avatar_url: normalized });
                setProfile(updated);
                setAvatarSheetOpen(false);
                setAvatarDraft(null);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : String(error));
              } finally {
                setLoading(false);
              }
            }}
          >
            保存
          </Button>
        </View>
      </BottomSheet>

      <CenterPicker
        visible={hometownPickerOpen}
        onClose={() => setHometownPickerOpen(false)}
        title="选择家乡"
        options={HOMETOWN_OPTIONS}
        selectedValue={profile?.hometown}
        onSelect={handleSaveHometown}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 8,
  },
  avatar: {
    height: 80,
    width: 80,
    borderRadius: 40,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    height: '100%',
    width: '100%',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  profileMeta: {
    flex: 1,
    gap: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 28,
    marginBottom: 20,
    paddingVertical: 8,
  },
  statBlock: {
    alignItems: 'center',
    gap: 6,
    minWidth: 72,
  },
  statNumber: {
    fontWeight: '700',
    fontSize: 22,
  },
  divider: {
    height: 1,
    borderRadius: 1,
    marginBottom: 16,
    marginHorizontal: -4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    minHeight: 60,
  },
  listItemContent: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  editSection: {
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    marginTop: 24,
  },
  adminIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
