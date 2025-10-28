import React, { useMemo } from 'react';
import { View, ViewProps } from 'react-native';
import { useResponsive } from '@/src/hooks/use_responsive';

// Breakpoints: base | sm | md | lg | xl
export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl';
export type ColumnsConfig = number | Partial<Record<Breakpoint, number>>;

export type MasonryProps<T> = ViewProps & {
  data: T[];
  columns?: ColumnsConfig; // default 2
  gap?: number; // gutter spacing
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemHeight: (item: T, index: number) => number; // estimated/fixed height in px
  keyExtractor?: (item: T, index: number) => string;
};

function pickColumns(columns: ColumnsConfig | undefined, current: Breakpoint): number {
  if (!columns) return 2;
  if (typeof columns === 'number') return Math.max(1, Math.floor(columns));
  const conf = columns as Partial<Record<Breakpoint, number>>;
  // Prefer exact match, otherwise gracefully fall back to the nearest smaller breakpoint
  const order: Breakpoint[] =
    current === 'xl'
      ? ['xl', 'lg', 'md', 'sm', 'base']
      : current === 'lg'
        ? ['lg', 'md', 'sm', 'base']
        : current === 'md'
          ? ['md', 'sm', 'base']
          : current === 'sm'
            ? ['sm', 'base']
            : ['base'];
  for (const k of order) {
    const val = conf[k];
    if (typeof val === 'number') return Math.max(1, Math.floor(val));
  }
  return 2;
}

export function Masonry<T>({
  data,
  columns: columnsConfig = 2,
  gap = 12,
  renderItem,
  getItemHeight,
  keyExtractor,
  style,
  ...rest
}: MasonryProps<T>) {
  const { current } = useResponsive();
  const columns = pickColumns(columnsConfig, current);

  // distribute items into columns by minimal current height (masonry algorithm)
  const distributed = useMemo(() => {
    const colItems: { items: Array<{ item: T; index: number }>; height: number }[] = Array.from(
      { length: columns },
      () => ({ items: [], height: 0 })
    );
    data.forEach((item, index) => {
      // find the column with the smallest height
      let minIdx = 0;
      for (let i = 1; i < columns; i++) {
        if (colItems[i].height < colItems[minIdx].height) minIdx = i;
      }
      const h = Math.max(0, getItemHeight(item, index));
      colItems[minIdx].items.push({ item, index });
      // add item height + gap as stack height (first item no top gap)
      colItems[minIdx].height += (colItems[minIdx].items.length === 1 ? 0 : gap) + h;
    });
    return colItems.map(c => c.items);
  }, [data, columns, gap, getItemHeight]);

  // Use flex to evenly distribute columns (avoids percentage width type issues on RN)

  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'nowrap', marginLeft: -gap },
        // @ts-ignore: web supports gap, native will ignore
        { gap },
        style,
      ]}
      {...rest}
    >
      {distributed.map((col, colIdx) => (
        <View key={`col-${colIdx}`} style={{ flex: 1, paddingLeft: gap }}>
          {col.map(({ item, index }, i) => (
            <View key={keyExtractor ? keyExtractor(item, index) : `${colIdx}-${index}`}
              style={{ marginTop: i === 0 ? 0 : gap }}>
              {renderItem(item, index)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default Masonry;
