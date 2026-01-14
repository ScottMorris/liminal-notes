import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useVault } from '../../src/context/VaultContext';
import { Button, Text, Surface, useTheme, Avatar, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VaultPickerScreen() {
  const router = useRouter();
  const { openSandboxVault, openSafVault, openIosDocumentPicker, isLoading, activeVault } = useVault();
  const theme = useTheme();

  const handleOpenSandbox = async () => {
    try {
      await openSandboxVault();
      router.replace('/vault/home');
    } catch (e) {
      console.error('Failed to open sandbox vault', e);
      alert('Failed to open sandbox vault');
    }
  };

  const handleOpenExternal = async () => {
      try {
          if (Platform.OS === 'android') {
              await openSafVault();
          } else if (Platform.OS === 'ios') {
              await openIosDocumentPicker();
          }
          // If successful (and not cancelled), effect in VaultContext will update activeVault
          // We can watch for activeVault change or just try to navigate if valid.
          // Ideally we wait for state update.
          // For simplicity, we assume if we are here and activeVault is set, we navigate.
      } catch (e) {
          alert('Failed to open folder: ' + String(e));
      }
  };

  // Effect to auto-redirect if vault becomes active (e.g. after pick)
  React.useEffect(() => {
      if (activeVault) {
          router.replace('/vault/home');
      }
  }, [activeVault]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView contentContainerStyle={styles.container}>

          <View style={styles.header}>
              <Avatar.Icon size={64} icon="safe" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.onPrimaryContainer} />
              <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
                  Liminal Notes
              </Text>
              <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                  Select a vault to begin
              </Text>
          </View>

          <View style={styles.content}>
            <Card style={styles.card} mode="outlined" onPress={handleOpenSandbox}>
                <Card.Title
                    title="Sandbox Vault"
                    subtitle="Private, local storage managed by the app."
                    left={(props) => <Avatar.Icon {...props} icon="package-variant-closed" />}
                />
            </Card>

            <View style={styles.spacer} />

            <Card style={styles.card} mode="outlined" onPress={handleOpenExternal}>
                <Card.Title
                    title={Platform.OS === 'android' ? "Open Folder (SAF)" : "Open Folder"}
                    subtitle="Use an existing folder on your device."
                    left={(props) => <Avatar.Icon {...props} icon="folder-open" />}
                />
                {Platform.OS === 'ios' && (
                    <Card.Content>
                        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                            Note: iOS external folder persistence requires native modules not yet fully implemented.
                            This is a preview.
                        </Text>
                    </Card.Content>
                )}
            </Card>
          </View>

          {isLoading && (
              <View style={styles.loader}>
                  <Text>Loading...</Text>
              </View>
          )}

        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
      alignItems: 'center',
      marginBottom: 48,
  },
  title: {
      marginTop: 16,
      fontWeight: 'bold',
  },
  subtitle: {
      marginTop: 8,
      textAlign: 'center',
  },
  content: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
  },
  card: {
      marginBottom: 16,
  },
  spacer: {
      height: 16,
  },
  loader: {
      position: 'absolute',
      bottom: 40,
      alignSelf: 'center',
  }
});
