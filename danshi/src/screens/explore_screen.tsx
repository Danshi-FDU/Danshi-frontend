import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Masonry from '@/src/components/ui/masonry';
import { useWaterfallSettings } from '@/src/context/waterfall_context';
import Screen from '@/src/components/ui/screen';
import { useBreakpoint } from '@/src/hooks/use_media_query';
import { pickByBreakpoint } from '@/src/constants/breakpoints';

export default function ExploreScreen() {
  const { minHeight, maxHeight } = useWaterfallSettings();
  const bp = useBreakpoint();
  const gap = pickByBreakpoint(bp, { base: 8, sm: 10, md: 12, lg: 16, xl: 20 });

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
    <Screen variant="scroll" title="瀑布流示例">
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: 12,
  },
});
