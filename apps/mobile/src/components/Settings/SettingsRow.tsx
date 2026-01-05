import React from 'react';
import { List, useTheme } from 'react-native-paper';

interface SettingsRowProps {
  label: string;
  description?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
}

export function SettingsRow({ label, description, rightElement, onPress }: SettingsRowProps) {
  const theme = useTheme();

  return (
    <List.Item
      title={label}
      description={description}
      onPress={onPress}
      right={() => rightElement ? <>{rightElement}</> : null}
      titleStyle={{ color: theme.colors.onBackground }}
      descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
      style={{
        borderBottomColor: theme.colors.outlineVariant,
        borderBottomWidth: 1, // Using 1 pixel for consistency with List.Item separator or standard RN look
        // However, standard List.Item doesn't enforce border. But settings lists often have them.
        // Let's use StyleSheet.hairlineWidth if we want it fine.
      }}
      // List.Item handles background color transparently or via theme, which matches our need.
    />
  );
}
