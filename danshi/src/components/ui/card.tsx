import React from 'react';
import { ViewProps, StyleSheet } from 'react-native';
import { ThemedView } from '@/src/components/themed_view';
import { useTheme } from '@/src/context/theme_context';

export type CardProps = ViewProps & {
  padded?: boolean;
  radius?: number;
  elevation?: number;
};

export const Card: React.FC<CardProps> = ({ padded = true, radius = 12, elevation = 4, style, children, ...rest }) => {
  const { card: cardBg } = useTheme();
  return (
    <ThemedView
      style={[
        styles.card,
        { backgroundColor: cardBg, borderRadius: radius, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: elevation, elevation },
        padded ? styles.padded : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  padded: {
    padding: 16,
  },
});

export default Card;
