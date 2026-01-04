import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getSections } from '../src/screens/Settings/schema';
import { useTheme } from '../src/context/ThemeContext';
import { SettingsSectionDef } from '../src/screens/Settings/schema';
import { useVault } from '../src/context/VaultContext';

// Hardcode version for MVP or read from package.json
const APP_VERSION = '0.1.0';

export default function SettingsScreen() {
  const router = useRouter();
  const { resolveColor } = useTheme();
  const { activeVault } = useVault();

  const vaultName = activeVault?.vaultId === 'sandbox' ? 'Sandbox Vault' : (activeVault?.vaultId || 'None');
  const sections = getSections(APP_VERSION, vaultName);

  const renderItem = ({ item }: { item: SettingsSectionDef }) => {
    return (
      <TouchableOpacity
        style={[styles.item, { borderBottomColor: resolveColor('--ln-border') }]}
        onPress={() => router.push({ pathname: '/settings/[section]', params: { section: item.id } })}
      >
        <Text style={[styles.itemText, { color: resolveColor('--ln-fg') }]}>{item.title}</Text>
        <Text style={[styles.arrow, { color: resolveColor('--ln-fg-muted') }]}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: resolveColor('--ln-bg') }]} edges={['bottom', 'left', 'right']}>
      <FlatList
        data={sections}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: 17,
  },
  arrow: {
    fontSize: 20,
    fontWeight: 'bold',
  }
});
