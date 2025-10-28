import React, { useState } from 'react';
import { TextInput, TextInputProps, View, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/src/hooks/use_theme';
import { Body } from '@/src/components/ui/typography';

export type InputProps = TextInputProps & {
  label?: string;
  errorText?: string;
  size?: 'sm' | 'md' | 'lg';
};

export const Input: React.FC<InputProps> = ({
  label,
  errorText,
  size = 'md',
  style,
  ...rest
}) => {
  const { text, icon, tint, background, card, danger } = useTheme();
  const [focused, setFocused] = useState(false);

  const dims =
    size === 'lg'
      ? { height: 48, paddingHorizontal: 14, fontSize: 16 }
      : size === 'sm'
      ? { height: 36, paddingHorizontal: 12, fontSize: 14 }
      : { height: 44, paddingHorizontal: 12, fontSize: 15 };

  const borderColor = errorText ? danger : focused ? tint : icon;

  return (
    <View style={{ width: '100%' }}>
      {label ? (
        <Body style={{ marginBottom: 6 }} emphasis>
          {label}
        </Body>
      ) : null}
      <TextInput
        {...rest}
        placeholderTextColor={icon}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            color: text,
            borderColor,
            height: dims.height,
            paddingHorizontal: dims.paddingHorizontal,
            fontSize: dims.fontSize,
            backgroundColor: 'transparent',
          },
          style,
        ]}
      />
      {errorText ? (
        <Text style={{ color: danger, marginTop: 6, fontSize: 13 }}>{errorText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
});

export default Input;
