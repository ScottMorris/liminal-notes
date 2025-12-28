import { Stack } from 'expo-router';

export default function VaultLayout() {
  return (
    <Stack>
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
