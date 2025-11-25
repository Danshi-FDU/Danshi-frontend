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
      <Stack.Screen
        name="posts"
        options={{
          title: '我的帖子',
        }}
      />
      <Stack.Screen
        name="followers"
        options={{
          title: '我的粉丝',
        }}
      />
      <Stack.Screen
        name="following"
        options={{
          title: '我的关注',
        }}
      />
      <Stack.Screen
        name="admin"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
