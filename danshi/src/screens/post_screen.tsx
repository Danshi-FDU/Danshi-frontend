import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import {
	Appbar,
	Button,
	Card,
	HelperText,
	IconButton,
	SegmentedButtons,
	Text,
	TextInput,
	useTheme as usePaperTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { useTheme } from '@/src/context/theme_context';
import { postsService } from '@/src/services/posts_service';
import type {
	Category,
	CommonCreateBase,
	CompanionPostCreateInput,
	PostCreateInput,
	PostType,
	SharePostCreateInput,
	ShareType,
} from '@/src/models/Post';

export default function PostScreen() {
	const bp = useBreakpoint();
	const maxWidth = pickByBreakpoint(bp, { base: 560, sm: 600, md: 640, lg: 720, xl: 800 });
	const verticalGap = pickByBreakpoint(bp, { base: 10, sm: 12, md: 12, lg: 16, xl: 20 });
	const contentHeight = pickByBreakpoint(bp, { base: 120, sm: 140, md: 160, lg: 200, xl: 240 });
	const headerHeight = pickByBreakpoint(bp, { base: 48, sm: 52, md: 56, lg: 60, xl: 64 });
	const horizontalPadding = pickByBreakpoint(bp, { base: 16, sm: 18, md: 20, lg: 24, xl: 24 });
	const headerTitleStyle = useMemo(
		() => ({
			fontSize: pickByBreakpoint(bp, { base: 18, sm: 18, md: 20, lg: 20, xl: 22 }),
			fontWeight: '600' as const,
		}),
		[bp]
	);
	const { danger, icon } = useTheme();
	const insets = useSafeAreaInsets();
	const pTheme = usePaperTheme();

	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [postType, setPostType] = useState<PostType>('share');
	const [shareType, setShareType] = useState<ShareType>('recommend');
	const [category, setCategory] = useState<Category>('food');
	const [canteen, setCanteen] = useState('');
	const [cuisine, setCuisine] = useState('');
	const [flavorsInput, setFlavorsInput] = useState('');
	const [tagsInput, setTagsInput] = useState('');
	const [price, setPrice] = useState('');
	const [images, setImages] = useState<string[]>(['']);
	const [budgetMin, setBudgetMin] = useState('');
	const [budgetMax, setBudgetMax] = useState('');
	const [preferFlavors, setPreferFlavors] = useState('');
	const [avoidFlavors, setAvoidFlavors] = useState('');
	const [meetingDate, setMeetingDate] = useState('');
	const [meetingTime, setMeetingTime] = useState('');
	const [meetingLocation, setMeetingLocation] = useState('');
	const [meetingMaxPeople, setMeetingMaxPeople] = useState('');
	const [meetingCurrentPeople, setMeetingCurrentPeople] = useState('');
	const [meetingCostSharing, setMeetingCostSharing] = useState('');
	const [contactMethod, setContactMethod] = useState<'comment' | 'wechat' | 'other'>('comment');
	const [contactNote, setContactNote] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const parseList = (value: string) =>
		value
			.split(/[\n,，,]/)
			.map((item) => item.trim())
			.filter(Boolean);

	const parsedTags = useMemo(() => {
		const list = parseList(tagsInput);
		return Array.from(new Set(list)).slice(0, 10);
	}, [tagsInput]);
	const parsedFlavors = useMemo(() => parseList(flavorsInput), [flavorsInput]);
	const parsedPreferFlavors = useMemo(() => parseList(preferFlavors), [preferFlavors]);
	const parsedAvoidFlavors = useMemo(() => parseList(avoidFlavors), [avoidFlavors]);
	const filteredImages = useMemo(() => images.map((url) => url.trim()).filter(Boolean), [images]);

	const handleChangeImage = (index: number, value: string) => {
		setImages((prev) => prev.map((item, idx) => (idx === index ? value : item)));
	};

	const handleAddImageField = () => setImages((prev) => [...prev, '']);

	const handleRemoveImageField = (index: number) => {
		setImages((prev) => (prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== index)));
	};

	const resetForm = () => {
		setTitle('');
		setContent('');
		setPostType('share');
		setShareType('recommend');
		setCategory('food');
		setCanteen('');
		setCuisine('');
		setFlavorsInput('');
		setTagsInput('');
		setPrice('');
		setImages(['']);
		setBudgetMin('');
		setBudgetMax('');
		setPreferFlavors('');
		setAvoidFlavors('');
		setMeetingDate('');
		setMeetingTime('');
		setMeetingLocation('');
		setMeetingMaxPeople('');
		setMeetingCurrentPeople('');
		setMeetingCostSharing('');
		setContactMethod('comment');
		setContactNote('');
	};

	const validate = (): string => {
		if (!title.trim()) return '请输入标题';
		if (title.trim().length < 2) return '标题至少 2 个字';
		if (!content.trim()) return '请输入正文内容';
		if (content.trim().length < 5) return '正文至少 5 个字';
		if (postType === 'share') {
			if (!filteredImages.length) return '请至少提供 1 张图片链接';
			if (filteredImages.some((url) => !/^https?:\/\//i.test(url))) return '图片 URL 需以 http/https 开头';
			if (price && Number(price) < 0) return '价格需大于等于 0';
		}
		if (postType === 'seeking') {
			if ((budgetMin && Number(budgetMin) < 0) || (budgetMax && Number(budgetMax) < 0)) {
				return '预算不能为负数';
			}
			if (budgetMin && budgetMax && Number(budgetMax) < Number(budgetMin)) {
				return '预算上限需大于等于下限';
			}
		}
		if (postType === 'companion') {
			if (!meetingDate.trim() || !meetingTime.trim() || !meetingLocation.trim()) {
				return '请填写约饭的日期、时间与地点';
			}
			if (meetingMaxPeople && Number(meetingMaxPeople) <= 0) return '人数上限需大于 0';
			if (
				meetingMaxPeople &&
				meetingCurrentPeople &&
				Number(meetingCurrentPeople) > Number(meetingMaxPeople)
			) {
				return '当前人数不可超过人数上限';
			}
		}
		return '';
	};

	const onSubmit = async () => {
		setError('');
		setSuccess('');
		const errorMessage = validate();
		if (errorMessage) {
			setError(errorMessage);
			return;
		}
		setLoading(true);
		try {
			const commonFields: Omit<CommonCreateBase, 'postType'> = {
				title: title.trim(),
				content: content.trim(),
				category,
				canteen: canteen.trim() || undefined,
				tags: parsedTags.length ? parsedTags : undefined,
				images: filteredImages.length ? filteredImages.slice(0, 9) : undefined,
			};
			let payload: PostCreateInput;
			if (postType === 'share') {
				const sharePayload: SharePostCreateInput = {
					postType: 'share',
					...commonFields,
					shareType,
					cuisine: cuisine.trim() || undefined,
					flavors: parsedFlavors,
					price: price ? Number(price) : undefined,
					images: filteredImages.slice(0, 9),
				};
				payload = sharePayload;
			} else if (postType === 'seeking') {
				const toNumber = (value: string) => {
					const parsed = Number.parseFloat(value);
					return Number.isFinite(parsed) ? parsed : undefined;
				};
				const minBudget = toNumber(budgetMin);
				const maxBudget = toNumber(budgetMax);
				payload = {
					postType: 'seeking',
					...commonFields,
					budgetRange:
						typeof minBudget !== 'undefined' || typeof maxBudget !== 'undefined'
							? {
								min: typeof minBudget !== 'undefined' ? minBudget : 0,
								max: typeof maxBudget !== 'undefined' ? maxBudget : typeof minBudget !== 'undefined' ? minBudget : 0,
							}
							: undefined,
					preferences:
						parsedPreferFlavors.length || parsedAvoidFlavors.length
							? {
								preferFlavors: parsedPreferFlavors,
								avoidFlavors: parsedAvoidFlavors,
							}
							: undefined,
				};
			} else {
				const companionPayload: CompanionPostCreateInput = {
					postType: 'companion',
					...commonFields,
					meetingInfo: {
						date: meetingDate || undefined,
						time: meetingTime || undefined,
						location: meetingLocation || undefined,
						maxPeople: meetingMaxPeople ? Number(meetingMaxPeople) : undefined,
						currentPeople: meetingCurrentPeople ? Number(meetingCurrentPeople) : undefined,
						costSharing: meetingCostSharing || undefined,
					},
					contact: {
						method: contactMethod,
						note: contactNote || undefined,
					},
				};
				payload = companionPayload;
			}
			const result = await postsService.create(payload);
			setSuccess(`发布成功，当前状态：${result.status === 'pending' ? '待审核' : result.status}`);
			resetForm();
		} catch (err) {
			setError((err as Error)?.message ?? '发布失败，请稍后重试');
		} finally {
			setLoading(false);
		}
	};

	const contentCount = content.trim().length;

	return (
		<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
			<View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
				<Appbar.Header mode="center-aligned" statusBarHeight={insets.top} style={{ height: headerHeight }}>
					<Appbar.Content title="发布帖子" titleStyle={headerTitleStyle} />
				</Appbar.Header>
				<ScrollView
					style={{ backgroundColor: pTheme.colors.background }}
					contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, paddingHorizontal: horizontalPadding, alignItems: 'center' }}
				>
					<View style={{ width: '100%', maxWidth }}>
						<Card>
							<Card.Content>
								<Text variant="titleMedium" style={{ marginBottom: 8 }}>
									新建帖子
								</Text>
								{!!error && <Text style={{ color: danger, marginBottom: 8 }}>{error}</Text>}
								{!!success && <Text style={{ color: '#16a34a', marginBottom: 8 }}>{success}</Text>}
								<View style={{ gap: verticalGap }}>
									<SegmentedButtons
										value={postType}
										onValueChange={(value) => setPostType((value as PostType) ?? 'share')}
										buttons={[
											{ value: 'share', label: '美食分享' },
											{ value: 'seeking', label: '求推荐' },
											{ value: 'companion', label: '找搭子' },
										]}
									/>
									<SegmentedButtons
										value={category}
										onValueChange={(value) => setCategory((value as Category) ?? 'food')}
										buttons={[
											{ value: 'food', label: '美食' },
											{ value: 'recipe', label: '食谱' },
										]}
									/>
									{postType === 'share' ? (
										<SegmentedButtons
											value={shareType}
											onValueChange={(value) => setShareType((value as ShareType) ?? 'recommend')}
											buttons={[
												{ value: 'recommend', label: '推荐' },
												{ value: 'warning', label: '避雷' },
											]}
										/>
									) : null}
									<TextInput label="输入标题" mode="outlined" value={title} onChangeText={setTitle} maxLength={80} />
									<TextInput
										label="输入正文（支持多行）"
										mode="outlined"
										value={content}
										onChangeText={setContent}
										multiline
										numberOfLines={Math.max(4, Math.round(contentHeight / 24))}
										style={{ height: contentHeight, textAlignVertical: 'top' }}
									/>
									<Text style={{ color: icon, textAlign: 'right' }}>字数：{contentCount}</Text>
									<TextInput
										label="所属食堂 / 地点"
										mode="outlined"
										value={canteen}
										onChangeText={setCanteen}
										placeholder="例：邯郸校区南区食堂"
									/>
									<TextInput
										label="标签（逗号或换行分隔）"
										mode="outlined"
										value={tagsInput}
										onChangeText={setTagsInput}
										placeholder="南区, 红烧肉"
									/>
									<HelperText type="info">最多 10 个标签，提交时会自动去重</HelperText>
									<View style={{ gap: 12 }}>
										<Text variant="labelLarge">图片链接</Text>
										{images.map((url, idx) => (
											<View key={`image-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
												<TextInput
													style={{ flex: 1 }}
													mode="outlined"
													label={`图片 ${idx + 1}`}
													value={url}
													onChangeText={(value) => handleChangeImage(idx, value)}
													placeholder="https://"
												/>
												{images.length > 1 ? (
													<IconButton icon="close" onPress={() => handleRemoveImageField(idx)} accessibilityLabel="删除图片链接" />
												) : null}
											</View>
										))}
										<Button mode="outlined" icon="plus" onPress={handleAddImageField}>
											添加图片链接
										</Button>
									</View>
									{postType === 'share' ? (
										<View style={{ gap: 12 }}>
											<Text variant="labelLarge">分享信息</Text>
											<TextInput label="菜系" mode="outlined" value={cuisine} onChangeText={setCuisine} placeholder="如：川菜" />
											<TextInput
												label="口味标签（逗号或换行分隔）"
												mode="outlined"
												value={flavorsInput}
												onChangeText={setFlavorsInput}
												placeholder="清淡, 微辣"
											/>
											<TextInput
												label="价格（元）"
												mode="outlined"
												value={price}
												onChangeText={setPrice}
												keyboardType="decimal-pad"
											/>
										</View>
									) : null}
									{postType === 'seeking' ? (
										<View style={{ gap: 12 }}>
											<Text variant="labelLarge">求推荐偏好</Text>
											<View style={{ flexDirection: 'row', gap: 12 }}>
												<TextInput
													style={{ flex: 1 }}
													label="预算下限"
													mode="outlined"
													value={budgetMin}
													onChangeText={setBudgetMin}
													keyboardType="numeric"
													placeholder="0"
												/>
												<TextInput
													style={{ flex: 1 }}
													label="预算上限"
													mode="outlined"
													value={budgetMax}
													onChangeText={setBudgetMax}
													keyboardType="numeric"
													placeholder="20"
												/>
											</View>
											<TextInput
												label="偏好口味（逗号或换行分隔）"
												mode="outlined"
												value={preferFlavors}
												onChangeText={setPreferFlavors}
												placeholder="清淡, 家常"
											/>
											<TextInput
												label="忌口（逗号或换行分隔）"
												mode="outlined"
												value={avoidFlavors}
												onChangeText={setAvoidFlavors}
												placeholder="特辣, 油炸"
											/>
										</View>
									) : null}
									{postType === 'companion' ? (
										<View style={{ gap: 12 }}>
											<Text variant="labelLarge">约饭信息</Text>
											<View style={{ flexDirection: 'row', gap: 12 }}>
												<TextInput
													style={{ flex: 1 }}
													label="日期 (YYYY-MM-DD)"
													mode="outlined"
													value={meetingDate}
													onChangeText={setMeetingDate}
													placeholder="2025-11-20"
												/>
												<TextInput
													style={{ flex: 1 }}
													label="时间 (HH:mm)"
													mode="outlined"
													value={meetingTime}
													onChangeText={setMeetingTime}
													placeholder="18:30"
												/>
											</View>
											<TextInput
												label="地点"
												mode="outlined"
												value={meetingLocation}
												onChangeText={setMeetingLocation}
												placeholder="春晖三楼烤鱼档"
											/>
											<View style={{ flexDirection: 'row', gap: 12 }}>
												<TextInput
													style={{ flex: 1 }}
													label="人数上限"
													mode="outlined"
													value={meetingMaxPeople}
													onChangeText={setMeetingMaxPeople}
													keyboardType="numeric"
												/>
												<TextInput
													style={{ flex: 1 }}
													label="当前人数"
													mode="outlined"
													value={meetingCurrentPeople}
													onChangeText={setMeetingCurrentPeople}
													keyboardType="numeric"
												/>
											</View>
											<TextInput
												label="费用分摊"
												mode="outlined"
												value={meetingCostSharing}
												onChangeText={setMeetingCostSharing}
												placeholder="AA / 请客 / 其他"
											/>
											<SegmentedButtons
												value={contactMethod}
												onValueChange={(value) => setContactMethod((value as 'comment' | 'wechat' | 'other') ?? 'comment')}
												buttons={[
													{ value: 'comment', label: '评论联系' },
													{ value: 'wechat', label: '微信' },
													{ value: 'other', label: '其他' },
												]}
											/>
											<TextInput
												label="联系方式说明"
												mode="outlined"
												value={contactNote}
												onChangeText={setContactNote}
												placeholder="例：加我微信备注“烤鱼”"
											/>
										</View>
									) : null}
									<Button mode="contained" loading={loading} onPress={onSubmit}>
										发布
									</Button>
								</View>
							</Card.Content>
						</Card>
					</View>
				</ScrollView>
			</View>
		</KeyboardAvoidingView>
	);
}

