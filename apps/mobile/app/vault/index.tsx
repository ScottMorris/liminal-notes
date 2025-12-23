import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useVault } from '../../src/context/VaultContext';

export default function VaultPickerScreen() {
  const router = useRouter();
  const { openSandboxVault, isLoading } = useVault();

  const handleOpenSandbox = async () => {
    try {
      await openSandboxVault();
      router.replace('/vault/explorer');
    } catch (e) {
      console.error('Failed to open sandbox vault', e);
      alert('Failed to open sandbox vault');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Welcome to Liminal Notes</Text>
      <Text style={styles.subtitle}>Select a vault to get started.</Text>

      <View style={styles.buttonContainer}>
        <Button
          title={isLoading ? "Opening..." : "Open Sandbox Vault"}
          onPress={handleOpenSandbox}
          disabled={isLoading}
        />
      </View>

      {/* Placeholder for future external vault options */}
      {/*
      <View style={styles.buttonContainer}>
        <Button
          title="Choose Folder..."
          disabled={true}
          onPress={() => {}}
        />
      </View>
      */}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    marginVertical: 10,
    width: '100%',
    maxWidth: 300,
  },
});
