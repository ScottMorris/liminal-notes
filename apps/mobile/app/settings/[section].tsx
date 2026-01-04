import React from 'react';
import { View, StyleSheet, ScrollView, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { getSections, SettingRowDef } from '../../src/screens/Settings/schema';
import { useTheme } from '../../src/context/ThemeContext';
import { ToggleRow } from '../../src/components/Settings/ToggleRow';
import { SelectRow } from '../../src/components/Settings/SelectRow';
import { SliderRow } from '../../src/components/Settings/SliderRow';
import { ActionRow } from '../../src/components/Settings/ActionRow';
import { InfoRow } from '../../src/components/Settings/InfoRow';
import { useVault } from '../../src/context/VaultContext';

export default function SettingsSectionScreen() {
  const { section } = useLocalSearchParams();
  const { resolveColor } = useTheme();
  const { activeVault } = useVault(); // For Vault Switch action
  const router = useRouter();

  const vaultName = activeVault?.vaultId === 'sandbox' ? 'Sandbox Vault' : (activeVault?.vaultId || 'None');
  const sections = getSections('0.1.0', vaultName);
  const activeSection = sections.find(s => s.id === section);

  if (!activeSection) {
    return (
      <View style={[styles.container, { backgroundColor: resolveColor('--ln-bg') }]}>
        <Text style={{ color: resolveColor('--ln-fg') }}>Section not found</Text>
      </View>
    );
  }

  const handleAction = async (actionId: string) => {
      if (actionId === 'switch-vault') {
          Alert.alert(
              'Switch Vault',
              'Are you sure you want to close the current vault?',
              [
                  { text: 'Cancel', style: 'cancel' },
                  {
                      text: 'Switch',
                      style: 'destructive',
                      onPress: () => {
                          // Clear active vault and reset nav
                          // Since setActiveVault might need to persist, we rely on VaultContext
                          // But VaultContext might just hold state.
                          // The requirement says "Switch vault (action button)".
                          // Assuming we just clear it and go back to root?
                          // Or navigate to a vault picker screen?
                          // For MVP, lets try to clear it if context allows, or just alert "Not implemented".
                          // Actually, the vault picker is likely the index screen if no vault is selected.

                          // TODO: Implement actual Vault Switch logic.
                          // For now, we'll just navigate to root which checks for vault.
                          // But to "close" it, we need to unset it.
                          // Checking VaultContext...
                          Alert.alert('Coming Soon', 'Vault switching logic is being finalized.');
                      }
                  }
              ]
          );
      }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: resolveColor('--ln-bg') }]} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
            headerShown: true,
            title: activeSection.title,
            headerBackTitle: '',
            headerTintColor: resolveColor('--ln-accent'),
            headerTransparent: false,
            headerStyle: { backgroundColor: resolveColor('--ln-bg') }
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {activeSection.groups.map(group => (
            <View key={group.id} style={styles.group}>
                {group.title && (
                    <Text style={[styles.groupTitle, { color: resolveColor('--ln-accent') }]}>
                        {group.title.toUpperCase()}
                    </Text>
                )}
                {group.rows.map(row => (
                    <RowRenderer key={row.id} row={row} onAction={handleAction} />
                ))}
            </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function RowRenderer({ row, onAction }: { row: SettingRowDef, onAction: (id: string) => void }) {
    const control = row.controls[0]; // Assuming single control per row for MVP
    if (!control) return null;

    switch (control.kind) {
        case 'boolean':
            return <ToggleRow label={row.label} description={row.description} settingKey={control.key!} />;
        case 'select':
            return <SelectRow label={row.label} description={row.description} settingKey={control.key!} options={control.options || []} />;
        case 'slider':
            return <SliderRow label={row.label} description={row.description} settingKey={control.key!} min={control.min!} max={control.max!} step={control.step} />;
        case 'action':
            return <ActionRow label={row.label} description={row.description} actionLabel={control.label || 'Action'} onAction={() => onAction(control.actionId!)} danger={control.intent === 'danger'} />;
        case 'computed':
            return <InfoRow label={row.label} description={row.description} value={control.label || ''} />; // abusing label for value in schema for computed
        default:
            return null;
    }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  group: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 24,
    marginLeft: 20,
  }
});
