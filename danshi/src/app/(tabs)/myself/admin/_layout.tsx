import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="posts" />
      <Stack.Screen name="users" />
      <Stack.Screen name="comments" />
    </Stack>
  );
}
