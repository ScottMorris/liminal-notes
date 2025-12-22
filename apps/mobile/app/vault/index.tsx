import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function VaultHomeScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Vault Home</Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Open Explorer"
          onPress={() => router.push('/vault/explorer')}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Open Search"
          onPress={() => router.push('/search')}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Open Settings"
          onPress={() => router.push('/settings')}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Open Sample Note (123)"
          onPress={() => router.push({ pathname: '/vault/note/[id]', params: { id: '123' } })}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Sandbox Verification"
          onPress={() => router.push('/vault/sandbox')}
          color="#841584"
        />
      </View>
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
    marginBottom: 30,
  },
  buttonContainer: {
    marginVertical: 10,
    width: '100%',
    maxWidth: 300,
  },
});
