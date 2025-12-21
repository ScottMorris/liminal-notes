import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="vault" />
        <Stack.Screen
          name="search"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Search'
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Settings'
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
