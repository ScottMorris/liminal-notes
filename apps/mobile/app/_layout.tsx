import { Stack } from 'expo-router';
import { VaultProvider } from '../src/context/VaultContext';
import { IndexProvider } from '../src/context/IndexContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { SettingsProvider } from '../src/context/SettingsContext';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <VaultProvider>
          <IndexProvider>
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
          </IndexProvider>
        </VaultProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
