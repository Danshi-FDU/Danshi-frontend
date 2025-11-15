import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useTheme } from '@/src/context/theme_context';
import { useAuth } from '@/src/context/auth_context';

export default function AuthLayout() {
  const theme = useTheme();
  const { userToken, isLoading } = useAuth();
  if (isLoading) return null;
  if (userToken) {
    return <Redirect href="/explore" />;
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
