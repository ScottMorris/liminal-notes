import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useVault } from '../src/context/VaultContext';

export default function Index() {
  const { activeVault, isLoading } = useVault();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (activeVault) {
    return <Redirect href="/vault/explorer" />;
  }

  return <Redirect href="/vault" />;
}
