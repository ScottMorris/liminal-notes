import React, { useState } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { FAB as PaperFAB, Portal } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';

export interface FABAction {
  id: string;
  label: string;
  icon: string; // Paper icons are strings
  onPress: () => void;
}

interface FABProps {
  onPress: () => void;
  actions?: FABAction[];
  style?: ViewStyle;
  visible?: boolean;
}

export function FAB({ onPress, actions, style, visible = true }: FABProps) {
  const [open, setOpen] = useState(false);
  const { resolveColor } = useTheme();

  const bgColor = resolveColor('--ln-accent');
  const fgColor = resolveColor('--ln-bg');

  if (actions && actions.length > 0) {
      const groupActions = actions.map(a => ({
          icon: a.icon,
          label: a.label,
          onPress: a.onPress,
          style: { backgroundColor: 'white' }, // Actions usually need contrast
          color: bgColor,
          labelStyle: { color: 'black' },
      }));

      return (
          <Portal>
              <PaperFAB.Group
                  open={open}
                  visible={visible}
                  icon={open ? 'close' : 'plus'}
                  actions={groupActions}
                  onStateChange={({ open }) => setOpen(open)}
                  // Removed 'onPress' prop to allow default toggle behavior
                  fabStyle={{ backgroundColor: bgColor }}
                  color={fgColor}
                  backdropColor="rgba(0,0,0,0.5)"
              />
          </Portal>
      );
  }

  return (
    <PaperFAB
      icon="plus"
      style={[styles.fab, { backgroundColor: bgColor }, style]}
      color={fgColor}
      onPress={onPress}
      visible={visible}
    />
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});
