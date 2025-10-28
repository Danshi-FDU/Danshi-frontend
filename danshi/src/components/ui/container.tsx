import React from 'react';
import { View, ViewProps } from 'react-native';
import { useResponsive } from '@/src/hooks/use_responsive';
import { containerConfig } from '@/src/constants/layout';

export type ContainerProps = ViewProps & {
  maxWidth?: number; // optional custom maxWidth in px
  paddingHorizontal?: number; // override default horizontal padding
  fluid?: boolean; // when true, ignore maxWidth (full-width container)
};

export const Container: React.FC<ContainerProps> = ({
  style,
  children,
  maxWidth,
  paddingHorizontal,
  fluid,
  ...rest
}) => {
  const { current } = useResponsive();

  // default paddings by breakpoint
  const px = paddingHorizontal ?? containerConfig.paddings[current];

  // default max widths by breakpoint if not provided
  const mw = maxWidth ?? containerConfig.maxWidths[current];

  return (
    <View
      style={[
  { width: '100%', alignSelf: 'center', paddingHorizontal: px, maxWidth: fluid ? undefined : mw },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

export default Container;
