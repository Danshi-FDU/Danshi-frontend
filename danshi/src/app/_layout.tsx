import React from 'react';
import { Slot } from 'expo-router';
import { View } from 'react-native';
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
            <View style={{ flex: 1 }}>
              <StatusBar style="auto" translucent />
              <Slot />
            </View>
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
