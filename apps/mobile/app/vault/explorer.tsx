import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function ExplorerScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Explorer Screen Placeholder</Text>
      <View style={styles.buttonContainer}>
        <Button
          title="Open Test Note"
          onPress={() => router.push('/vault/note/test.md')}
        />
        <Button
          title="Open Sandbox Tests"
          onPress={() => router.push('/vault/sandbox')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
  }
});
