import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SettingsRow } from './SettingsRow';
import { useTheme } from '../../context/ThemeContext';

interface ActionRowProps {
  label: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
  danger?: boolean;
}

export function ActionRow({ label, description, actionLabel, onAction, danger }: ActionRowProps) {
  const { resolveColor } = useTheme();

  const color = danger ? '#FF3B30' : resolveColor('--ln-accent');

  return (
    <SettingsRow
      label={label}
      description={description}
      rightElement={
        <TouchableOpacity onPress={onAction} style={styles.button}>
            <Text style={[styles.buttonText, { color }]}>{actionLabel}</Text>
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
    button: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    }
});
