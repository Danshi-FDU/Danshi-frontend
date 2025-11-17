import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Avatar, Button, IconButton, Text, TextInput, useTheme as usePaperTheme } from 'react-native-paper';
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
  minRows = 3,
  maxLength = 500,
  currentUser,
  loading,
}) => {
  const theme = usePaperTheme();
  const disabled = !value.trim() || loading;

  return (
    <View style={[styles.container, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
      {currentUser?.avatarUrl ? (
        <Avatar.Image size={40} source={{ uri: currentUser.avatarUrl }} />
      ) : (
        <Avatar.Text size={40} label={currentUser?.name?.slice(0, 1) ?? '我'} />
      )}
      <View style={styles.body}>
        {replyTarget ? (
          <View style={styles.replyHint}>
            <Text variant="bodySmall">
              回复 @{replyTarget}
            </Text>
            <IconButton size={18} icon="close" onPress={onCancelReply} />
          </View>
        ) : null}
        <TextInput
          mode="outlined"
          value={value}
          onChangeText={onChange}
          placeholder="写下你的想法..."
          multiline
          numberOfLines={minRows}
          maxLength={maxLength}
          style={styles.input}
        />
        <View style={styles.footer}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {value.length}/{maxLength}
          </Text>
          <Button mode="contained" onPress={onSubmit} disabled={disabled} loading={loading}>
            发布
          </Button>
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
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  body: {
    flex: 1,
    gap: 8,
  },
  replyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    minHeight: 96,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
