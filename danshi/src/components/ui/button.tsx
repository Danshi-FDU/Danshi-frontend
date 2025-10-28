import React from 'react';
import { ActivityIndicator, GestureResponderEvent, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '@/src/hooks/use_theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  title: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  style,
}) => {
  const { tint, danger, text: textColor, card: cardBg, icon } = useTheme();

  const { height, paddingHorizontal, fontSize } =
    size === 'lg'
      ? { height: 48, paddingHorizontal: 16, fontSize: 16 }
      : size === 'sm'
      ? { height: 36, paddingHorizontal: 12, fontSize: 14 }
      : { height: 44, paddingHorizontal: 14, fontSize: 15 };

  const { backgroundColor, borderColor, borderWidth, color } =
    variant === 'primary'
      ? { backgroundColor: tint, borderColor: tint, borderWidth: 0, color: textColor }
      : variant === 'danger'
      ? { backgroundColor: danger, borderColor: danger, borderWidth: 0, color: textColor }
      : { backgroundColor: 'transparent', borderColor: tint, borderWidth: StyleSheet.hairlineWidth, color: tint };

  const dimmed = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={dimmed}
      style={[
        styles.button,
        { height, paddingHorizontal, backgroundColor, borderColor, borderWidth, opacity: dimmed ? 0.7 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.title, { color, fontSize }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '600',
  },
});

export default Button;
