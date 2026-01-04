import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface SettingsRowProps {
  label: string;
  description?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function SettingsRow({ label, description, rightElement, onPress, style }: SettingsRowProps) {
  const { resolveColor } = useTheme();

  const textColor = resolveColor('--ln-fg');
  const descColor = resolveColor('--ln-fg-muted'); // Assuming this exists or similar
  const borderBottomColor = resolveColor('--ln-border');

  return (
    <Pressable
        onPress={onPress}
        style={({ pressed }) => [
            styles.container,
            { borderBottomColor },
            pressed && onPress ? { opacity: 0.7 } : {},
            style
        ]}
    >
      <View style={styles.content}>
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        {description && (
          <Text style={[styles.description, { color: descColor }]}>{description}</Text>
        )}
      </View>
      {rightElement && (
        <View style={styles.right}>
          {rightElement}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  content: {
    flex: 1,
    paddingRight: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    opacity: 0.7,
  },
  right: {
    // minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  }
});
