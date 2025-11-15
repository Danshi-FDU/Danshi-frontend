import React, { useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import Masonry from '@/src/components/md3/masonry';
import { useWaterfallSettings } from '@/src/context/waterfall_context';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';
import { Appbar, Text, useTheme as usePaperTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  const { minHeight, maxHeight } = useWaterfallSettings();
  const bp = useBreakpoint();
  const gap = pickByBreakpoint(bp, { base: 8, sm: 10, md: 12, lg: 16, xl: 20 });
  const insets = useSafeAreaInsets();
  const pTheme = usePaperTheme();

  // 演示数据
  const items = useMemo(() => {
    const arr = Array.from({ length: 60 }, (_, i) => i);
    return arr.map((i) => {
      const height = 80 + (i % 7) * 25 + ((i * 13) % 20); 
      const hue = (i * 37) % 360; 
      const color = `hsl(${hue}, 70%, 60%)`;
      return { id: `block-${i}`, height, color };
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
      <Appbar.Header mode="center-aligned" statusBarHeight={insets.top}>
        <Appbar.Content title="瀑布流示例" />
      </Appbar.Header>
      <ScrollView style={{ backgroundColor: pTheme.colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Masonry
          data={items}
          columns={{ base: 2, md: 3, lg: 4 }}
          gap={gap}
          getItemHeight={(item) => Math.max(minHeight, Math.min(maxHeight, item.height))}
          keyExtractor={(item) => item.id}
          renderItem={(item) => (
            <View
              style={[
                styles.block,
                {
                  height: Math.max(minHeight, Math.min(maxHeight, item.height)),
                  backgroundColor: item.color,
                },
              ]}
            />
          )}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: 12,
  },
});
