import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  Image,
  useWindowDimensions,
  TextInput as RNTextInput,
  Keyboard,
} from 'react-native';
import { Text, IconButton, useTheme as usePaperTheme, ActivityIndicator } from 'react-native-paper';
import Ionicons from '@expo/vector-icons/Ionicons';
import { uploadService, type UploadSource } from '@/src/services/upload_service';
import * as ImagePicker from 'expo-image-picker';

interface ImageUploadGridProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

/**
 * 现代化图片上传网格组件
 * - 3 列网格布局
 * - 虚线边框添加按钮
 * - 圆角图片预览
 * - 右上角删除按钮
 */
export default function ImageUploadGrid({
  images,
  onImagesChange,
  maxImages = 9,
}: ImageUploadGridProps) {
  const theme = usePaperTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isWeb = Platform.OS === 'web';

  // 检查图片 URL 是否有效
  const isValidImageUrl = useCallback((url: string) => {
    return /^https?:\/\//i.test(url.trim());
  }, []);

  // 获取有效的图片列表
  const validImages = images.filter((url) => url && isValidImageUrl(url));

  // 计算网格项尺寸 (3 列，间距 10px)
  const containerPadding = 0;
  const gap = 10;
  const columns = 3;
  const availableWidth = Math.min(screenWidth - 48, 600) - containerPadding * 2;
  const itemSize = (availableWidth - gap * (columns - 1)) / columns;

  // 删除图片
  const handleRemoveImage = useCallback(
    (index: number) => {
      const validList = images.filter((url) => url && isValidImageUrl(url));
      const newList = validList.filter((_, idx) => idx !== index);
      onImagesChange(newList.length > 0 ? newList : []);
    },
    [images, onImagesChange, isValidImageUrl]
  );

  // 添加已上传的图片 URL
  const addUploadedImages = useCallback(
    (urls: string[]) => {
      const existingValid = images.filter((url) => url && isValidImageUrl(url));
      const newImages = [...existingValid, ...urls].slice(0, maxImages);
      onImagesChange(newImages);
    },
    [images, maxImages, onImagesChange, isValidImageUrl]
  );

  // Web 端：输入链接模式
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState('');
  const linkInputRef = useRef<RNTextInput>(null);

  const handleAddLink = useCallback(() => {
    if (linkInputValue && isValidImageUrl(linkInputValue)) {
      addUploadedImages([linkInputValue.trim()]);
      setLinkInputValue('');
      setShowLinkInput(false);
      Keyboard.dismiss();
    }
  }, [linkInputValue, isValidImageUrl, addUploadedImages]);

  const handleCancelLink = useCallback(() => {
    setLinkInputValue('');
    setShowLinkInput(false);
    Keyboard.dismiss();
  }, []);

  // 原生端：从图库选择图片
  const pickImageFromLibrary = useCallback(async () => {
    const availableSlots = maxImages - validImages.length;
    if (availableSlots <= 0) {
      setUploadError(`最多只能上传 ${maxImages} 张图片`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setUploadError('需要相册权限才能选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: availableSlots,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploadError(null);
      setUploadingCount(result.assets.length);

      const sources: UploadSource[] = result.assets.map((asset) => ({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `image_${Date.now()}.jpg`,
      }));

      const uploadResults = await uploadService.uploadImages(sources);
      const urls = uploadResults.map((r) => r.url);
      addUploadedImages(urls);
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传失败，请稍后重试';
      setUploadError(message);
    } finally {
      setUploadingCount(0);
    }
  }, [maxImages, validImages.length, addUploadedImages]);

  // Web 端处理
  const handleWebAdd = useCallback(() => {
    setShowLinkInput(true);
  }, []);

  const canAddMore = validImages.length < maxImages && uploadingCount === 0;

  return (
    <View style={styles.container}>
      {/* 错误提示 */}
      {uploadError && (
        <View style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}>
          <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{uploadError}</Text>
          <IconButton
            icon="close"
            size={14}
            iconColor={theme.colors.error}
            onPress={() => setUploadError(null)}
            style={styles.errorDismiss}
          />
        </View>
      )}

      {/* 图片网格 */}
      <View style={styles.grid}>
        {/* 已上传的图片 */}
        {validImages.map((url, idx) => (
          <View
            key={`img-${idx}-${url.slice(-10)}`}
            style={[
              styles.gridItem,
              {
                width: itemSize,
                height: itemSize,
              },
            ]}
          >
            <Image
              source={{ uri: url }}
              style={[styles.imagePreview, { borderRadius: 12 }]}
              resizeMode="cover"
            />
            {/* 删除按钮 */}
            <Pressable
              style={[styles.removeBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
              onPress={() => handleRemoveImage(idx)}
            >
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}

        {/* 上传中指示器 */}
        {uploadingCount > 0 && (
          <View
            style={[
              styles.gridItem,
              styles.uploadingItem,
              {
                width: itemSize,
                height: itemSize,
                backgroundColor: theme.colors.primaryContainer,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.uploadingText, { color: theme.colors.primary }]}>
              {uploadingCount} 张上传中
            </Text>
          </View>
        )}

        {/* Web 端链接输入框 */}
        {isWeb && showLinkInput && (
          <View
            style={[
              styles.gridItem,
              styles.linkInputItem,
              {
                width: itemSize,
                height: itemSize,
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <RNTextInput
              ref={linkInputRef}
              value={linkInputValue}
              onChangeText={setLinkInputValue}
              placeholder="粘贴图片链接"
              placeholderTextColor={theme.colors.outline}
              autoFocus
              style={[styles.linkTextInput, { color: theme.colors.onSurface }]}
              onSubmitEditing={handleAddLink}
            />
            <View style={styles.linkInputRow}>
              <Pressable
                style={[styles.linkConfirmBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleAddLink}
              >
                <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
              </Pressable>
              <Pressable
                style={[styles.linkCancelBtn, { borderColor: theme.colors.outline }]}
                onPress={handleCancelLink}
              >
                <Ionicons name="close" size={16} color={theme.colors.outline} />
              </Pressable>
            </View>
          </View>
        )}

        {/* 添加按钮 */}
        {canAddMore && !showLinkInput && (
          <Pressable
            style={[
              styles.gridItem,
              styles.addButton,
              {
                width: itemSize,
                height: itemSize,
                borderColor: theme.colors.outline,
              },
            ]}
            onPress={isWeb ? handleWebAdd : pickImageFromLibrary}
          >
            <View style={[styles.addIconCircle, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Ionicons name="add" size={24} color={theme.colors.onSurfaceVariant} />
            </View>
            <Text style={[styles.addText, { color: theme.colors.outline }]}>
              {isWeb ? '添加链接' : '添加图片'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* 底部提示 */}
      {validImages.length > 0 && (
        <Text style={[styles.countHint, { color: theme.colors.outline }]}>
          {validImages.length}/{maxImages} 张图片
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  errorDismiss: {
    margin: 0,
    width: 24,
    height: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  addIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: {
    fontSize: 12,
    fontWeight: '500',
  },
  uploadingItem: {
    borderWidth: 1,
    borderStyle: 'solid',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  uploadingText: {
    fontSize: 11,
    fontWeight: '500',
  },
  linkInputItem: {
    borderWidth: 1.5,
    borderStyle: 'solid',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  linkTextInput: {
    fontSize: 11,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  linkInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  linkConfirmBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkCancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
});
