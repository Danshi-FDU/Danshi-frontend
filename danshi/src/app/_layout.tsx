import React from 'react';
import { Stack } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeModeProvider, useTheme } from '@/src/context/theme_context';
import { AuthProvider } from '@/src/context/auth_context';
import { WaterfallSettingsProvider } from '@/src/context/waterfall_context';
import { PaperProvider } from 'react-native-paper';
import { getMD3Theme } from '@/src/constants/md3_theme';

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <ThemedPaperRoot>
        <AuthProvider>
          <WaterfallSettingsProvider>
            <RootStack />
          </WaterfallSettingsProvider>
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
          // 流畅的过渡动画
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
          animationDuration: 200,
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
      </Stack>
    </View>
  );
}

function ThemedPaperRoot({ children }: { children: React.ReactNode }) {
  const { effective } = useTheme();
  const theme = getMD3Theme(effective);
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
