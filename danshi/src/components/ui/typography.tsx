import React from 'react';
import { TextProps, TextStyle } from 'react-native';
import { useResponsive } from '@/src/hooks/use_responsive';
import { ThemedText } from '@/src/components/themed_text';
import { Fonts, TypeScale } from '@/src/constants/theme';

export type TypographyProps = TextProps & {
  style?: TextStyle;
  weight?: TextStyle['fontWeight'];
  emphasis?: boolean; // quick semi-bold
};

function pickSize(map: Record<'base' | 'sm' | 'md' | 'lg' | 'xl', number>) {
  const { current } = useResponsive();
  return map[current];
}

export const H1: React.FC<TypographyProps> = ({ children, style, weight, emphasis, ...rest }) => {
  const fontSize = pickSize(TypeScale.h1);
  return (
    <ThemedText style={[{ fontSize, lineHeight: fontSize * 1.2, fontWeight: weight ?? (emphasis ? '600' : '700'), fontFamily: Fonts.rounded }, style]} {...rest}>
      {children}
    </ThemedText>
  );
};

export const H2: React.FC<TypographyProps> = ({ children, style, weight, emphasis, ...rest }) => {
  const fontSize = pickSize(TypeScale.h2);
  return (
    <ThemedText style={[{ fontSize, lineHeight: fontSize * 1.2, fontWeight: weight ?? (emphasis ? '600' : '700') }, style]} {...rest}>
      {children}
    </ThemedText>
  );
};

export const H3: React.FC<TypographyProps> = ({ children, style, weight, emphasis, ...rest }) => {
  const fontSize = pickSize(TypeScale.h3);
  return (
    <ThemedText style={[{ fontSize, lineHeight: fontSize * 1.2, fontWeight: weight ?? (emphasis ? '600' : '700') }, style]} {...rest}>
      {children}
    </ThemedText>
  );
};

export const Subtitle: React.FC<TypographyProps> = ({ children, style, weight, emphasis, ...rest }) => {
  const fontSize = pickSize(TypeScale.subtitle);
  return (
    <ThemedText style={[{ fontSize, lineHeight: fontSize * 1.4, fontWeight: weight ?? (emphasis ? '600' : '600') }, style]} {...rest}>
      {children}
    </ThemedText>
  );
};

export const Body: React.FC<TypographyProps> = ({ children, style, weight, emphasis, ...rest }) => {
  const fontSize = pickSize(TypeScale.body);
  return (
    <ThemedText style={[{ fontSize, lineHeight: fontSize * 1.6, fontWeight: weight ?? (emphasis ? '600' : undefined) }, style]} {...rest}>
      {children}
    </ThemedText>
  );
};

export const Caption: React.FC<TypographyProps> = ({ children, style, weight, emphasis, ...rest }) => {
  const fontSize = pickSize(TypeScale.caption);
  return (
    <ThemedText style={[{ fontSize, lineHeight: fontSize * 1.6, opacity: 0.8, fontWeight: weight ?? (emphasis ? '600' : undefined) }, style]} {...rest}>
      {children}
    </ThemedText>
  );
};

export default { H1, H2, H3, Subtitle, Body, Caption };
