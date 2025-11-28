import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/src/context/theme_context';
import { HapticTab } from '@/src/components/haptic_tab';
import { useAuth } from '@/src/context/auth_context';

export default function TabsLayout() {
  const theme = useTheme();
  const { userToken, isLoading } = useAuth();
  const screenOptions = React.useMemo(
    () => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: theme.card,
        borderTopWidth: 0,
        elevation: 0,
        // 轻微阴影模拟浮动效果
        ...(Platform.OS !== 'android' && {
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        }),
        height: 60,
        paddingBottom: 6,
        paddingTop: 6,
      },
      sceneContainerStyle: { backgroundColor: theme.background },
      tabBarActiveTintColor: theme.tint,
      tabBarInactiveTintColor: theme.tabIconDefault,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const, marginTop: 2 },
      tabBarButton: (props: any) => <HapticTab {...props} />,
    }),
    [theme.card, theme.tint, theme.tabIconDefault, theme.background]
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
          tabBarIcon: ({ focused }) => (
            <View style={[styles.fabContainer, { backgroundColor: theme.tint }]}>
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
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    // 增强阴影
    shadowColor: '#F97316',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
