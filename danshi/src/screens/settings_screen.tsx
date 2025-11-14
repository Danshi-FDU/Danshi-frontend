import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/src/context/theme_context';
import { Button, Text, TextInput, Appbar, List, useTheme as usePaperTheme } from 'react-native-paper';
import { useWaterfallSettings } from '@/src/context/waterfall_context';
import BottomSheet from '@/src/components/overlays/bottom_sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function SettingsScreen() {
  const { mode, effective, setMode, text, icon, card } = useTheme();
  
  const { minHeight, maxHeight, setMinHeight, setMaxHeight } = useWaterfallSettings();

  const [sheet, setSheet] = useState<null | 'theme' | 'min' | 'max'>(null);
  const [customMinOpen, setCustomMinOpen] = useState(false);
  const [customMaxOpen, setCustomMaxOpen] = useState(false);
  const [customMin, setCustomMin] = useState(String(minHeight));
  const [customMax, setCustomMax] = useState(String(maxHeight));
  const insets = useSafeAreaInsets();
  const pTheme = usePaperTheme();

  const themeLabel = useMemo(() => (mode === 'system' ? '系统' : mode === 'light' ? '明亮' : '深色'), [mode]);

  const minOptions = [60, 80, 100, 120, 140];
  const maxOptions = [180, 200, 220, 260, 300];

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

        <List.Section>
          <List.Subheader>瀑布流</List.Subheader>
          <List.Item
            title="最小高度"
            right={() => <Text style={{ alignSelf: 'center' }}>{minHeight} px</Text>}
            onPress={() => setSheet('min')}
          />
          <List.Item
            title="最大高度"
            right={() => <Text style={{ alignSelf: 'center' }}>{maxHeight} px</Text>}
            onPress={() => setSheet('max')}
          />
        </List.Section>

        
  
        {/* 选择面板 */}
        <BottomSheet visible={sheet === 'theme'} onClose={() => setSheet(null)}>
          <Text style={{ marginBottom: 8 }}>选择主题模式</Text>
          {(['system','light','dark'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => { setMode?.(m); setSheet(null); }}
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

        <BottomSheet visible={sheet === 'min'} onClose={() => { setSheet(null); setCustomMinOpen(false); }}>
          <Text style={{ marginBottom: 8 }}>选择最小高度</Text>
          {minOptions.map((v) => (
            <Pressable
              key={v}
              onPress={() => { setMinHeight(v); setSheet(null); }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: card as string, borderRadius: 8, marginVertical: 4 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text>{v} px</Text>
              {minHeight === v ? <Ionicons name="checkmark" size={18} color={text as string} /> : null}
            </Pressable>
          ))}
          <Pressable
            onPress={() => setCustomMinOpen((s) => !s)}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: card as string, borderRadius: 8, marginVertical: 4 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text>自定义…</Text>
          </Pressable>
          {customMinOpen ? (
            <View style={{ paddingHorizontal: 8, paddingTop: 8 }}>
              <TextInput keyboardType="number-pad" mode="outlined" value={customMin} onChangeText={setCustomMin} placeholder={`>=40 且 < ${maxHeight}`}/>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <Button
                  mode="text"
                  onPress={() => { setCustomMin(String(minHeight)); setCustomMinOpen(false); }}
                  style={{ marginRight: 8 }}
                >取消</Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    const n = parseInt(customMin, 10);
                    if (!isNaN(n)) setMinHeight(n);
                    setSheet(null);
                    setCustomMinOpen(false);
                  }}
                >确定</Button>
              </View>
            </View>
          ) : null}
        </BottomSheet>

        <BottomSheet visible={sheet === 'max'} onClose={() => { setSheet(null); setCustomMaxOpen(false); }}>
          <Text style={{ marginBottom: 8 }}>选择最大高度</Text>
          {maxOptions.map((v) => (
            <Pressable
              key={v}
              onPress={() => { setMaxHeight(v); setSheet(null); }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: card as string, borderRadius: 8, marginVertical: 4 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text>{v} px</Text>
              {maxHeight === v ? <Ionicons name="checkmark" size={18} color={text as string} /> : null}
            </Pressable>
          ))}
          <Pressable
            onPress={() => setCustomMaxOpen((s) => !s)}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: card as string, borderRadius: 8, marginVertical: 4 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text>自定义…</Text>
          </Pressable>
          {customMaxOpen ? (
            <View style={{ paddingHorizontal: 8, paddingTop: 8 }}>
              <TextInput keyboardType="number-pad" mode="outlined" value={customMax} onChangeText={setCustomMax} placeholder={`<=600 且 > ${minHeight}`}/>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <Button
                  mode="text"
                  onPress={() => { setCustomMax(String(maxHeight)); setCustomMaxOpen(false); }}
                  style={{ marginRight: 8 }}
                >取消</Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    const n = parseInt(customMax, 10);
                    if (!isNaN(n)) setMaxHeight(n);
                    setSheet(null);
                    setCustomMaxOpen(false);
                  }}
                >确定</Button>
              </View>
            </View>
          ) : null}
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
