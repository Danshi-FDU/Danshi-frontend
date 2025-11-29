import React, { useMemo, useState, useCallback } from 'react';
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	View,
	StyleSheet,
	Pressable,
	Image,
	TextInput as RNTextInput,
	DimensionValue,
} from 'react-native';
import {
	Button,
	Chip,
	IconButton,
	Text,
	useTheme as usePaperTheme,
	ActivityIndicator,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { postsService } from '@/src/services/posts_service';
import { CANTEEN_OPTIONS } from '@/src/constants/selects';
import CenterPicker from '@/src/components/overlays/center_picker';
import ImageUploadGrid from '@/src/components/image_upload_grid';
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
	const router = useRouter();
	const maxWidth = pickByBreakpoint<DimensionValue>(bp, { base: '100%', sm: 540, md: 580, lg: 620, xl: 660 });
	const horizontalPadding = pickByBreakpoint(bp, { base: 24, sm: 28, md: 32, lg: 36, xl: 40 });
	const insets = useSafeAreaInsets();
	const theme = usePaperTheme();

	// 预览模式状态
	const [isPreviewMode, setIsPreviewMode] = useState(false);

	// 表单状态
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
	const [images, setImages] = useState<string[]>([]);
	const [budgetMin, setBudgetMin] = useState('');
	const [budgetMax, setBudgetMax] = useState('');
	const [preferFlavors, setPreferFlavors] = useState('');
	const [avoid_flavors, setAvoidFlavors] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [canteenPickerOpen, setCanteenPickerOpen] = useState(false);
	const [showTagInput, setShowTagInput] = useState(false);

	// 编辑模式：从 initialData 初始化表单
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
			setImages(initialData.images?.length ? initialData.images : []);
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

	// 解析列表
	const parseList = (value: string) =>
		value
			.split(/[\n,，]/)
			.map((item) => item.trim())
			.filter(Boolean);

	const parsedTags = useMemo(() => {
		const list = parseList(tagsInput);
		return Array.from(new Set(list)).slice(0, 10);
	}, [tagsInput]);
	const parsedFlavors = useMemo(() => parseList(flavorsInput), [flavorsInput]);
	const parsed_prefer_flavors = useMemo(() => parseList(preferFlavors), [preferFlavors]);
	const parsed_avoid_flavors = useMemo(() => parseList(avoid_flavors), [avoid_flavors]);
	const filtered_images = useMemo(
		() => images.filter((url) => url && /^https?:\/\//i.test(url.trim())),
		[images]
	);

	const handleBack = useCallback(() => {
		if (router.canGoBack()) {
			router.back();
		}
	}, [router]);

	const togglePreviewMode = useCallback(() => {
		setIsPreviewMode((prev) => !prev);
	}, []);

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
		setImages([]);
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
			if (!filtered_images.length) return '请至少上传 1 张图片';
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
									max:
										typeof maxBudget !== 'undefined'
											? maxBudget
											: typeof minBudget !== 'undefined'
												? minBudget
												: 0,
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
				await postsService.update(editPostId, payload);
				setSuccess('更新成功，等待审核');
				onUpdateSuccess?.();
			} else {
				const result = await postsService.create(payload);
				setSuccess(
					`发布成功，当前状态：${result.status === 'pending' ? '待审核' : result.status}`
				);
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
			<View style={[styles.container, { backgroundColor: theme.colors.background }]}>
				<View style={styles.loadingWrapper}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
					<Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
						正在加载...
					</Text>
				</View>
			</View>
		);
	}

	// ==================== 预览模式渲染 ====================
	const renderPreviewMode = () => (
		<ScrollView
			style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
			contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
			showsVerticalScrollIndicator={false}
		>
			<View style={[styles.contentWrapper, { maxWidth }]}>
				{/* 预览：图片画廊 */}
				{filtered_images.length > 0 && (
					<View style={styles.previewImageGrid}>
						{filtered_images.slice(0, 9).map((url, idx) => (
							<View key={idx} style={styles.previewImageItem}>
								<Image
									source={{ uri: url }}
									style={styles.previewImage}
									resizeMode="cover"
								/>
							</View>
						))}
					</View>
				)}

				{/* 预览：标题 */}
				<Text
					variant="headlineSmall"
					style={[
						styles.previewTitle,
						{ color: title ? theme.colors.onSurface : theme.colors.outline },
					]}
				>
					{title || '标题预览'}
				</Text>

				{/* 预览：元信息标签 */}
				<View style={styles.previewMetaRow}>
					{post_type === 'share' && (
						<View
							style={[
								styles.previewBadge,
								{
									backgroundColor:
										share_type === 'recommend'
											? theme.colors.tertiaryContainer
											: theme.colors.errorContainer,
								},
							]}
						>
							<Text
								style={{
									color:
										share_type === 'recommend'
											? theme.colors.tertiary
											: theme.colors.error,
									fontSize: 12,
									fontWeight: '600',
								}}
							>
								{share_type === 'recommend' ? '👍 推荐' : '⚠️ 避雷'}
							</Text>
						</View>
					)}
					{canteen && (
						<View style={styles.previewLocationBadge}>
							<Ionicons
								name="location"
								size={12}
								color={theme.colors.onSurfaceVariant}
							/>
							<Text
								style={{
									color: theme.colors.onSurfaceVariant,
									fontSize: 12,
									marginLeft: 2,
								}}
							>
								{canteen}
							</Text>
						</View>
					)}
				</View>

				{/* 预览：正文 */}
				<Text
					style={[
						styles.previewContent,
						{ color: content ? theme.colors.onSurface : theme.colors.outline },
					]}
				>
					{content || '正文内容预览...'}
				</Text>

				{/* 预览：话题标签 */}
				{parsedTags.length > 0 && (
					<View style={styles.previewTagsRow}>
						{parsedTags.map((tag, idx) => (
							<Text
								key={idx}
								style={[styles.previewTag, { color: theme.colors.primary }]}
							>
								#{tag}
							</Text>
						))}
					</View>
				)}
			</View>
		</ScrollView>
	);

	// ==================== 编辑模式渲染 ====================
	const renderEditMode = () => (
		<ScrollView
			style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
			contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			<View style={[styles.contentWrapper, { maxWidth }]}>
				{/* 错误/成功提示 */}
				{!!error && (
					<View
						style={[styles.messageCard, { backgroundColor: theme.colors.errorContainer }]}
					>
						<Ionicons name="alert-circle" size={18} color={theme.colors.error} />
						<Text style={{ color: theme.colors.error, flex: 1, fontSize: 14 }}>
							{error}
						</Text>
						<IconButton
							icon="close"
							size={16}
							iconColor={theme.colors.error}
							onPress={() => setError('')}
							style={styles.messageDismiss}
						/>
					</View>
				)}
				{!!success && (
					<View
						style={[
							styles.messageCard,
							{ backgroundColor: theme.colors.tertiaryContainer },
						]}
					>
						<Ionicons name="checkmark-circle" size={18} color={theme.colors.tertiary} />
						<Text style={{ color: theme.colors.tertiary, flex: 1, fontSize: 14 }}>
							{success}
						</Text>
						<IconButton
							icon="close"
							size={16}
							iconColor={theme.colors.tertiary}
							onPress={() => setSuccess('')}
							style={styles.messageDismiss}
						/>
					</View>
				)}

				{/* ==================== 沉浸式输入区 ==================== */}

				{/* 标题输入 - 大字体无边框 */}
				<RNTextInput
					value={title}
					onChangeText={setTitle}
					placeholder="填写标题"
					placeholderTextColor={theme.colors.outline}
					maxLength={80}
					style={[
						styles.titleInput,
						{
							color: theme.colors.onSurface,
						},
					]}
				/>

				{/* 正文输入 - 无背景无边框 */}
				<RNTextInput
					value={content}
					onChangeText={setContent}
					placeholder="分享你的美食体验，让更多人发现美味..."
					placeholderTextColor={theme.colors.outline}
					multiline
					textAlignVertical="top"
					style={[styles.contentInput, { color: theme.colors.onSurface }]}
				/>
				<Text style={[styles.charCount, { color: theme.colors.outline }]}>
					{content_count} 字
				</Text>

				{/* ==================== 工具栏 (地点 + 话题) ==================== */}
				<View style={styles.toolbarRow}>
					{/* 地点按钮 */}
					<Pressable
						style={[
							styles.toolbarBtn,
							canteen && {
								backgroundColor: theme.colors.primaryContainer,
								borderColor: theme.colors.primary,
							},
							!canteen && { borderColor: theme.colors.outlineVariant },
						]}
						onPress={() => setCanteenPickerOpen(true)}
					>
						<Ionicons
							name="location-outline"
							size={16}
							color={canteen ? theme.colors.primary : theme.colors.onSurfaceVariant}
						/>
						<Text
							style={[
								styles.toolbarBtnText,
								{
									color: canteen
										? theme.colors.primary
										: theme.colors.onSurfaceVariant,
								},
							]}
							numberOfLines={1}
						>
							{canteen || '添加地点'}
						</Text>
						{canteen && (
							<Pressable
								onPress={(e) => {
									e.stopPropagation();
									setCanteen('');
								}}
								hitSlop={8}
							>
								<Ionicons
									name="close-circle"
									size={14}
									color={theme.colors.primary}
								/>
							</Pressable>
						)}
					</Pressable>

					{/* 话题按钮 */}
					<Pressable
						style={[
							styles.toolbarBtn,
							parsedTags.length > 0 && {
								backgroundColor: theme.colors.primaryContainer,
								borderColor: theme.colors.primary,
							},
							parsedTags.length === 0 && { borderColor: theme.colors.outlineVariant },
						]}
						onPress={() => setShowTagInput(true)}
					>
						<Ionicons
							name="pricetag-outline"
							size={16}
							color={
								parsedTags.length > 0
									? theme.colors.primary
									: theme.colors.onSurfaceVariant
							}
						/>
						<Text
							style={[
								styles.toolbarBtnText,
								{
									color:
										parsedTags.length > 0
											? theme.colors.primary
											: theme.colors.onSurfaceVariant,
								},
							]}
						>
							{parsedTags.length > 0 ? `${parsedTags.length} 个话题` : '添加话题'}
						</Text>
					</Pressable>
				</View>

				{/* 话题输入区 */}
				{showTagInput && (
					<View
						style={[
							styles.tagInputSection,
							{ backgroundColor: theme.colors.surfaceVariant },
						]}
					>
						<RNTextInput
							value={tagsInput}
							onChangeText={setTagsInput}
							placeholder="输入话题，用逗号分隔"
							placeholderTextColor={theme.colors.outline}
							style={[styles.tagTextInput, { color: theme.colors.onSurface }]}
							autoFocus
						/>
						<Pressable
							style={[
								styles.tagInputDone,
								{ backgroundColor: theme.colors.primary },
							]}
							onPress={() => setShowTagInput(false)}
						>
							<Text style={{ color: theme.colors.onPrimary, fontSize: 13 }}>完成</Text>
						</Pressable>
					</View>
				)}

				{/* 已添加的话题展示 */}
				{parsedTags.length > 0 && (
					<View style={styles.tagsDisplay}>
						{parsedTags.map((tag, idx) => (
							<Chip
								key={idx}
								compact
								mode="flat"
								closeIcon="close"
								onClose={() => {
									const newTags = parsedTags.filter((_, i) => i !== idx);
									setTagsInput(newTags.join(', '));
								}}
								style={[
									styles.tagChip,
									{ backgroundColor: theme.colors.surfaceVariant },
								]}
								textStyle={{ color: theme.colors.primary, fontSize: 13 }}
							>
								#{tag}
							</Chip>
						))}
					</View>
				)}

				{/* ==================== 图片上传区 ==================== */}
				<ImageUploadGrid
					images={images}
					onImagesChange={setImages}
					maxImages={9}
				/>

				{/* ==================== 分享类型扩展信息 ==================== */}
				{post_type === 'share' && (
					<View style={styles.extraSection}>
						<Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
							更多信息（可选）
						</Text>
						<View style={styles.extraGrid}>
							<View style={styles.extraItem}>
								<Text style={[styles.extraLabel, { color: theme.colors.outline }]}>
									菜系
								</Text>
								<RNTextInput
									value={cuisine}
									onChangeText={setCuisine}
									placeholder="如：川菜、粤菜"
									placeholderTextColor={theme.colors.outline}
									style={[
										styles.extraInput,
										{
											color: theme.colors.onSurface,
											borderBottomColor: theme.colors.outlineVariant,
										},
									]}
								/>
							</View>
							<View style={styles.extraItem}>
								<Text style={[styles.extraLabel, { color: theme.colors.outline }]}>
									人均价格
								</Text>
								<View style={styles.priceInputRow}>
									<Text style={{ color: theme.colors.outline }}>¥</Text>
									<RNTextInput
										value={price}
										onChangeText={setPrice}
										placeholder="0"
										placeholderTextColor={theme.colors.outline}
										keyboardType="decimal-pad"
										style={[
											styles.extraInput,
											styles.priceInput,
											{
												color: theme.colors.onSurface,
												borderBottomColor: theme.colors.outlineVariant,
											},
										]}
									/>
								</View>
							</View>
						</View>

						{/* 口味标签 */}
						<View style={styles.flavorSection}>
							<Text style={[styles.extraLabel, { color: theme.colors.outline }]}>
								口味标签
							</Text>
							<RNTextInput
								value={flavorsInput}
								onChangeText={setFlavorsInput}
								placeholder="如：麻辣、酸甜、清淡（逗号分隔）"
								placeholderTextColor={theme.colors.outline}
								style={[
									styles.extraInput,
									{
										color: theme.colors.onSurface,
										borderBottomColor: theme.colors.outlineVariant,
									},
								]}
							/>
						</View>
						{parsedFlavors.length > 0 && (
							<View style={styles.flavorsDisplay}>
								{parsedFlavors.map((flavor, idx) => (
									<View
										key={idx}
										style={[
											styles.flavorBadge,
											{ backgroundColor: theme.colors.primaryContainer },
										]}
									>
										<Text style={{ color: theme.colors.primary, fontSize: 12 }}>
											{flavor}
										</Text>
									</View>
								))}
							</View>
						)}
					</View>
				)}

				{/* ==================== 求推荐扩展信息 ==================== */}
				{post_type === 'seeking' && (
					<View style={styles.extraSection}>
						<Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
							更多信息（可选）
						</Text>

						{/* 预算范围 */}
						<Text
							style={[
								styles.extraLabel,
								{ color: theme.colors.outline, marginBottom: 8 },
							]}
						>
							预算范围
						</Text>
						<View style={styles.budgetRow}>
							<View style={styles.budgetInputWrap}>
								<Text style={{ color: theme.colors.outline }}>¥</Text>
								<RNTextInput
									value={budgetMin}
									onChangeText={setBudgetMin}
									placeholder="最低"
									placeholderTextColor={theme.colors.outline}
									keyboardType="numeric"
									style={[
										styles.budgetInput,
										{
											color: theme.colors.onSurface,
											borderBottomColor: theme.colors.outlineVariant,
										},
									]}
								/>
							</View>
							<Text style={{ color: theme.colors.outline }}>—</Text>
							<View style={styles.budgetInputWrap}>
								<Text style={{ color: theme.colors.outline }}>¥</Text>
								<RNTextInput
									value={budgetMax}
									onChangeText={setBudgetMax}
									placeholder="最高"
									placeholderTextColor={theme.colors.outline}
									keyboardType="numeric"
									style={[
										styles.budgetInput,
										{
											color: theme.colors.onSurface,
											borderBottomColor: theme.colors.outlineVariant,
										},
									]}
								/>
							</View>
						</View>

						{/* 口味偏好 */}
						<View style={[styles.flavorSection, { marginTop: 20 }]}>
							<Text style={[styles.extraLabel, { color: theme.colors.tertiary }]}>
								❤️ 喜欢的口味
							</Text>
							<RNTextInput
								value={preferFlavors}
								onChangeText={setPreferFlavors}
								placeholder="如：麻辣、酸甜（逗号分隔）"
								placeholderTextColor={theme.colors.outline}
								style={[
									styles.extraInput,
									{
										color: theme.colors.onSurface,
										borderBottomColor: theme.colors.outlineVariant,
									},
								]}
							/>
						</View>
						{parsed_prefer_flavors.length > 0 && (
							<View style={styles.flavorsDisplay}>
								{parsed_prefer_flavors.map((flavor, idx) => (
									<View
										key={idx}
										style={[
											styles.flavorBadge,
											{ backgroundColor: theme.colors.tertiaryContainer },
										]}
									>
										<Text style={{ color: theme.colors.tertiary, fontSize: 12 }}>
											{flavor}
										</Text>
									</View>
								))}
							</View>
						)}

						<View style={[styles.flavorSection, { marginTop: 16 }]}>
							<Text style={[styles.extraLabel, { color: theme.colors.error }]}>
								🚫 不喜欢的口味
							</Text>
							<RNTextInput
								value={avoid_flavors}
								onChangeText={setAvoidFlavors}
								placeholder="如：油炸、过甜（逗号分隔）"
								placeholderTextColor={theme.colors.outline}
								style={[
									styles.extraInput,
									{
										color: theme.colors.onSurface,
										borderBottomColor: theme.colors.outlineVariant,
									},
								]}
							/>
						</View>
						{parsed_avoid_flavors.length > 0 && (
							<View style={styles.flavorsDisplay}>
								{parsed_avoid_flavors.map((flavor, idx) => (
									<View
										key={idx}
										style={[
											styles.flavorBadge,
											{ backgroundColor: theme.colors.errorContainer },
										]}
									>
										<Text style={{ color: theme.colors.error, fontSize: 12 }}>
											{flavor}
										</Text>
									</View>
								))}
							</View>
						)}
					</View>
				)}

				{/* 底部占位 - 为Tab栏留空间 */}
				<View style={{ height: 80 }} />
			</View>
		</ScrollView>
	);

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.select({ ios: 'padding', android: undefined })}
		>
			<View style={[styles.container, { backgroundColor: theme.colors.background }]}>
				{/* ==================== 顶部导航栏 ==================== */}
				<View
					style={[
						styles.topBar,
						{
							paddingTop: insets.top,
							backgroundColor: theme.colors.background,
						},
					]}
				>
					<View style={styles.topBarContent}>
						{/* 左侧：预览/编辑 */}
						<Pressable style={styles.topBarLeft} onPress={togglePreviewMode}>
							<Text
								style={[
									styles.previewBtnText,
									{
										color: isPreviewMode
											? theme.colors.primary
											: theme.colors.onSurfaceVariant,
									},
								]}
							>
								{isPreviewMode ? '编辑' : '预览'}
							</Text>
						</Pressable>

						{/* 中间：分段控制器 */}
						<View
							style={[
								styles.segmentedControl,
								{ backgroundColor: theme.colors.surfaceVariant },
							]}
						>
							<Pressable
								style={[
									styles.segmentBtn,
									post_type === 'share' && {
										backgroundColor: theme.colors.surface,
									},
								]}
								onPress={() => setPostType('share')}
							>
								<Text
									style={[
										styles.segmentText,
										{
											color:
												post_type === 'share'
													? theme.colors.primary
													: theme.colors.onSurfaceVariant,
											fontWeight: post_type === 'share' ? '600' : '400',
										},
									]}
								>
									分享美食
								</Text>
							</Pressable>
							<Pressable
								style={[
									styles.segmentBtn,
									post_type === 'seeking' && {
										backgroundColor: theme.colors.surface,
									},
								]}
								onPress={() => setPostType('seeking')}
							>
								<Text
									style={[
										styles.segmentText,
										{
											color:
												post_type === 'seeking'
													? theme.colors.primary
													: theme.colors.onSurfaceVariant,
											fontWeight: post_type === 'seeking' ? '600' : '400',
										},
									]}
								>
									求推荐
								</Text>
							</Pressable>
						</View>

						{/* 右侧：发布 */}
						<Pressable
							style={[
								styles.publishBtn,
								loading && styles.publishBtnDisabled,
							]}
							onPress={onSubmit}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator size={14} color="#fff" />
							) : (
								<Text style={styles.publishBtnText}>
									{editMode ? '保存' : '发布'}
								</Text>
							)}
						</Pressable>
					</View>

					{/* 分享类型：推荐 / 避雷 */}
					{post_type === 'share' && !isPreviewMode && (
						<View style={styles.subTypeRow}>
							<Pressable
								style={[
									styles.subTypeBtn,
									share_type === 'recommend' && {
										backgroundColor: theme.colors.tertiaryContainer,
										borderColor: theme.colors.tertiary,
									},
									share_type !== 'recommend' && {
										borderColor: theme.colors.outlineVariant,
									},
								]}
								onPress={() => setShareType('recommend')}
							>
								<Text
									style={{
										color:
											share_type === 'recommend'
												? theme.colors.tertiary
												: theme.colors.onSurfaceVariant,
										fontSize: 13,
										fontWeight: share_type === 'recommend' ? '600' : '400',
									}}
								>
									👍 推荐
								</Text>
							</Pressable>
							<Pressable
								style={[
									styles.subTypeBtn,
									share_type === 'warning' && {
										backgroundColor: theme.colors.errorContainer,
										borderColor: theme.colors.error,
									},
									share_type !== 'warning' && {
										borderColor: theme.colors.outlineVariant,
									},
								]}
								onPress={() => setShareType('warning')}
							>
								<Text
									style={{
										color:
											share_type === 'warning'
												? theme.colors.error
												: theme.colors.onSurfaceVariant,
										fontSize: 13,
										fontWeight: share_type === 'warning' ? '600' : '400',
									}}
								>
									⚠️ 避雷
								</Text>
							</Pressable>
						</View>
					)}
				</View>

				{/* ==================== 内容区域 ==================== */}
				{isPreviewMode ? renderPreviewMode() : renderEditMode()}
			</View>

			{/* 位置选择器 */}
			<CenterPicker
				visible={canteenPickerOpen}
				onClose={() => setCanteenPickerOpen(false)}
				title="选择位置"
				options={CANTEEN_OPTIONS}
				selectedValue={canteen}
				onSelect={(value) => setCanteen(value)}
			/>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loadingWrapper: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},

	// ==================== Top Bar ====================
	topBar: {
		paddingHorizontal: 16,
		paddingBottom: 8,
	},
	topBarContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		height: 48,
	},
	topBarLeft: {
		minWidth: 52,
		paddingHorizontal: 8,
		paddingVertical: 8,
	},
	segmentedControl: {
		flexDirection: 'row',
		borderRadius: 20,
		padding: 3,
		position: 'absolute',
		left: '50%',
		transform: [{ translateX: '-50%' }],
	},
	segmentBtn: {
		paddingHorizontal: 16,
		paddingVertical: 6,
		borderRadius: 17,
	},
	segmentText: {
		fontSize: 14,
	},
	previewBtnText: {
		fontSize: 14,
		fontWeight: '500',
	},
	publishBtn: {
		backgroundColor: '#F97316',
		paddingHorizontal: 14,
		paddingVertical: 7,
		borderRadius: 16,
		minWidth: 52,
		alignItems: 'center',
		justifyContent: 'center',
	},
	publishBtnDisabled: {
		opacity: 0.6,
	},
	publishBtnText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
	},
	subTypeRow: {
		flexDirection: 'row',
		gap: 10,
		paddingTop: 8,
		paddingLeft: 40,
	},
	subTypeBtn: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 16,
		borderWidth: 1,
	},

	// ==================== Scroll Content ====================
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingTop: 16,
		paddingBottom: 40,
		alignItems: 'center',
	},
	contentWrapper: {
		width: '100%',
	},

	// ==================== Message Card ====================
	messageCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 12,
		marginBottom: 16,
	},
	messageDismiss: {
		margin: 0,
	},

	// ==================== 沉浸式输入区 ====================
	titleInput: {
		fontSize: 24,
		fontWeight: '700',
		paddingVertical: 8,
		paddingHorizontal: 0,
		backgroundColor: 'transparent',
		marginBottom: 16,
	},
	contentInput: {
		fontSize: 16,
		lineHeight: 26,
		minHeight: 120,
		paddingVertical: 0,
		paddingHorizontal: 0,
		backgroundColor: 'transparent',
	},
	charCount: {
		alignSelf: 'flex-end',
		fontSize: 12,
		marginTop: 8,
		marginBottom: 16,
	},

	// ==================== Toolbar ====================
	toolbarRow: {
		flexDirection: 'row',
		gap: 10,
		marginBottom: 12,
	},
	toolbarBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1,
	},
	toolbarBtnText: {
		fontSize: 13,
		maxWidth: 100,
	},

	// ==================== Tag Input ====================
	tagInputSection: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 12,
		borderRadius: 12,
		marginBottom: 12,
	},
	tagTextInput: {
		flex: 1,
		fontSize: 14,
		paddingVertical: 0,
		backgroundColor: 'transparent',
	},
	tagInputDone: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 14,
	},
	tagsDisplay: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 16,
	},
	tagChip: {
		borderRadius: 16,
	},

	// ==================== Extra Section ====================
	extraSection: {
		marginTop: 24,
		paddingTop: 20,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: '500',
		marginBottom: 16,
	},
	extraGrid: {
		flexDirection: 'row',
		gap: 20,
	},
	extraItem: {
		flex: 1,
	},
	extraLabel: {
		fontSize: 12,
		marginBottom: 4,
	},
	extraInput: {
		fontSize: 15,
		paddingVertical: 8,
		paddingHorizontal: 0,
		backgroundColor: 'transparent',
		borderBottomWidth: 1,
	},
	priceInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	priceInput: {
		flex: 1,
	},
	flavorSection: {
		marginTop: 16,
	},
	flavorsDisplay: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 8,
	},
	flavorBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
	},

	// ==================== Budget ====================
	budgetRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	budgetInputWrap: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	budgetInput: {
		flex: 1,
		fontSize: 15,
		paddingVertical: 8,
		paddingHorizontal: 0,
		backgroundColor: 'transparent',
		borderBottomWidth: 1,
	},


	// ==================== Preview Mode ====================
	previewImageGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 20,
	},
	previewImageItem: {
		width: '31%',
		aspectRatio: 1,
		borderRadius: 12,
		overflow: 'hidden',
	},
	previewImage: {
		width: '100%',
		height: '100%',
	},
	previewTitle: {
		fontWeight: '700',
		marginBottom: 12,
	},
	previewMetaRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 16,
	},
	previewBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
	},
	previewLocationBadge: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	previewContent: {
		fontSize: 16,
		lineHeight: 26,
		marginBottom: 16,
	},
	previewTagsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	previewTag: {
		fontSize: 14,
		fontWeight: '500',
	},
});
