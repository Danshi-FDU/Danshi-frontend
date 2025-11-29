import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/src/context/theme_context';
import { HapticTab } from '@/src/components/haptic_tab';
import { useAuth } from '@/src/context/auth_context';
import { BlurView } from 'expo-blur';

// 品牌橙色
const BRAND_ORANGE = '#F97316';

export default function TabsLayout() {
  const theme = useTheme();
  const { userToken, isLoading } = useAuth();

  const screenOptions = React.useMemo(
    () => ({
      headerShown: false,
      tabBarStyle: {
        position: 'absolute' as const,
        backgroundColor: Platform.OS === 'ios' ? 'transparent' : (theme.effective === 'dark' ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)'),
        borderTopWidth: 0,
        elevation: 0,
        height: 64,
        paddingBottom: 8,
        paddingTop: 8,
      },
      tabBarBackground: () =>
        Platform.OS === 'ios' ? (
          <BlurView
            intensity={80}
            tint={theme.effective === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : null,
      sceneContainerStyle: { backgroundColor: theme.background },
      tabBarActiveTintColor: theme.colors.onSurface,
      tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const, marginTop: 2 },
      tabBarButton: (props: any) => <HapticTab {...props} />,
      // Tab 切换动画 - 使用淡入淡出更流畅
      animation: 'fade' as const,
      lazy: true,
      freezeOnBlur: true,
    }),
    [theme]
  );

  if (isLoading) return null;
  if (!userToken) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs initialRouteName="explore" screenOptions={screenOptions}>
      <Tabs.Screen
        name="explore"
        options={{
          title: '发现',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.fabContainer}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </View>
          ),
          tabBarLabelStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="myself"
        options={{
          title: '我的',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: BRAND_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    // 增强橙色阴影
    shadowColor: BRAND_ORANGE,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
