import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, StyleSheet, Pressable } from 'react-native';
import {
	Appbar,
	Button,
	Chip,
	IconButton,
	SegmentedButtons,
	Text,
	TextInput,
	useTheme as usePaperTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { postsService } from '@/src/services/posts_service';
import Ionicons from '@expo/vector-icons/Ionicons';
import type {
	Category,
	CommonCreateBase,
	Post,
	PostCreateInput,
	PostType,
	SharePostCreateInput,
	ShareType,
} from '@/src/models/Post';

type PostScreenProps = {
	editMode?: boolean;
	editPostId?: string;
	initialData?: Post | null;
	loading?: boolean;
	onUpdateSuccess?: () => void;
};

export default function PostScreen({
	editMode = false,
	editPostId,
	initialData,
	loading: initialLoading = false,
	onUpdateSuccess,
}: PostScreenProps = {}) {
	const bp = useBreakpoint();
	const maxWidth = pickByBreakpoint(bp, { base: 560, sm: 600, md: 640, lg: 720, xl: 800 });
	const contentHeight = pickByBreakpoint(bp, { base: 140, sm: 160, md: 180, lg: 220, xl: 260 });
	const headerHeight = pickByBreakpoint(bp, { base: 48, sm: 52, md: 56, lg: 60, xl: 64 });
	const horizontalPadding = pickByBreakpoint(bp, { base: 16, sm: 18, md: 20, lg: 24, xl: 24 });
	const headerTitleStyle = useMemo(
		() => ({
			fontSize: pickByBreakpoint(bp, { base: 18, sm: 18, md: 20, lg: 20, xl: 22 }),
			fontWeight: '600' as const,
		}),
		[bp]
	);
	const insets = useSafeAreaInsets();
	const pTheme = usePaperTheme();

	// 输入框通用样式 - Filled 风格，使用 surfaceVariant
	const inputStyle = useMemo(
		() => ({
			backgroundColor: pTheme.colors.surfaceVariant,
		}),
		[pTheme.colors.surfaceVariant],
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

	// 编辑模式：从initialData初始化表单
	React.useEffect(() => {
		if (editMode && initialData && !initialLoading) {
			setTitle(initialData.title || '');
			setContent(initialData.content || '');
			setPostType(initialData.post_type || 'share');
			if (initialData.post_type === 'share') {
				setShareType(initialData.share_type || 'recommend');
				setCuisine(initialData.cuisine || '');
				setFlavorsInput(initialData.flavors?.join(', ') || '');
				setPrice(initialData.price?.toString() || '');
			}
			setCategory(initialData.category || 'food');
			setCanteen(initialData.canteen || '');
			setTagsInput(initialData.tags?.join(', ') || '');
			setImages(initialData.images?.length ? [...initialData.images, ''] : ['']);
			if (initialData.post_type === 'seeking') {
				if (initialData.budget_range) {
					setBudgetMin(initialData.budget_range.min?.toString() || '');
					setBudgetMax(initialData.budget_range.max?.toString() || '');
				}
				if (initialData.preferences) {
					setPreferFlavors(initialData.preferences.prefer_flavors?.join(', ') || '');
					setAvoidFlavors(initialData.preferences.avoid_flavors?.join(', ') || '');
				}
			}
		}
	}, [editMode, initialData, initialLoading]);

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
			
			if (editMode && editPostId) {
				// 编辑模式：更新帖子
				await postsService.update(editPostId, payload);
				setSuccess('更新成功，等待审核');
				onUpdateSuccess?.();
			} else {
				// 创建模式：创建新帖子
				const result = await postsService.create(payload);
				setSuccess(`发布成功，当前状态：${result.status === 'pending' ? '待审核' : result.status}`);
				resetForm();
			}
		} catch (err) {
			setError((err as Error)?.message ?? '发布失败，请稍后重试');
		} finally {
			setLoading(false);
		}
	};

		const content_count = content.trim().length;

		// 编辑模式加载中状态
		if (editMode && initialLoading) {
			return (
				<View style={{ flex: 1, backgroundColor: pTheme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
					<Text>正在加载帖子数据...</Text>
				</View>
			);
		}	return (
		<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
			<View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
				<Appbar.Header mode="center-aligned" statusBarHeight={insets.top} style={{ height: headerHeight }}>
					<Appbar.Content title={editMode ? '编辑帖子' : '发布帖子'} titleStyle={headerTitleStyle} />
				</Appbar.Header>
				<ScrollView
					style={{ backgroundColor: pTheme.colors.background }}
					contentContainerStyle={{ paddingTop: 20, paddingBottom: 40, paddingHorizontal: horizontalPadding, alignItems: 'center' }}
					keyboardShouldPersistTaps="handled"
				>
					<View style={{ width: '100%', maxWidth }}>
						{/* 错误/成功提示 */}
						{!!error && (
							<View style={[styles.messageCard, { backgroundColor: pTheme.colors.errorContainer }]}>
								<Ionicons name="alert-circle" size={18} color={pTheme.colors.error} />
								<Text style={{ color: pTheme.colors.error, flex: 1, fontSize: 14 }}>{error}</Text>
							</View>
						)}
						{!!success && (
							<View style={[styles.messageCard, { backgroundColor: '#d1fae5' }]}>
								<Ionicons name="checkmark-circle" size={18} color="#16a34a" />
								<Text style={{ color: '#16a34a', flex: 1, fontSize: 14 }}>{success}</Text>
							</View>
						)}

						{/* 帖子类型选择 - 紧凑的 SegmentedButtons */}
						<View style={styles.typeSection}>
							<SegmentedButtons
								value={post_type}
								onValueChange={(value) => setPostType((value as PostType) ?? 'share')}
								buttons={[
									{ value: 'share', label: '分享美食' },
									{ value: 'seeking', label: '求推荐' },
								]}
								density="medium"
							/>
							{post_type === 'share' && (
								<View style={styles.subTypeRow}>
									{(['recommend', 'warning'] as ShareType[]).map((type) => (
										<Pressable
											key={type}
											onPress={() => setShareType(type)}
											style={[
												styles.subTypeChip,
												share_type === type && { 
													borderColor: pTheme.colors.primary,
													backgroundColor: pTheme.colors.primaryContainer,
												},
											]}
										>
											<Text 
												style={[
													styles.subTypeText, 
													{ color: share_type === type ? pTheme.colors.primary : pTheme.colors.onSurfaceVariant }
												]}
											>
												{type === 'recommend' ? '推荐' : '避雷'}
											</Text>
										</Pressable>
									))}
								</View>
							)}
						</View>

						{/* 标题输入 - Filled Text Field */}
						<TextInput 
							mode="flat" 
							value={title} 
							onChangeText={setTitle} 
							maxLength={80}
							style={[inputStyle, styles.titleInput]}
							placeholder="给帖子起个标题"
							placeholderTextColor={pTheme.colors.onSurfaceVariant}
							underlineColor="transparent"
							activeUnderlineColor={pTheme.colors.primary}
						/>

						{/* 正文内容 - 大面积输入区 */}
						<TextInput
							mode="flat"
							value={content}
							onChangeText={setContent}
							multiline
							numberOfLines={6}
							style={[inputStyle, styles.contentInput, { minHeight: contentHeight }]}
							placeholder="分享你的美食体验，推荐100字以上获得更多曝光..."
							placeholderTextColor={pTheme.colors.onSurfaceVariant}
							underlineColor="transparent"
							activeUnderlineColor={pTheme.colors.primary}
							textAlignVertical="top"
						/>
						<Text style={[styles.charCount, { color: pTheme.colors.onSurfaceVariant }]}>
							{content_count} 字
						</Text>

						{/* 位置 - 简化 */}
						<TextInput
							mode="flat"
							value={canteen}
							onChangeText={setCanteen}
							style={[inputStyle, styles.fieldInput]}
							placeholder="添加位置（如：邯郸南区食堂）"
							placeholderTextColor={pTheme.colors.onSurfaceVariant}
							underlineColor="transparent"
							activeUnderlineColor={pTheme.colors.primary}
							left={<TextInput.Icon icon="map-marker-outline" color={pTheme.colors.onSurfaceVariant} />}
						/>

						{/* 标签输入 */}
						<TextInput
							mode="flat"
							value={tagsInput}
							onChangeText={setTagsInput}
							style={[inputStyle, styles.fieldInput]}
							placeholder="# 添加标签，逗号分隔"
							placeholderTextColor={pTheme.colors.onSurfaceVariant}
							underlineColor="transparent"
							activeUnderlineColor={pTheme.colors.primary}
						/>
						{parsedTags.length > 0 && (
							<View style={styles.chipRow}>
								{parsedTags.map((tag, idx) => (
									<Chip 
										key={idx} 
										compact 
										mode="outlined" 
										style={styles.tagChip}
										textStyle={{ fontSize: 12 }}
									>
										{tag}
									</Chip>
								))}
							</View>
						)}

						{/* 图片链接区 - 底部网格预览 */}
						<View style={styles.imageSection}>
							<Text style={[styles.imageSectionTitle, { color: pTheme.colors.onSurfaceVariant }]}>
								图片 ({filtered_images.length}/9)
							</Text>
							{images.map((url, idx) => (
								<View key={`image-${idx}`} style={styles.imageRow}>
									<TextInput
										style={[{ flex: 1 }, inputStyle, styles.imageInput]}
										mode="flat"
										dense
										value={url}
										onChangeText={(value) => handleChangeImage(idx, value)}
										placeholder="粘贴图片链接"
										placeholderTextColor={pTheme.colors.onSurfaceVariant}
										underlineColor="transparent"
									/>
									{images.length > 1 && (
										<IconButton 
											icon="close" 
											size={18}
											onPress={() => handleRemoveImageField(idx)} 
											iconColor={pTheme.colors.onSurfaceVariant}
										/>
									)}
								</View>
							))}
							{images.length < 9 && (
								<Pressable 
									style={[styles.addImageBtn, { borderColor: pTheme.colors.outline }]} 
									onPress={handleAddImageField}
								>
									<Ionicons name="add" size={20} color={pTheme.colors.onSurfaceVariant} />
									<Text style={{ color: pTheme.colors.onSurfaceVariant, fontSize: 13 }}>添加图片</Text>
								</Pressable>
							)}
						</View>

						{/* 分享详情 - 折叠/可选 */}
						{post_type === 'share' && (
							<View style={styles.extraSection}>
								<View style={styles.extraRow}>
									<TextInput 
										mode="flat" 
										value={cuisine} 
										onChangeText={setCuisine}
										style={[inputStyle, styles.halfInput]}
										placeholder="菜系（可选）"
										placeholderTextColor={pTheme.colors.onSurfaceVariant}
										underlineColor="transparent"
									/>
									<TextInput
										mode="flat"
										value={price}
										onChangeText={setPrice}
										keyboardType="decimal-pad"
										style={[inputStyle, styles.halfInput]}
										placeholder="价格 ¥（可选）"
										placeholderTextColor={pTheme.colors.onSurfaceVariant}
										underlineColor="transparent"
									/>
								</View>
							</View>
						)}

						{/* 求推荐偏好 */}
						{post_type === 'seeking' && (
							<View style={styles.extraSection}>
								<View style={styles.extraRow}>
									<TextInput
										style={[{ flex: 1 }, inputStyle, styles.halfInput]}
										mode="flat"
										value={budgetMin}
										onChangeText={setBudgetMin}
										keyboardType="numeric"
										placeholder="预算下限 ¥"
										placeholderTextColor={pTheme.colors.onSurfaceVariant}
										underlineColor="transparent"
									/>
									<Text style={{ color: pTheme.colors.onSurfaceVariant }}>—</Text>
									<TextInput
										style={[{ flex: 1 }, inputStyle, styles.halfInput]}
										mode="flat"
										value={budgetMax}
										onChangeText={setBudgetMax}
										keyboardType="numeric"
										placeholder="预算上限 ¥"
										placeholderTextColor={pTheme.colors.onSurfaceVariant}
										underlineColor="transparent"
									/>
								</View>
							</View>
						)}

						{/* 发布按钮 */}
						<Button 
							mode="contained" 
							loading={loading} 
							onPress={onSubmit}
							style={styles.submitBtn}
							contentStyle={styles.submitBtnContent}
							labelStyle={styles.submitBtnLabel}
						>
							{editMode ? '保存修改' : '发布'}
						</Button>
					</View>
				</ScrollView>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	messageCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingHorizontal: 14,
		paddingVertical: 14,
		borderRadius: 12,
		marginBottom: 20,
	},
	typeSection: {
		marginBottom: 24,
		gap: 14,
	},
	subTypeRow: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 6,
	},
	subTypeChip: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#E5E5E5',
	},
	subTypeText: {
		fontSize: 14,
		fontWeight: '500',
	},
	titleInput: {
		marginBottom: 14,
		fontSize: 16,
		fontWeight: '600',
		borderRadius: 12,
	},
	contentInput: {
		marginBottom: 6,
		fontSize: 15,
		borderRadius: 12,
		paddingTop: 12,
	},
	charCount: {
		alignSelf: 'flex-end',
		fontSize: 12,
		marginBottom: 18,
	},
	fieldInput: {
		marginBottom: 14,
		borderRadius: 12,
	},
	chipRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 18,
		marginTop: -4,
	},
	tagChip: {
		height: 28,
		borderRadius: 14,
	},
	imageSection: {
		marginTop: 10,
		marginBottom: 18,
		gap: 12,
	},
	imageSectionTitle: {
		fontSize: 14,
		fontWeight: '500',
		marginBottom: 6,
	},
	imageRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	imageInput: {
		fontSize: 13,
		borderRadius: 10,
	},
	addImageBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 12,
		borderWidth: 1,
		borderStyle: 'dashed',
		borderRadius: 12,
	},
	extraSection: {
		marginBottom: 18,
	},
	extraRow: {
		flexDirection: 'row',
		gap: 14,
		alignItems: 'center',
	},
	halfInput: {
		flex: 1,
		borderRadius: 12,
	},
	submitBtn: {
		marginTop: 20,
		borderRadius: 28,
		elevation: 2,
	},
	submitBtnContent: {
		paddingVertical: 10,
	},
	submitBtnLabel: {
		fontSize: 17,
		fontWeight: '600',
		letterSpacing: 0.5,
	},
});

