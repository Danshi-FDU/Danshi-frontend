import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/src/context/theme_context';
import { HapticTab } from '@/src/components/haptic_tab';
import { useAuth } from '@/src/context/auth_context';

export default function TabsLayout() {
  const theme = useTheme();
  const { userToken, isLoading } = useAuth();
  if (isLoading) return null;
  if (!userToken) {
    return <Redirect href="/login" />;
  }
  const screenOptions = React.useMemo(
    () => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: theme.card,
        borderTopWidth: 0, // remove default hairline on iOS/Android
        elevation: 0, // remove Android shadow that can look like a line
      },
      // Ensure scenes behind the tab bar use themed background (avoid white seams)
      sceneContainerStyle: { backgroundColor: theme.background },
      tabBarActiveTintColor: theme.tint,
      tabBarInactiveTintColor: theme.icon,
      tabBarLabelStyle: { fontSize: 12 },
      tabBarButton: (props: any) => <HapticTab {...props} />,
    }),
    [theme.card, theme.tint, theme.icon, theme.background]
  );

  return (
    <Tabs initialRouteName="explore" screenOptions={screenOptions}>
      <Tabs.Screen
        name="post"
        options={{
          title: '发布',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={size} color={color} />
          ),
        }}

      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '探索',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />
          ),
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
