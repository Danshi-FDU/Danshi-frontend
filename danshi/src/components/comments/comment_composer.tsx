import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput as RNTextInput,
  Pressable,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Text, useTheme as usePaperTheme } from 'react-native-paper';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { CommentAuthor } from '@/src/models/Comment';

export type CommentComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  replyTarget?: string;
  onCancelReply?: () => void;
  minRows?: number;
  maxLength?: number;
  currentUser?: CommentAuthor;
  loading?: boolean;
};

export const CommentComposer: React.FC<CommentComposerProps> = ({
  value,
  onChange,
  onSubmit,
  replyTarget,
  onCancelReply,
  maxLength = 500,
  currentUser,
  loading,
}) => {
  const theme = usePaperTheme();
  const hasContent = value.trim().length > 0;
  const [focused, setFocused] = useState(false);
  const disabled = !hasContent || loading;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: 'transparent',
          borderColor: focused ? theme.colors.primary : 'transparent',
          borderWidth: focused ? 2 : 0,
          padding: focused ? 16 : 16,
          borderRadius: 8,
        },
      ]}
    >
      {/* 左侧头像 */}
      <View style={styles.avatarWrapper}>
        {currentUser?.avatar_url ? (
          <Image source={{ uri: currentUser.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primaryContainer }]}>
            <Ionicons name="person" size={20} color={theme.colors.primary} />
          </View>
        )}
      </View>

      {/* 右侧主体 */}
      <View style={styles.body}>
        {/* 回复提示 */}
        {replyTarget ? (
          <View style={[styles.replyHint, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={styles.replyHintLeft}>
              <Ionicons name="arrow-undo" size={14} color={theme.colors.primary} />
              <Text style={[styles.replyHintText, { color: theme.colors.onSurfaceVariant }]}>
                回复 <Text style={{ color: theme.colors.primary }}>@{replyTarget}</Text>
              </Text>
            </View>
            <Pressable onPress={onCancelReply} hitSlop={8}>
              <Ionicons name="close" size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          </View>
        ) : null}

        {/* 无边框输入区 */}
        <RNTextInput
          value={value}
          onChangeText={onChange}
          placeholder="写下你的想法..."
          placeholderTextColor={theme.colors.outline}
          multiline
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          textAlignVertical="top"
          style={[
            styles.input,
            {
              color: theme.colors.onSurface,
              padding: focused ? 12 : 0,
            },
            // 去除 web 默认内边框
            Platform.OS === 'web' && ({ outlineStyle: 'none', borderWidth: 0 } as any),
          ]}
        />

        {/* 底部操作栏 */}
        <View style={styles.footer}>
          {/* 字符计数 */}
          <Text style={[styles.charCount, { color: theme.colors.onSurfaceVariant }]}>
            {value.length}/{maxLength}
          </Text>

          {/* 发布按钮 - 胶囊形状 */}
          <Pressable
            onPress={onSubmit}
            disabled={disabled}
            style={({ pressed }) => [
              styles.submitBtn,
              disabled
                ? { backgroundColor: theme.colors.surfaceVariant }
                : { backgroundColor: theme.colors.primary },
              pressed && !disabled && { opacity: 0.85 },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimary} />
            ) : (
              <Text
                style={[
                  styles.submitBtnText,
                  { color: disabled ? theme.colors.onSurfaceVariant : theme.colors.onPrimary },
                ]}
              >
                发布
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  // ==================== 头像 ====================
  avatarWrapper: {
    width: 40,
    height: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // ==================== 主体 ====================
  body: {
    flex: 1,
    gap: 12,
  },

  // ==================== 回复提示 ====================
  replyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  replyHintLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  replyHintText: {
    fontSize: 13,
  },

  // ==================== 输入框 ====================
  input: {
    minHeight: 120,
    fontSize: 16,
    lineHeight: 26,
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },

  // ==================== 底部 ====================
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCount: {
    fontSize: 12,
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
