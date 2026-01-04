import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface SettingsRowProps {
  label: string;
  description?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
}

export function SettingsRow({ label, description, rightElement, onPress }: SettingsRowProps) {
  const theme = useTheme();

  if (onPress) {
      return (
        <TouchableOpacity
            style={[styles.container, { borderBottomColor: theme.colors.outlineVariant }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
          <RowContent label={label} description={description} rightElement={rightElement} theme={theme} />
        </TouchableOpacity>
      );
  }

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.outlineVariant }]}>
      <RowContent label={label} description={description} rightElement={rightElement} theme={theme} />
    </View>
  );
}

function RowContent({ label, description, rightElement, theme }: any) {
    return (
      <>
        <View style={styles.textContainer}>
            <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>{label}</Text>
            {description && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {description}
            </Text>
            )}
        </View>
        {rightElement && (
            <View style={styles.rightContainer}>
            {rightElement}
            </View>
        )}
      </>
    );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  rightContainer: {
    // optional alignment
  },
});
