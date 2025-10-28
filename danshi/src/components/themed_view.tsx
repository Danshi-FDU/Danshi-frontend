import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/src/hooks/use_theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const backgroundColor = lightColor || darkColor
    ? theme.effective === 'dark'
      ? darkColor ?? lightColor
      : lightColor ?? darkColor
    : theme.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
