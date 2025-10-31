import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Platform, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import Button from '@/src/components/ui/button';
import { useTheme } from '@/src/context/theme_context';
import { useAuth } from '@/src/context/auth_context';
import Screen from '@/src/components/ui/screen';
import Card from '@/src/components/ui/card';
import { H2, Body } from '@/src/components/ui/typography';
import Input from '@/src/components/ui/input';
import { usersService } from '@/src/services/users_service';
import type { UserProfile } from '@/src/repositories/users_repository';
import { DEFAULT_HOMETOWN, HOMETOWN_OPTIONS } from '@/src/constants/selects';
import { EditableTextRow, EditableSelectRow } from '@/src/components/ui/editable';
import BottomSheet from '@/src/components/overlays/bottom_sheet';
import AvatarDropzone from '@/src/components/ui/avatar_dropzone';

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

	return (
		<Screen variant="scroll" withContainer>
			{/* Topbar: Title + Settings Button */}
			<View style={styles.headerRow}>
				<H2>个人中心</H2>
						<TouchableOpacity
							onPress={() => router.push('/myself/settings')}
					accessibilityRole="button"
					accessibilityLabel="打开设置"
					style={{ paddingVertical: 6, paddingHorizontal: 8 }}
				>
					<Ionicons name="settings-outline" size={20} color={text as string} />
				</TouchableOpacity>
			</View>

			{/* user card */}
			<Card padded style={{ marginTop: 8 }}>
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
						<Body emphasis style={{ fontSize: 16 }}>{name}</Body>
						{email ? <Body style={{ marginTop: 4, color: icon as string }}>{email}</Body> : null}
					</View>
				</View>
			</Card>

			{/* stats */}
			<View style={{ height: 12 }} />
			{profile ? (
				<Card padded>
					<Body emphasis style={{ marginBottom: 8 }}>数据概览</Body>
					<View style={styles.statsRow}>
						<View style={styles.statItem}><Body emphasis>{profile.stats.postCount}</Body><Body style={styles.statLabel}>帖子</Body></View>
						<View style={styles.statItem}><Body emphasis>{profile.stats.likeCount}</Body><Body style={styles.statLabel}>获赞</Body></View>
						<View style={styles.statItem}><Body emphasis>{profile.stats.favoriteCount}</Body><Body style={styles.statLabel}>收藏</Body></View>
						<View style={styles.statItem}><Body emphasis>{profile.stats.followerCount}</Body><Body style={styles.statLabel}>粉丝</Body></View>
						<View style={styles.statItem}><Body emphasis>{profile.stats.followingCount}</Body><Body style={styles.statLabel}>关注</Body></View>
					</View>
				</Card>
			) : null}

			{/* bio */}
			<View style={{ height: 12 }} />
			<EditableTextRow
				label="个人简介"
				value={profile?.bio ?? ''}
				placeholder="填写你的个人简介"
				multiline
				initialEditing={false}
				onToggleEditing={(open) => { setEditingBio(open); setActiveEdit(open ? 'bio' : 'none'); }}
				editing={activeEdit === 'bio'}
				onSave={async (next) => {
					if (!user?.id) return;
					const updated = await usersService.updateUser(user.id, { bio: next });
					setProfile(updated);
					setBioDraft(updated.bio ?? '');
				}}
			/>

			{/* username */}
			<EditableTextRow
				label="昵称"
				value={profile?.name ?? ''}
				placeholder="输入你的昵称"
				onToggleEditing={(open) => setActiveEdit(open ? 'name' : 'none')}
				editing={activeEdit === 'name'}
				onSave={async (next) => {
					if (!user?.id) return;
					const updated = await usersService.updateUser(user.id, { name: next });
					setProfile(updated);
				}}
			/>

			{/* hometown */}
			<EditableSelectRow
				label="家乡"
				value={profile?.hometown ?? DEFAULT_HOMETOWN}
				placeholder={DEFAULT_HOMETOWN}
				options={HOMETOWN_OPTIONS}
				onToggleEditing={(open) => setActiveEdit(open ? 'hometown' : 'none')}
				editing={activeEdit === 'hometown'}
				onSave={async (next) => {
					if (!user?.id) return;
					const updated = await usersService.updateUser(user.id, { hometown: next });
					setProfile(updated);
				}}
			/>

			{/* avatar */}
			<BottomSheet visible={avatarOpen} onClose={() => setAvatarOpen(false)}>
				<Body style={{ marginBottom: 8 }}>修改头像</Body>
				{Platform.OS === 'web' ? (
					<AvatarDropzone value={avatarDraft ?? profile?.avatarUrl ?? undefined} onChange={(u) => setAvatarDraft(u)} />
				) : (
					<Input
						placeholder="输入图片URL，留空使用自动头像"
						value={avatarDraft ?? ''}
						onChangeText={(t) => setAvatarDraft(t)}
					/>
				)}
				<View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
					<Button
						title="取消"
						variant="secondary"
						size="sm"
						onPress={() => {
							setAvatarOpen(false);
							setAvatarDraft(null);
						}}
						style={{ marginRight: 8 }}
					/>
					<Button
						title="保存"
						size="sm"
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
					/>
				</View>
				{err ? <Body style={{ marginTop: 6, color: '#d33' }}>{err}</Body> : null}
			</BottomSheet>

            <View style={{ height: 16 }} />
            
            <Button variant="danger" onPress={() => signOut()} title="登出"></Button>
		</Screen>
	);
}

const styles = StyleSheet.create({
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
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
