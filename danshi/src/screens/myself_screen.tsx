import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Image, Platform, Pressable, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTheme } from '@/src/context/theme_context';
import { useAuth } from '@/src/context/auth_context';
import { Appbar, Button, Card, IconButton, Text, TextInput, useTheme as usePaperTheme } from 'react-native-paper';
import { usersService } from '@/src/services/users_service';
import type { UserProfile } from '@/src/repositories/users_repository';
import { DEFAULT_HOMETOWN, HOMETOWN_OPTIONS } from '@/src/constants/selects';
import BottomSheet from '@/src/components/overlays/bottom_sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MyselfScreen() {
	const { text, icon, card, effective } = useTheme();
	const { user, preview, signOut } = useAuth();

	const [profile, setProfile] = useState<UserProfile | null>(null);
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
				const p = await usersService.getUser(user.id);
				if (mounted) {
					setProfile(p);
					setBioDraft(p.bio ?? '');
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
		return (
			<View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
				<Appbar.Header mode="center-aligned" statusBarHeight={insets.top}>
								<Appbar.Content title="个人中心" />
					<Appbar.Action icon="cog-outline" onPress={() => router.push('/myself/settings')} accessibilityLabel="打开设置" />
				</Appbar.Header>
				<ScrollView style={{ backgroundColor: pTheme.colors.background }} contentContainerStyle={{ padding: 16 }}>

			{/* user card */}
						<Card style={{ marginTop: 8 }}>
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
					<View style={{ flex: 1, marginLeft: 12 }}>
												<Text variant="titleMedium">{name}</Text>
												{email ? <Text style={{ marginTop: 4, color: icon as string }}>{email}</Text> : null}
					</View>
				</View>
								</Card.Content>
						</Card>

			{/* stats */}
			<View style={{ height: 12 }} />
			{profile ? (
								<Card>
										<Card.Content>
										<Text variant="titleSmall" style={{ marginBottom: 8 }}>数据概览</Text>
					<View style={styles.statsRow}>
												<View style={styles.statItem}><Text variant="titleMedium">{profile.stats.postCount}</Text><Text style={styles.statLabel}>帖子</Text></View>
												<View style={styles.statItem}><Text variant="titleMedium">{profile.stats.likeCount}</Text><Text style={styles.statLabel}>获赞</Text></View>
												<View style={styles.statItem}><Text variant="titleMedium">{profile.stats.favoriteCount}</Text><Text style={styles.statLabel}>收藏</Text></View>
												<View style={styles.statItem}><Text variant="titleMedium">{profile.stats.followerCount}</Text><Text style={styles.statLabel}>粉丝</Text></View>
												<View style={styles.statItem}><Text variant="titleMedium">{profile.stats.followingCount}</Text><Text style={styles.statLabel}>关注</Text></View>
					</View>
										</Card.Content>
								</Card>
			) : null}

			{/* bio */}
			<View style={{ height: 12 }} />
						<Card>
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
						<Card>
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
						<Card>
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
});
