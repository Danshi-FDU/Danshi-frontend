import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/src/context/theme_context';

export default function MyselfStackLayout() {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background as string }]}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitleAlign: 'center',
          contentStyle: { backgroundColor: theme.background as string },
          headerStyle: { backgroundColor: theme.background as string },
          headerShadowVisible: false,
          headerTintColor: theme.text as string,
          headerBackVisible: true,
          headerBackTitleVisible: false,
          // 流畅的过渡动画
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
          animationDuration: 200,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          presentation: 'card',
        }}
      >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="admin"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
