import React, { createContext, useContext, useMemo } from 'react';
import { View, ViewProps } from 'react-native';
import { useResponsive } from '@/src/hooks/use_responsive';

type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl';

export type GridColumns = number | Partial<Record<Breakpoint, number>>;

type GridContextValue = { columns: number; gap: number };
const GridContext = createContext<GridContextValue | null>(null);

function useGridContext(): GridContextValue {
  const ctx = useContext(GridContext);
  if (!ctx) throw new Error('Col must be used within a Grid');
  return ctx;
}

export type GridProps = ViewProps & {
  columns?: GridColumns; // default 1
  gap?: number; // gutter in px
};

export const Grid: React.FC<GridProps> = ({ columns = 1, gap = 12, style, children, ...rest }) => {
  const { current } = useResponsive();

  const cols = useMemo(() => {
    if (typeof columns === 'number') return Math.max(1, Math.floor(columns));
    const map: Partial<Record<Breakpoint, number>> = columns;
    const v = map[current] ?? map.base ?? 1;
    return Math.max(1, Math.floor(v));
  }, [columns, current]);

  return (
    <GridContext.Provider value={{ columns: cols, gap }}>
      <View
        style={[
          { flexDirection: 'row', flexWrap: 'wrap', marginLeft: -gap, marginTop: -gap },
          // @ts-ignore web supports gap
          { gap },
          style,
        ]}
        {...rest}
      >
        {children}
      </View>
    </GridContext.Provider>
  );
};

export type ColProps = ViewProps & {
  span?: number; // how many columns to span (1..columns)
};

export const Col: React.FC<ColProps> = ({ span = 1, style, children, ...rest }) => {
  const { columns, gap } = useGridContext();
  const s = Math.min(Math.max(1, Math.floor(span)), columns);
  const widthPercent = (s / columns) * 100;

  return (
    <View
      style={[
        { width: `${widthPercent}%`, paddingLeft: gap, paddingTop: gap },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

export default Grid;
