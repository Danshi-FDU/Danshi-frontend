import React from 'react';
import { Image, ImageProps, ImageSourcePropType, StyleProp, ImageStyle } from 'react-native';

export type ResponsiveImageProps = Omit<ImageProps, 'source' | 'style'> & {
  source: ImageSourcePropType;
  // When provided, ensures height scales with width responsively
  aspectRatio?: number; // width / height
  width?: number | string; // default '100%'
  maxWidth?: number; // optional
  style?: StyleProp<ImageStyle>;
};

export default function ResponsiveImage({ source, aspectRatio, width = '100%' as any, maxWidth, style, resizeMode = 'contain', ...rest }: ResponsiveImageProps) {
  return (
    <Image
      source={source}
      resizeMode={resizeMode}
      style={[{ width, ...(aspectRatio ? { aspectRatio } : {}), ...(maxWidth ? { maxWidth } : {}) }, style]}
      {...rest}
    />
  );
}
