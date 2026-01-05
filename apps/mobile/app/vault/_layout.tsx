import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function VaultLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Vault',
          headerShown: true
        }}
      />
      <Stack.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: true
        }}
      />
      <Stack.Screen
        name="explorer"
        options={{
          title: 'Explorer',
          headerShown: true
        }}
      />
      <Stack.Screen
        name="note/[id]"
        options={{
          title: 'Note',
          headerShown: true
        }}
      />
    </Stack>
  );
}
