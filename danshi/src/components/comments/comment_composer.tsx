import React from 'react';
import {
  View,
  StyleSheet,
  TextInput as RNTextInput,
  Pressable,
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
  const disabled = !hasContent || loading;
  const headerText = replyTarget ? `回复 @${replyTarget}` : '发表评论';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          borderWidth: 1,
          padding: 16,
          borderRadius: 16,
          shadowColor: 'transparent',
        },
      ]}
    >
      {/* 标题栏 */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurfaceVariant }]}>
          {headerText}
        </Text>
        {replyTarget ? (
          <Pressable onPress={onCancelReply} hitSlop={8} style={styles.headerClose}>
            <Ionicons name="close" size={18} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </View>

      {/* 输入区 */}
      <RNTextInput
        value={value}
        onChangeText={onChange}
        placeholder="写下你的想法..."
        placeholderTextColor={theme.colors.outline}
        multiline
        maxLength={maxLength}
        textAlignVertical="top"
        style={[
          styles.input,
          {
            color: theme.colors.onSurface,
          },
          Platform.OS === 'web' && ({ outlineStyle: 'none', borderWidth: 0 } as any),
        ]}
      />

      {/* 底部分割线 */}
      <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

      {/* 底部操作栏 */}
      <View style={styles.footer}>
        <Text style={[styles.charCount, { color: theme.colors.onSurfaceVariant }]}>
          {value.length}/{maxLength}
        </Text>
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
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },

  // ==================== 标题栏 ====================
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 20,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  headerClose: {
    position: 'absolute',
    right: 0,
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

  divider: {
    height: StyleSheet.hairlineWidth,
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
