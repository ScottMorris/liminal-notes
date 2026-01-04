import React from 'react';
import { Switch } from 'react-native';
import { SettingsRow } from './SettingsRow';
import { useSettings } from '../../context/SettingsContext';

interface ToggleRowProps {
  label: string;
  description?: string;
  settingKey: string;
}

// Helper to get nested value
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export function ToggleRow({ label, description, settingKey }: ToggleRowProps) {
  const { settings, updateSetting } = useSettings();

  const value = getNestedValue(settings, settingKey);

  const handleValueChange = (newValue: boolean) => {
    updateSetting(settingKey, newValue);
  };

  return (
    <SettingsRow
      label={label}
      description={description}
      rightElement={
        <Switch value={!!value} onValueChange={handleValueChange} />
      }
    />
  );
}
