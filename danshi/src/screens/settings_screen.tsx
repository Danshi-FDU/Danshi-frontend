import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/src/context/theme_context';
import { Text, Appbar, List, useTheme as usePaperTheme } from 'react-native-paper';
import BottomSheet from '@/src/components/overlays/bottom_sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function SettingsScreen() {
  const { mode, setMode, text, card } = useTheme();
  const [sheet, setSheet] = useState<null | 'theme'>(null);
  const insets = useSafeAreaInsets();
  const pTheme = usePaperTheme();

  const themeLabel = useMemo(() => (mode === 'system' ? '系统' : mode === 'light' ? '明亮' : '深色'), [mode]);

  const goBack = () => {
    // 优先返回上一个页面；若没有历史记录则直接回到“我的”
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.replace('/myself');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top}>
        <Appbar.BackAction onPress={goBack} />
        <Appbar.Content title="设置" />
      </Appbar.Header>
      <ScrollView style={{ backgroundColor: pTheme.colors.background }} contentContainerStyle={{ padding: 16 }}>
        <List.Section>
          <List.Subheader>主题</List.Subheader>
          <List.Item
            title="当前主题"
            right={() => <Text style={{ alignSelf: 'center' }}>{themeLabel}</Text>}
            onPress={() => setSheet('theme')}
          />
        </List.Section>

        {/* 选择面板 */}
        <BottomSheet visible={sheet === 'theme'} onClose={() => setSheet(null)}>
          <Text style={{ marginBottom: 8 }}>选择主题模式</Text>
          {(['system', 'light', 'dark'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setMode?.(m);
                setSheet(null);
              }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: card as string, borderRadius: 8, marginVertical: 4 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text>{m === 'system' ? '系统' : m === 'light' ? '明亮' : '深色'}</Text>
              {mode === m ? <Ionicons name="checkmark" size={18} color={text as string} /> : null}
            </Pressable>
          ))}
        </BottomSheet>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
});
