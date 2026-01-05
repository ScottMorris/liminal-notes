import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { VaultProvider } from '../src/context/VaultContext';
import { IndexProvider } from '../src/context/IndexContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { SettingsProvider } from '../src/context/SettingsContext';
import { PaperThemeProvider } from '../src/context/PaperThemeContext';

function AppNavigator() {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} backgroundColor={theme.colors.background} />
      <Stack
        screenOptions={{
          headerShown: false, // Default hidden for vault layout
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
          contentStyle: { backgroundColor: theme.colors.background },
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
    </>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <PaperThemeProvider>
          <VaultProvider>
            <IndexProvider>
              <AppNavigator />
            </IndexProvider>
          </VaultProvider>
        </PaperThemeProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
