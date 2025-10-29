import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import Screen from '@/src/components/ui/screen';
import Container from '@/src/components/ui/container';
import Card from '@/src/components/ui/card';
import Input from '@/src/components/ui/input';
import Button from '@/src/components/ui/button';
import { H2, Body } from '@/src/components/ui/typography';
import { useTheme } from '@/src/context/theme_context';
import { postsService } from '@/src/services/posts_service';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';

export default function PostScreen() {
	const bp = useBreakpoint();
	const maxWidth = pickByBreakpoint(bp, { base: 560, sm: 600, md: 640, lg: 720, xl: 800 });
	const verticalGap = pickByBreakpoint(bp, { base: 10, sm: 12, md: 12, lg: 16, xl: 20 });
	const contentHeight = pickByBreakpoint(bp, { base: 120, sm: 140, md: 160, lg: 200, xl: 240 });
	const { danger, icon } = useTheme();
	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const validate = () => {
		if (!title.trim()) return '请输入标题';
		if (title.trim().length < 2) return '标题至少 2 个字';
		if (!content.trim()) return '请输入正文内容';
		if (content.trim().length < 5) return '正文至少 5 个字';
		return '';
	};

	const onSubmit = async () => {
		setError('');
		setSuccess('');
		const v = validate();
		if (v) {
			setError(v);
			return;
		}
		setLoading(true);
	    try {
		    await postsService.create({ title, content });
			setSuccess('发布成功');
			setTitle('');
			setContent('');
		} catch (e) {
			setError('发布失败，请重试');
		} finally {
			setLoading(false);
		}
	};

	const contentCount = content.trim().length;

	return (
		<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
			<Screen variant="scroll" title="发布帖子">
				<Container maxWidth={maxWidth}>
					<Card padded>
						<H2 style={{ marginBottom: 12 }}>新建帖子</H2>

						{!!error && <Body style={{ color: danger, marginBottom: 8 }}>{error}</Body>}
						{!!success && <Body style={{ color: '#16a34a', marginBottom: 8 }}>{success}</Body>}

						<View style={{ gap: verticalGap }}>
							<Input
								placeholder="输入标题"
								value={title}
								onChangeText={setTitle}
								maxLength={80}
							/>

							<Input
								placeholder="输入正文（支持多行）"
								value={content}
								onChangeText={setContent}
								multiline
								numberOfLines={Math.max(4, Math.round(contentHeight / 24))}
								style={{ height: contentHeight, textAlignVertical: 'top' }}
							/>

							<Body style={{ color: icon, textAlign: 'right' }}>字数：{contentCount}</Body>

							<Button title="发布" variant="primary" loading={loading} onPress={onSubmit} />
						</View>
					</Card>
				</Container>
			</Screen>
		</KeyboardAvoidingView>
	);
}

