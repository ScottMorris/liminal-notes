import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Menu, Button, useTheme } from 'react-native-paper';
import { SettingsRow } from './SettingsRow';
import { useSettings } from '../../context/SettingsContext';
import { SettingOption } from '../../screens/Settings/schema';

interface SelectRowProps {
  label: string;
  description?: string;
  settingKey: string;
  options: SettingOption[];
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export function SelectRow({ label, description, settingKey, options }: SelectRowProps) {
  const { settings, updateSetting } = useSettings();
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  const value = getNestedValue(settings, settingKey);
  const selectedOption = options.find(o => o.value === value) || options[0];

  const handleSelect = (newValue: string) => {
    updateSetting(settingKey, newValue);
    setVisible(false);
  };

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  return (
    <SettingsRow
      label={label}
      description={description}
      rightElement={
          <Menu
            visible={visible}
            onDismiss={closeMenu}
            anchor={
              <Button mode="text" onPress={openMenu} compact>
                {selectedOption?.label || String(value)}
              </Button>
            }
          >
            {options.map((opt) => (
                <Menu.Item
                    key={opt.value}
                    onPress={() => handleSelect(opt.value)}
                    title={opt.label}
                    leadingIcon={opt.value === value ? "check" : undefined}
                />
            ))}
          </Menu>
      }
    />
  );
}
