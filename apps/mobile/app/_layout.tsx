import { Stack } from 'expo-router';
import { VaultProvider } from '../src/context/VaultContext';

export default function RootLayout() {
  return (
    <VaultProvider>
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
            headerShown: true,
            title: 'Search'
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            title: 'Settings'
          }}
        />
      </Stack>
    </VaultProvider>
  );
}
