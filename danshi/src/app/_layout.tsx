import React from 'react';
import { Stack } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeModeProvider, useTheme } from '@/src/context/theme_context';
import { AuthProvider } from '@/src/context/auth_context';
import { WaterfallSettingsProvider } from '@/src/context/waterfall_context';
import { NotificationsProvider } from '@/src/context/notifications_context';
import { PaperProvider } from 'react-native-paper';
import { getMD3Theme } from '@/src/constants/md3_theme';

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <ThemedPaperRoot>
        <AuthProvider>
          <NotificationsProvider>
            <WaterfallSettingsProvider>
              <RootStack />
            </WaterfallSettingsProvider>
          </NotificationsProvider>
        </AuthProvider>
      </ThemedPaperRoot>
    </ThemeModeProvider>
  );
}

function RootStack() {
  const { effective, background } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: background as string }]}>
      <StatusBar style={effective === 'dark' ? 'light' : 'dark'} translucent />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: background as string },
          // 统一无动画
          animation: 'none',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          // 防止闪白
          presentation: 'card',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="post" />
        <Stack.Screen name="user" />
        <Stack.Screen name="search" />
        <Stack.Screen name="notifications" />
      </Stack>
    </View>
  );
}

function ThemedPaperRoot({ children }: { children: React.ReactNode }) {
  const { effective, accentColor } = useTheme();
  const theme = getMD3Theme(effective, accentColor);
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
