import React from 'react';
import { View, ViewProps } from 'react-native';
import { Spacing } from '@/src/constants/theme';

export type StackProps = ViewProps & {
  spacing?: number; // spacing between children in px
  horizontal?: boolean; // when true, stack horizontally
  wrap?: boolean; // allow items to wrap to next line when horizontal
  gapX?: number; // horizontal spacing override
  gapY?: number; // vertical spacing override
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
};

export const Stack: React.FC<StackProps> = ({
  spacing = Spacing.md,
  horizontal = false,
  wrap = false,
  gapX,
  gapY,
  style,
  children,
  align,
  justify,
  ...rest
}) => {
  const items = React.Children.toArray(children);
  const gx = gapX ?? spacing;
  const gy = gapY ?? spacing;

  return (
    <View
      style={[
        { flexDirection: horizontal ? 'row' : 'column', alignItems: align, justifyContent: justify, flexWrap: wrap ? 'wrap' : 'nowrap' },
        // web supports gap; native still rolling out. We'll provide margin fallback below.
        // @ts-ignore
        { gap: horizontal ? gx : gy },
        style,
      ]}
      {...rest}
    >
      {items.map((child, idx) => (
        <View
          key={idx}
          style={[
            // margin fallback when gap not supported
            horizontal ? { marginLeft: idx === 0 ? 0 : gx } : { marginTop: idx === 0 ? 0 : gy },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

export default Stack;
