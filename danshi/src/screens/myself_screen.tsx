import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import Button from '@/src/components/ui/button';
import { useTheme } from '@/src/context/theme_context';
import { useAuth } from '@/src/context/auth_context';
import Screen from '@/src/components/ui/screen';
import Card from '@/src/components/ui/card';
import { H2, Body } from '@/src/components/ui/typography';

export default function MyselfScreen() {
	const { text, icon, card } = useTheme();
	const { user, preview, signOut } = useAuth();

	const name = user?.name ?? preview?.name ?? '未登录';
	const email = user?.email ?? undefined;
	const avatarUrl = user?.avatarUrl ?? preview?.avatarUrl ?? null;

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
					<View style={[styles.avatar, { backgroundColor: card as string }]}>
						{avatarUrl ? (
							<Image source={{ uri: avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
						) : (
							<Ionicons name="person-circle-outline" size={64} color={icon as string} />
						)}
					</View>
					<View style={{ flex: 1, marginLeft: 12 }}>
						<Body emphasis style={{ fontSize: 16 }}>{name}</Body>
						{email ? <Body style={{ marginTop: 4, color: icon as string }}>{email}</Body> : null}
					</View>
				</View>
			</Card>

			{/* other */}
			<View style={{ height: 12 }} />
			<Card padded>
				<Body style={{ color: icon as string }}>其它入口</Body>
			</Card>

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
	avatarImg: {
		height: '100%',
		width: '100%',
	},
});
