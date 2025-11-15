import React from 'react';
import { Slot, Redirect, usePathname } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeModeProvider, useTheme } from '@/src/context/theme_context';
import { AuthProvider, useAuth } from '@/src/context/auth_context';
import { WaterfallSettingsProvider } from '@/src/context/waterfall_context';
import { PaperProvider, useTheme as usePaperTheme } from 'react-native-paper';
import { getMD3Theme } from '@/src/constants/md3_theme';

function Gate() {
  const { userToken, isLoading } = useAuth();
  const pathname = usePathname();
  const pTheme = usePaperTheme();
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  const isAuthRoute = pathname === '/login' || pathname === '/register';
  if (!userToken) {
    return isAuthRoute ? <Slot /> : <Redirect href="/login" />;
  }
  if (isAuthRoute) {
    return <Redirect href="/explore" />;
  }
  return (
    <View style={{ flex: 1, backgroundColor: pTheme.colors.background }}>
      <StatusBar style="auto" translucent />
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <ThemedPaperRoot>
        <AuthProvider>
          <WaterfallSettingsProvider>
            <Gate />
          </WaterfallSettingsProvider>
        </AuthProvider>
      </ThemedPaperRoot>
    </ThemeModeProvider>
  );
}

function ThemedPaperRoot({ children }: { children: React.ReactNode }) {
  const { effective } = useTheme();
  const theme = getMD3Theme(effective);
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
