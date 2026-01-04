import React from 'react';
import { Text } from 'react-native';
import { SettingsRow } from './SettingsRow';
import { useTheme } from '../../context/ThemeContext';

interface InfoRowProps {
  label: string;
  description?: string;
  value: string;
}

export function InfoRow({ label, description, value }: InfoRowProps) {
  const { resolveColor } = useTheme();

  return (
    <SettingsRow
      label={label}
      description={description}
      rightElement={
          <Text style={{ color: resolveColor('--ln-fg-muted'), fontSize: 16 }}>{value}</Text>
      }
    />
  );
}
