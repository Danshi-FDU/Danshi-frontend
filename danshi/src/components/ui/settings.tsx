import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Body, H3 } from '@/src/components/ui/typography';
import { useTheme } from '@/src/hooks/use_theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import Card from '@/src/components/ui/card';

export const SettingsList: React.FC<{ title?: string; children: React.ReactNode } & React.ComponentProps<typeof Card>> = ({ title, children, ...cardProps }) => {

  return (
    <Card padded {...cardProps}>
      {title ? <H3 style={{ marginBottom: 8 }}>{title}</H3> : null}
      <View style={{ marginHorizontal: -12 }}>{children}</View>
    </Card>
  );
};

export type SettingsItemProps = {
  title: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
};

export const SettingsItem: React.FC<SettingsItemProps> = ({ title, value, onPress, danger }) => {
  const { text, icon, danger: dangerColor, card } = useTheme();
  const color = danger ? dangerColor : text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: card as string, borderRadius: 8, marginVertical: 4 },
        pressed && { opacity: 0.85 },
      ]}
    >
  <Body style={{ ...(styles.title as any), color }}>{title}</Body>
      <View style={styles.right}>
  {value ? <Body style={{ color: icon as string }}>{value}</Body> : null}
        <Ionicons name="chevron-forward" size={18} color={icon as string} style={{ marginLeft: 6 }} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  item: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default { SettingsList, SettingsItem };
