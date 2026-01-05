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

  const bgColour = resolveColor('--ln-accent');
  const fgColour = resolveColor('--ln-bg');
  const labelColour = resolveColor('--ln-fg');

  if (actions && actions.length > 0) {
      const groupActions = actions.map(a => ({
          icon: a.icon,
          label: a.label,
          onPress: a.onPress,
          style: { backgroundColor: 'white' }, // Actions usually need contrast
          color: bgColour,
          labelStyle: { color: labelColour },
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
                  fabStyle={{ backgroundColor: bgColour }}
                  color={fgColour}
                  backdropColor="rgba(0,0,0,0.5)"
              />
          </Portal>
      );
  }

  return (
    <PaperFAB
      icon="plus"
      style={[styles.fab, { backgroundColor: bgColour }, style]}
      color={fgColour}
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
