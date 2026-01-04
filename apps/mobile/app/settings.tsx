import React from 'react';
import { StyleSheet, FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { List, useTheme, Text, Divider } from 'react-native-paper'; // Use Paper
import { getSections, SettingsSectionDef } from '../src/screens/Settings/schema';
import { useVault } from '../src/context/VaultContext';

// Hardcode version for MVP or read from package.json
const APP_VERSION = '0.1.0';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeVault } = useVault();

  const vaultName = activeVault?.vaultId === 'sandbox' ? 'Sandbox Vault' : (activeVault?.vaultId || 'None');
  const sections = getSections(APP_VERSION, vaultName);

  const renderItem = ({ item }: { item: SettingsSectionDef }) => {
    return (
      <React.Fragment>
          <List.Item
            title={item.title}
            onPress={() => router.push({ pathname: '/settings/[section]', params: { section: item.id } })}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.primary} />} // Theme-colored arrow
            style={{ backgroundColor: theme.colors.surface }}
            titleStyle={{ color: theme.colors.onSurface }}
          />
          <Divider />
      </React.Fragment>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={sections}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
