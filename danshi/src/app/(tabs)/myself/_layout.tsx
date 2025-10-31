import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/src/context/theme_context';

export default function MyselfStackLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        contentStyle: { backgroundColor: theme.background as string },
        headerStyle: { backgroundColor: theme.background as string },
        headerShadowVisible: false,
        headerTintColor: theme.text as string,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="settings"
        options={{
          headerTitle: '',
          headerTransparent: true,
        }}
      />
    </Stack>
  );
}
