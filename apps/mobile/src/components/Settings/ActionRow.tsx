import React from 'react';
import { Button } from 'react-native-paper';
import { SettingsRow } from './SettingsRow';

interface ActionRowProps {
  label: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
  danger?: boolean;
}

export function ActionRow({ label, description, actionLabel, onAction, danger }: ActionRowProps) {
  return (
    <SettingsRow
      label={label}
      description={description}
      rightElement={
        <Button
            mode="text"
            onPress={onAction}
            textColor={danger ? '#FF3B30' : undefined}
            compact
        >
            {actionLabel}
        </Button>
      }
    />
  );
}
