import { View, Text, StyleSheet } from 'react-native';

export default function ExplorerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Explorer Screen Placeholder</Text>
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
  },
});
