import React from 'react';
import { Slot, Redirect, usePathname } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeModeProvider } from '@/src/context/theme_context';
import { AuthProvider, useAuth } from '@/src/context/auth_context';
import { WaterfallSettingsProvider } from '@/src/context/waterfall_context';

function Gate() {
  const { userToken, isLoading } = useAuth();
  const pathname = usePathname();
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
    return <Redirect href="/" />;
  }
  return (
    <>
      <StatusBar style="auto" translucent />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        <WaterfallSettingsProvider>
          <Gate />
        </WaterfallSettingsProvider>
      </AuthProvider>
    </ThemeModeProvider>
  );
}
