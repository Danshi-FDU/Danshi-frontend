import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Image, Platform, Pressable, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTheme } from '@/src/context/theme_context';
import { useAuth } from '@/src/context/auth_context';
import { Appbar, Button, Card, IconButton, Text, TextInput, useTheme as usePaperTheme } from 'react-native-paper';
import { usersService } from '@/src/services/users_service';
import { statsService } from '@/src/services/stats_service';
import type { UserAggregateStats } from '@/src/models/Stats';
import type { UserProfile } from '@/src/repositories/users_repository';
import { DEFAULT_HOMETOWN, HOMETOWN_OPTIONS } from '@/src/constants/selects';
import BottomSheet from '@/src/components/overlays/bottom_sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { isAdmin } from '@/src/lib/auth/roles';

const formatCount = (value?: number | null) => {
	if (value == null) return '--';
	if (value < 1000) return String(value);
	if (value < 10000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
	return `${(value / 10000).toFixed(1).replace(/\.0$/, '')}w`;
};

export default function MyselfScreen() {
	const { text, icon, card, effective } = useTheme();
	const { user, preview, signOut } = useAuth();
	const bp = useBreakpoint();
	const headerHeight = pickByBreakpoint(bp, { base: 48, sm: 52, md: 56, lg: 60, xl: 64 });
	const contentHorizontalPadding = pickByBreakpoint(bp, { base: 16, sm: 18, md: 20, lg: 24, xl: 24 });
	const headerTitleStyle = useMemo(() => ({
		fontSize: pickByBreakpoint(bp, { base: 18, sm: 18, md: 20, lg: 20, xl: 22 }),
		fontWeight: '600' as const,
	}), [bp]);

	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [stats, setStats] = useState<UserAggregateStats | null>(null);
	const [loading, setLoading] = useState(false);
	const [err, setErr] = useState('');
	const [editingBio, setEditingBio] = useState(false); 
	const [bioDraft, setBioDraft] = useState('');
	const [avatarOpen, setAvatarOpen] = useState(false);
	const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
	const [avatarHover, setAvatarHover] = useState(false);
	const [activeEdit, setActiveEdit] = useState<'none' | 'bio' | 'name' | 'hometown'>('none');

	const name = useMemo(() => profile?.name ?? user?.name ?? preview?.name ?? '未登录', [profile?.name, user?.name, preview?.name]);
	const email = useMemo(() => profile?.email ?? user?.email ?? undefined, [profile?.email, user?.email]);
	const avatarUrl = useMemo(() => profile?.avatarUrl ?? user?.avatarUrl ?? preview?.avatarUrl ?? null, [profile?.avatarUrl, user?.avatarUrl, preview?.avatarUrl]);

	useEffect(() => {
		let mounted = true;
		async function load() {
			if (!user?.id) return;
			setLoading(true);
			setErr('');
			try {
				// const [p, aggregates] = await Promise.all([
				// 	usersService.getUser(user.id),
				// 	statsService.getUserStats(user.id),
				// ]);
				const p = await usersService.getUser(user.id);
				if (mounted) {
					setProfile(p);
					setBioDraft(p.bio ?? '');
					// setStats(aggregates);
					if (p.stats) {
						setStats({
							post_count: p.stats.post_count,
							follower_count: p.stats.follower_count,
							following_count: p.stats.following_count,
							total_likes: 0,
							total_favorites: 0,
							total_views: 0,
						});
					}
				}
			} catch (e) {
				if (mounted) setErr(e instanceof Error ? e.message : String(e));
			} finally {
				if (mounted) setLoading(false);
			}
		}
		load();
		return () => { mounted = false; };
	}, [user?.id]);

		const insets = useSafeAreaInsets();

		const pTheme = usePaperTheme();
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

		const handleNavigate = (
			path: '/(tabs)/myself/posts' | '/(tabs)/myself/followers' | '/(tabs)/myself/following',
		) => {
			if (!user?.id) return;
			router.push(path);
		};
		return (
			<View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
				<Appbar.Header mode="center-aligned" statusBarHeight={insets.top} style={{ height: headerHeight }}>
					<Appbar.Content title="个人中心" titleStyle={headerTitleStyle} />
					<Appbar.Action icon="cog-outline" onPress={() => router.push('/myself/settings')} accessibilityLabel="打开设置" />
				</Appbar.Header>
				<ScrollView
					style={{ backgroundColor: pTheme.colors.background }}
					contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, paddingHorizontal: contentHorizontalPadding }}
				>

			{/* user card */}
					<Card mode="contained" style={flatCardStyle}>
					<Card.Content>
					<View style={styles.profileRow}>
					<Pressable
						onPress={() => {
							setAvatarDraft(profile?.avatarUrl ?? null);
							setAvatarOpen(true);
							setActiveEdit('none');
						}}
						onHoverIn={() => setAvatarHover(true)}
						onHoverOut={() => setAvatarHover(false)}
						style={[styles.avatar, { backgroundColor: card as string }]}
					>
						{avatarUrl ? (
							<Image source={{ uri: avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
						) : (
							<Ionicons name="person-circle-outline" size={64} color={icon as string} />
						)}
						{Platform.OS === 'web' && avatarHover ? (
							<View style={[styles.avatarEditBadge, { backgroundColor: effective === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)' }]}>
								<Ionicons name="pencil" size={14} color={text as string} />
							</View>
						) : null}
					</Pressable>
					<View style={styles.profileMeta}>
						<Text variant="titleMedium">{name}</Text>
						{email ? <Text style={{ marginTop: 4, color: icon as string }}>{email}</Text> : null}
					</View>
					</View>
					{stats ? (
						<View style={styles.profileStatsRow}>
							{[
								{ label: '帖子', value: stats?.post_count, route: '/(tabs)/myself/posts' as const },
								{ label: '粉丝', value: stats?.follower_count, route: '/(tabs)/myself/followers' as const },
								{ label: '关注', value: stats?.following_count, route: '/(tabs)/myself/following' as const },
							].map((item) => (
								<Pressable
									key={item.label}
									onPress={() => handleNavigate(item.route)}
									android_ripple={{ color: pTheme.colors.surfaceDisabled }}
									style={({ pressed }) => [
										styles.profileStat,
										{ backgroundColor: pTheme.colors.surfaceVariant },
										pressed && { opacity: 0.8 },
									]}
								>
									<Text variant="titleMedium" style={styles.profileStatValue}>
										{formatCount(item.value)}
									</Text>
									<Text style={[styles.profileStatLabel, { color: icon as string }]}>{item.label}</Text>
								</Pressable>
							))}
						</View>
					) : (
						<View style={styles.profileStatsRow}>
							{['帖子', '粉丝', '关注'].map((label) => (
								<View key={label} style={[styles.profileStat, { backgroundColor: pTheme.colors.surfaceVariant }]}>
									<Text variant="titleMedium" style={styles.profileStatValue}>--</Text>
									<Text style={[styles.profileStatLabel, { color: icon as string }]}>{label}</Text>
								</View>
							))}
						</View>
					)}
					</Card.Content>
				</Card>

			{/* stats */}
			<View style={{ height: 12 }} />
			{stats ? (
				<Card mode="contained" style={flatCardStyle}>
					<Card.Content>
					<Text variant="titleSmall" style={{ marginBottom: 8 }}>数据概览</Text>
					<View style={styles.statsRow}>
						<View style={styles.statItem}><Text variant="titleMedium">{formatCount(stats?.total_likes)}</Text><Text style={styles.statLabel}>获赞</Text></View>
						<View style={styles.statItem}><Text variant="titleMedium">{formatCount(stats?.total_favorites)}</Text><Text style={styles.statLabel}>收藏</Text></View>
						<View style={styles.statItem}><Text variant="titleMedium">{formatCount(stats?.comment_count)}</Text><Text style={styles.statLabel}>评论</Text></View>
						<View style={styles.statItem}><Text variant="titleMedium">{formatCount(stats?.total_views)}</Text><Text style={styles.statLabel}>浏览</Text></View>
					</View>
					</Card.Content>
				</Card>
			) : null}

			{/* bio */}
			<View style={{ height: 12 }} />
				<Card mode="contained" style={flatCardStyle}>
					<Card.Title title="个人简介" right={(props) => activeEdit !== 'bio' ? (
						<IconButton {...props} icon="pencil-outline" onPress={() => { setBioDraft(profile?.bio ?? ''); setActiveEdit('bio'); }} />
					) : null} />
					<Card.Content>
						{activeEdit !== 'bio' ? (
							<Text style={{ color: icon as string }}>{(profile?.bio ?? '').trim() ? profile?.bio : '暂无'}</Text>
						) : (
						<>
							<TextInput
								mode="outlined"
								value={bioDraft}
								onChangeText={setBioDraft}
								placeholder="填写你的个人简介"
								multiline
							/>
							<View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
								<Button mode="text" onPress={() => { setBioDraft(profile?.bio ?? ''); setActiveEdit('none'); }} style={{ marginRight: 8 }}>取消</Button>
								<Button mode="contained" onPress={async () => {
									if (!user?.id) return;
									const updated = await usersService.updateUser(user.id, { bio: bioDraft });
									setProfile(updated);
									setActiveEdit('none');
								}}>保存</Button>
							</View>
						</>
					)}
					</Card.Content>
				</Card>

			{/* username */}
						<View style={{ height: 12 }} />
						<Card mode="contained" style={flatCardStyle}>
							<Card.Title title="昵称" right={(props) => activeEdit !== 'name' ? (
								<IconButton {...props} icon="pencil-outline" onPress={() => { setActiveEdit('name'); }} />
							) : null} />
							<Card.Content>
								{activeEdit !== 'name' ? (
									<Text style={{ color: icon as string }}>{(profile?.name ?? '').trim() ? profile?.name : '暂无'}</Text>
								) : (
									<>
										<TextInput
											mode="outlined"
											value={profile?.name ?? ''}
											onChangeText={(t) => setProfile(p => (p ? { ...p, name: t } : p))}
											placeholder="输入你的昵称"
										/>
										<View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
											<Button mode="text" onPress={() => { setActiveEdit('none'); }} style={{ marginRight: 8 }}>取消</Button>
											<Button mode="contained" onPress={async () => {
												if (!user?.id || !profile) return;
												const updated = await usersService.updateUser(user.id, { name: profile.name });
												setProfile(updated);
												setActiveEdit('none');
											}}>保存</Button>
										</View>
									</>
								)}
							</Card.Content>
						</Card>

			{/* hometown */}
						<View style={{ height: 12 }} />
						<Card mode="contained" style={flatCardStyle}>
							<Card.Title title="家乡" right={(props) => activeEdit !== 'hometown' ? (
								<IconButton {...props} icon="pencil-outline" onPress={() => { setActiveEdit('hometown'); }} />
							) : null} />
							<Card.Content>
								{activeEdit !== 'hometown' ? (
									<Text style={{ color: icon as string }}>{profile?.hometown ?? DEFAULT_HOMETOWN}</Text>
								) : (
									<>
										<View style={{ gap: 8 }}>
											{HOMETOWN_OPTIONS.map(opt => (
												<Pressable key={opt.value} onPress={async () => {
													if (!user?.id) return;
													const updated = await usersService.updateUser(user.id, { hometown: opt.value });
													setProfile(updated);
													setActiveEdit('none');
												}} style={({ pressed }) => [
													{ paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, backgroundColor: card as string },
													pressed && { opacity: 0.9 }
												]}>
													<Text>{opt.label}</Text>
												</Pressable>
											))}
										</View>
										<View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
											<Button mode="text" onPress={() => setActiveEdit('none')}>取消</Button>
										</View>
									</>
								)}
							</Card.Content>
						</Card>

			{/* admin entrance */}
			{user && isAdmin(user.role) && (
				<>
					<View style={{ height: 12 }} />
					<Card mode="contained" style={flatCardStyle}>
						<Card.Content>
							<Pressable
								onPress={() => router.push('/myself/admin')}
								android_ripple={{ color: pTheme.colors.surfaceDisabled }}
								style={({ pressed }) => [
									styles.adminButton,
									{ backgroundColor: pTheme.colors.primaryContainer },
									pressed && { opacity: 0.9 }
								]}
							>
								<View style={styles.adminButtonContent}>
									<View style={[styles.adminIcon, { backgroundColor: pTheme.colors.primary + '20' }]}>
										<Ionicons name="shield-checkmark" size={24} color={pTheme.colors.primary} />
									</View>
									<View style={{ flex: 1, marginLeft: 12 }}>
										<Text variant="titleMedium" style={{ fontWeight: '600' }}>管理中心</Text>
										<Text variant="bodySmall" style={{ color: pTheme.colors.onSurfaceVariant, marginTop: 2 }}>
											管理帖子、用户和评论
										</Text>
									</View>
									<Ionicons name="chevron-forward" size={20} color={pTheme.colors.onSurfaceVariant} />
								</View>
							</Pressable>
						</Card.Content>
					</Card>
				</>
			)}

			{/* avatar */}
			<BottomSheet visible={avatarOpen} onClose={() => setAvatarOpen(false)}>
								<Text style={{ marginBottom: 8 }}>修改头像</Text>
								<TextInput
										mode="outlined"
										placeholder="输入图片URL，留空使用自动头像"
										value={avatarDraft ?? ''}
										onChangeText={(t) => setAvatarDraft(t)}
								/>
				<View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
										<Button
												mode="text"
												onPress={() => {
														setAvatarOpen(false);
														setAvatarDraft(null);
												}}
												style={{ marginRight: 8 }}
										>取消</Button>
										<Button
												mode="contained"
												loading={loading}
												onPress={async () => {
														if (!user?.id) return;
														setLoading(true);
														setErr('');
														try {
																const normalized = avatarDraft && avatarDraft.trim() !== '' ? avatarDraft : null;
																const updated = await usersService.updateUser(user.id, { avatarUrl: normalized });
																setProfile(updated);
																setAvatarOpen(false);
																setAvatarDraft(null);
														} catch (e) {
																setErr(e instanceof Error ? e.message : String(e));
														} finally {
																setLoading(false);
														}
												}}
										>保存</Button>
				</View>
								{err ? <Text style={{ marginTop: 6, color: '#d33' }}>{err}</Text> : null}
			</BottomSheet>

            <View style={{ height: 16 }} />
						<Button mode="contained" buttonColor={'#B71C1C'} onPress={() => signOut()}>登出</Button>
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
	avatarEditBadge: {
		position: 'absolute',
		right: 2,
		bottom: 2,
		backgroundColor: 'rgba(0,0,0,0.06)',
		borderRadius: 10,
		paddingHorizontal: 4,
		paddingVertical: 2,
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
	adminButton: {
		borderRadius: 12,
		overflow: 'hidden',
	},
	adminButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 8,
	},
	adminIcon: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
