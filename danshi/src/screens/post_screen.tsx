import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, StyleSheet } from 'react-native';
import {
	Appbar,
	Button,
	Card,
	Chip,
	Divider,
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
import Ionicons from '@expo/vector-icons/Ionicons';
import type {
	Category,
	CommonCreateBase,
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

	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [post_type, setPostType] = useState<PostType>('share');
	const [share_type, setShareType] = useState<ShareType>('recommend');
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
	const [avoid_flavors, setAvoidFlavors] = useState('');
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
	const parsed_prefer_flavors = useMemo(() => parseList(preferFlavors), [preferFlavors]);
	const parsed_avoid_flavors = useMemo(() => parseList(avoid_flavors), [avoid_flavors]);
	// const parsedFlavors: string[] = [];
	// const parsed_prefer_flavors: string[] = [];
	// const parsed_avoid_flavors: string[] = [];
	const filtered_images = useMemo(() => images.map((url) => url.trim()).filter(Boolean), [images]);

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
	};

	const validate = (): string => {
		if (!title.trim()) return '请输入标题';
		if (title.trim().length < 2) return '标题至少 2 个字';
		if (!content.trim()) return '请输入正文内容';
		if (content.trim().length < 5) return '正文至少 5 个字';
		if (post_type === 'share') {
			if (!filtered_images.length) return '请至少提供 1 张图片链接';
			if (filtered_images.some((url) => !/^https?:\/\//i.test(url))) return '图片 URL 需以 http/https 开头';
			if (price && Number(price) < 0) return '价格需大于等于 0';
		}
		if (post_type === 'seeking') {
			if ((budgetMin && Number(budgetMin) < 0) || (budgetMax && Number(budgetMax) < 0)) {
				return '预算不能为负数';
			}
			if (budgetMin && budgetMax && Number(budgetMax) < Number(budgetMin)) {
				return '预算上限需大于等于下限';
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
			const common_fields: Omit<CommonCreateBase, 'post_type'> = {
				title: title.trim(),
				content: content.trim(),
				category,
				canteen: canteen.trim() || undefined,
				tags: parsedTags.length ? parsedTags : undefined,
				images: filtered_images.length ? filtered_images.slice(0, 9) : undefined,
			};
			let payload: PostCreateInput;
			if (post_type === 'share') {
				const sharePayload: SharePostCreateInput = {
					post_type: 'share',
						...common_fields,
					share_type: share_type,
					cuisine: cuisine.trim() || undefined,
					flavors: parsedFlavors.length ? parsedFlavors : undefined,
					price: price ? Number(price) : undefined,
					images: filtered_images.slice(0, 9),
				};
				payload = sharePayload;
			} else {
				const toNumber = (value: string) => {
					const parsed = Number.parseFloat(value);
					return Number.isFinite(parsed) ? parsed : undefined;
				};
				const minBudget = toNumber(budgetMin);
				const maxBudget = toNumber(budgetMax);
				payload = {
					post_type: 'seeking',
					...common_fields,
					budget_range:
						typeof minBudget !== 'undefined' || typeof maxBudget !== 'undefined'
							? {
								min: typeof minBudget !== 'undefined' ? minBudget : 0,
								max: typeof maxBudget !== 'undefined' ? maxBudget : typeof minBudget !== 'undefined' ? minBudget : 0,
							}
							: undefined,
					preferences:
						parsed_prefer_flavors.length || parsed_avoid_flavors.length
							? {
								prefer_flavors: parsed_prefer_flavors,
								avoid_flavors: parsed_avoid_flavors,
							}
							: undefined,
				};
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

	const content_count = content.trim().length;

	return (
		<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
			<View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
				<Appbar.Header mode="center-aligned" statusBarHeight={insets.top} style={{ height: headerHeight }}>
					<Appbar.Content title="发布帖子" titleStyle={headerTitleStyle} />
				</Appbar.Header>
				<ScrollView
					style={{ backgroundColor: pTheme.colors.background }}
					contentContainerStyle={{ paddingTop: 16, paddingBottom: 32, paddingHorizontal: horizontalPadding, alignItems: 'center' }}
				>
					<View style={{ width: '100%', maxWidth }}>
						{/* 错误/成功提示 */}
						{!!error && (
							<Card mode="contained" style={[styles.messageCard, { backgroundColor: pTheme.colors.errorContainer }]}>
								<Card.Content style={styles.messageContent}>
									<Ionicons name="alert-circle" size={20} color={pTheme.colors.error} />
									<Text style={{ color: pTheme.colors.error, flex: 1 }}>{error}</Text>
								</Card.Content>
							</Card>
						)}
						{!!success && (
							<Card mode="contained" style={[styles.messageCard, { backgroundColor: '#d1fae5' }]}>
								<Card.Content style={styles.messageContent}>
									<Ionicons name="checkmark-circle" size={20} color="#16a34a" />
									<Text style={{ color: '#16a34a', flex: 1 }}>{success}</Text>
								</Card.Content>
							</Card>
						)}

						{/* 帖子类型选择 */}
						<Card mode="contained" style={[flatCardStyle, styles.sectionCard]}>
							<Card.Content>
								<View style={styles.sectionHeader}>
									<Ionicons name="layers" size={20} color={pTheme.colors.primary} />
									<Text variant="titleSmall" style={styles.sectionTitle}>帖子类型</Text>
								</View>
								<View style={{ gap: 12 }}>
									<SegmentedButtons
										value={post_type}
										onValueChange={(value) => setPostType((value as PostType) ?? 'share')}
										buttons={[
											{ value: 'share', label: '美食分享', icon: 'share-variant' },
											{ value: 'seeking', label: '求推荐', icon: 'compass' },
										]}
									/>
									{/* <SegmentedButtons
										value={category}
										onValueChange={(value) => setCategory((value as Category) ?? 'food')}
										buttons={[
											{ value: 'food', label: '美食', icon: 'food' },
											{ value: 'recipe', label: '食谱', icon: 'book-open-variant' },
										]}
									/> */}
									{post_type === 'share' ? (
										<SegmentedButtons
											value={share_type}
											onValueChange={(value) => setShareType((value as ShareType) ?? 'recommend')}
											buttons={[
												{ value: 'recommend', label: '推荐', icon: 'thumb-up' },
												{ value: 'warning', label: '避雷', icon: 'alert' },
											]}
										/>
									) : null}
								</View>
							</Card.Content>
						</Card>

						{/* 基础信息 */}
						<Card mode="contained" style={[flatCardStyle, styles.sectionCard]}>
							<Card.Content>
								<View style={styles.sectionHeader}>
									<Ionicons name="create" size={20} color={pTheme.colors.primary} />
									<Text variant="titleSmall" style={styles.sectionTitle}>基础信息</Text>
								</View>
								<View style={{ gap: verticalGap }}>
									<TextInput 
										label="标题" 
										mode="outlined" 
										value={title} 
										onChangeText={setTitle} 
										maxLength={80}
										left={<TextInput.Icon icon="text" />}
										placeholder="给你的帖子起个标题吧"
									/>
									<TextInput
										label="正文内容"
										mode="outlined"
										value={content}
										onChangeText={setContent}
										multiline
										numberOfLines={Math.max(4, Math.round(contentHeight / 24))}
										style={{ height: contentHeight, textAlignVertical: 'top' }}
										left={<TextInput.Icon icon="text-box" />}
										placeholder="分享你的美食体验..."
									/>
									<View style={styles.charCount}>
										<Ionicons name="document-text" size={14} color={icon as string} />
										<Text style={{ color: icon, fontSize: 12, marginLeft: 4 }}>
											{content_count} / 推荐100字以上
										</Text>
									</View>
								</View>
							</Card.Content>
						</Card>

						{/* 位置与标签 */}
						<Card mode="contained" style={[flatCardStyle, styles.sectionCard]}>
							<Card.Content>
								<View style={styles.sectionHeader}>
									<Ionicons name="location" size={20} color={pTheme.colors.primary} />
									<Text variant="titleSmall" style={styles.sectionTitle}>位置与标签</Text>
								</View>
								<View style={{ gap: verticalGap }}>
									<TextInput
										label="所属食堂 / 地点"
										mode="outlined"
										value={canteen}
										onChangeText={setCanteen}
										left={<TextInput.Icon icon="map-marker" />}
										placeholder="例：邯郸校区南区食堂"
									/>
									<TextInput
										label="标签"
										mode="outlined"
										value={tagsInput}
										onChangeText={setTagsInput}
										left={<TextInput.Icon icon="tag-multiple" />}
										placeholder="用逗号分隔多个标签，如：南区, 红烧肉"
									/>
									{parsedTags.length > 0 && (
										<View style={styles.chipContainer}>
											{parsedTags.map((tag, idx) => (
												<Chip key={idx} compact style={styles.chip}>{tag}</Chip>
											))}
										</View>
									)}
									<HelperText type="info" style={{ marginTop: -8 }}>
										<Ionicons name="information-circle" size={14} /> 最多10个标签，自动去重
									</HelperText>
								</View>
							</Card.Content>
						</Card>

						{/* 图片 */}
						<Card mode="contained" style={[flatCardStyle, styles.sectionCard]}>
							<Card.Content>
								<View style={styles.sectionHeader}>
									<Ionicons name="images" size={20} color={pTheme.colors.primary} />
									<Text variant="titleSmall" style={styles.sectionTitle}>图片</Text>
									<Text variant="bodySmall" style={{ color: icon, marginLeft: 'auto' }}>
										{filtered_images.length} / 9
									</Text>
								</View>
								<View style={{ gap: 10 }}>
									{images.map((url, idx) => (
										<View key={`image-${idx}`} style={styles.imageRow}>
											<TextInput
												style={{ flex: 1 }}
												mode="outlined"
												dense
												label={`图片链接 ${idx + 1}`}
												value={url}
												onChangeText={(value) => handleChangeImage(idx, value)}
												left={<TextInput.Icon icon="link" />}
												placeholder="https://example.com/image.jpg"
											/>
											{images.length > 1 && (
												<IconButton 
													icon="close-circle" 
													size={20}
													onPress={() => handleRemoveImageField(idx)} 
													iconColor={pTheme.colors.error}
												/>
											)}
										</View>
									))}
									<Button 
										mode="outlined" 
										icon="plus" 
										onPress={handleAddImageField}
										disabled={images.length >= 9}
									>
										添加图片链接
									</Button>
								</View>
							</Card.Content>
						</Card>

						{/* 分享信息 */}
						{post_type === 'share' && (
							<Card mode="contained" style={[flatCardStyle, styles.sectionCard]}>
								<Card.Content>
									<View style={styles.sectionHeader}>
										<Ionicons name="restaurant" size={20} color={pTheme.colors.primary} />
										<Text variant="titleSmall" style={styles.sectionTitle}>分享详情</Text>
									</View>
									<View style={{ gap: verticalGap }}>
										<TextInput 
											label="菜系" 
											mode="outlined" 
											value={cuisine} 
											onChangeText={setCuisine}
											left={<TextInput.Icon icon="silverware-fork-knife" />}
											placeholder="如：川菜、粤菜"
										/>
										{/* <TextInput
											label="口味标签"
											mode="outlined"
											value={flavorsInput}
											onChangeText={setFlavorsInput}
											left={<TextInput.Icon icon="chili-hot" />}
											placeholder="用逗号分隔，如：清淡, 微辣"
										/>
										{parsedFlavors.length > 0 && (
											<View style={styles.chipContainer}>
												{parsedFlavors.map((flavor, idx) => (
													<Chip key={idx} compact icon="chili-mild" style={styles.chip}>{flavor}</Chip>
												))}
											</View>
										)} */}
										<TextInput
											label="价格（元）"
											mode="outlined"
											value={price}
											onChangeText={setPrice}
											keyboardType="decimal-pad"
											left={<TextInput.Icon icon="currency-cny" />}
											placeholder="0.00"
										/>
									</View>
								</Card.Content>
							</Card>
						)}

						{/* 求推荐偏好 */}
						{post_type === 'seeking' && (
							<Card mode="contained" style={[flatCardStyle, styles.sectionCard]}>
								<Card.Content>
									<View style={styles.sectionHeader}>
										<Ionicons name="options" size={20} color={pTheme.colors.primary} />
										<Text variant="titleSmall" style={styles.sectionTitle}>偏好设置</Text>
									</View>
									<View style={{ gap: verticalGap }}>
										<View style={{ flexDirection: 'row', gap: 12 }}>
											<TextInput
												style={{ flex: 1 }}
												label="预算下限"
												mode="outlined"
												value={budgetMin}
												onChangeText={setBudgetMin}
												keyboardType="numeric"
												left={<TextInput.Icon icon="currency-cny" />}
												placeholder="0"
											/>
											<TextInput
												style={{ flex: 1 }}
												label="预算上限"
												mode="outlined"
												value={budgetMax}
												onChangeText={setBudgetMax}
												keyboardType="numeric"
												left={<TextInput.Icon icon="currency-cny" />}
												placeholder="50"
											/>
										</View>
										{/* <TextInput
											label="偏好口味"
											mode="outlined"
											value={preferFlavors}
											onChangeText={setPreferFlavors}
											left={<TextInput.Icon icon="heart" />}
											placeholder="用逗号分隔，如：清淡, 家常"
										/>
										{parsed_prefer_flavors.length > 0 && (
											<View style={styles.chipContainer}>
												{parsed_prefer_flavors.map((flavor, idx) => (
													<Chip key={idx} compact icon="heart" style={styles.chip}>{flavor}</Chip>
												))}
											</View>
										)}
										<TextInput
											label="忌口"
											mode="outlined"
											value={avoid_flavors}
											onChangeText={setAvoidFlavors}
											left={<TextInput.Icon icon="close-circle" />}
											placeholder="用逗号分隔，如：特辣, 油炸"
										/>
										{parsed_avoid_flavors.length > 0 && (
											<View style={styles.chipContainer}>
												{parsed_avoid_flavors.map((flavor, idx) => (
													<Chip key={idx} compact icon="close-circle" style={styles.chip}>{flavor}</Chip>
												))}
											</View>
										)} */}
									</View>
								</Card.Content>
							</Card>
						)}

						{/* 发布按钮 */}
						<Button 
							mode="contained" 
							loading={loading} 
							onPress={onSubmit}
							icon="send"
							contentStyle={styles.submitButton}
							labelStyle={styles.submitButtonLabel}
						>
							发布帖子
						</Button>
					</View>
				</ScrollView>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	messageCard: {
		marginBottom: 16,
		elevation: 0,
		borderWidth: 0,
	},
	messageContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 8,
	},
	sectionCard: {
		marginBottom: 16,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.05)',
	},
	sectionTitle: {
		fontWeight: '600',
		marginLeft: 8,
	},
	charCount: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		marginTop: -4,
	},
	chipContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 4,
	},
	chip: {
		height: 28,
	},
	imageRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	submitButton: {
		paddingVertical: 8,
	},
	submitButtonLabel: {
		fontSize: 16,
		fontWeight: '600',
	},
});

