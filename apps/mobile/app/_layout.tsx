import { Stack } from 'expo-router';
import { VaultProvider } from '../src/context/VaultContext';
import { IndexProvider } from '../src/context/IndexContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { SettingsProvider } from '../src/context/SettingsContext';
import { PaperThemeProvider } from '../src/context/PaperThemeContext';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <PaperThemeProvider>
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
                <Stack.Screen
                  name="settings/[section]"
                  options={{
                    headerShown: true,
                    title: ''
                  }}
                />
              </Stack>
            </IndexProvider>
          </VaultProvider>
        </PaperThemeProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
