import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { useTheme } from '@/src/context/theme_context';
import { Body } from '@/src/components/ui/typography';
import Button from '@/src/components/ui/button';
import Input from '@/src/components/ui/input';
import { useWaterfallSettings } from '@/src/context/waterfall_context';
import { SettingsList, SettingsItem } from '@/src/components/ui/settings';
import BottomSheet from '@/src/components/overlays/bottom_sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import Screen from '@/src/components/ui/screen';
import { H2 } from '@/src/components/ui/typography';
import { router } from 'expo-router';


export default function SettingsScreen() {
  const { mode, effective, setMode, background, danger, text, icon, card } = useTheme();
  
  const { minHeight, maxHeight, setMinHeight, setMaxHeight } = useWaterfallSettings();

  const [sheet, setSheet] = useState<null | 'theme' | 'min' | 'max'>(null);
  const [customMinOpen, setCustomMinOpen] = useState(false);
  const [customMaxOpen, setCustomMaxOpen] = useState(false);
  const [customMin, setCustomMin] = useState(String(minHeight));
  const [customMax, setCustomMax] = useState(String(maxHeight));

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
    <Screen variant="scroll" withContainer>
        {/* 自定义头部：返回 + 标题 */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} accessibilityLabel="返回">
            <Ionicons name="chevron-back" size={20} color={text as string} />
          </TouchableOpacity>
          <H2>设置</H2>
          <View style={{ width: 48 }} />
        </View>
        <SettingsList title="主题">
          <SettingsItem title="当前主题" value={themeLabel} onPress={() => setSheet('theme')} />
        </SettingsList>

        <View style={{ height: 16 }} />

        <SettingsList title="瀑布流">
          <SettingsItem title="最小高度" value={`${minHeight} px`} onPress={() => setSheet('min')} />
          <SettingsItem title="最大高度" value={`${maxHeight} px`} onPress={() => setSheet('max')} />
        </SettingsList>

        
  
        {/* 选择面板 */}
        <BottomSheet visible={sheet === 'theme'} onClose={() => setSheet(null)}>
          <Body style={{ marginBottom: 8 }}>选择主题模式</Body>
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
              <Body>{m === 'system' ? '系统' : m === 'light' ? '明亮' : '深色'}</Body>
              {mode === m ? <Ionicons name="checkmark" size={18} color={text as string} /> : null}
            </Pressable>
          ))}
        </BottomSheet>

        <BottomSheet visible={sheet === 'min'} onClose={() => { setSheet(null); setCustomMinOpen(false); }}>
          <Body style={{ marginBottom: 8 }}>选择最小高度</Body>
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
              <Body>{v} px</Body>
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
            <Body>自定义…</Body>
          </Pressable>
          {customMinOpen ? (
            <View style={{ paddingHorizontal: 8, paddingTop: 8 }}>
              <Input keyboardType="number-pad" value={customMin} onChangeText={setCustomMin} placeholder={`>=40 且 < ${maxHeight}`}/>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <Button
                  title="取消"
                  variant="secondary"
                  size="sm"
                  onPress={() => { setCustomMin(String(minHeight)); setCustomMinOpen(false); }}
                  style={{ marginRight: 8 }}
                />
                <Button
                  title="确定"
                  size="sm"
                  onPress={() => {
                    const n = parseInt(customMin, 10);
                    if (!isNaN(n)) setMinHeight(n);
                    setSheet(null);
                    setCustomMinOpen(false);
                  }}
                />
              </View>
            </View>
          ) : null}
        </BottomSheet>

        <BottomSheet visible={sheet === 'max'} onClose={() => { setSheet(null); setCustomMaxOpen(false); }}>
          <Body style={{ marginBottom: 8 }}>选择最大高度</Body>
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
              <Body>{v} px</Body>
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
            <Body>自定义…</Body>
          </Pressable>
          {customMaxOpen ? (
            <View style={{ paddingHorizontal: 8, paddingTop: 8 }}>
              <Input keyboardType="number-pad" value={customMax} onChangeText={setCustomMax} placeholder={`<=600 且 > ${minHeight}`}/>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <Button
                  title="取消"
                  variant="secondary"
                  size="sm"
                  onPress={() => { setCustomMax(String(maxHeight)); setCustomMaxOpen(false); }}
                  style={{ marginRight: 8 }}
                />
                <Button
                  title="确定"
                  size="sm"
                  onPress={() => {
                    const n = parseInt(customMax, 10);
                    if (!isNaN(n)) setMaxHeight(n);
                    setSheet(null);
                    setCustomMaxOpen(false);
                  }}
                />
              </View>
            </View>
          ) : null}
        </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 36,
  },
  option: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
});
