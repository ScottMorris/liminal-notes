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
}

export function FAB({ onPress, actions, style }: FABProps) {
  const [open, setOpen] = useState(false);
  const { resolveColor } = useTheme();

  const bgColor = resolveColor('--ln-accent');
  const fgColor = resolveColor('--ln-bg');

  // If actions are provided, we use FAB.Group
  // Note: FAB.Group handles its own state for open/close usually,
  // but we can control it if we want.

  if (actions && actions.length > 0) {
      // Paper FAB.Group expects actions to be { icon, label, onPress }
      // We map our actions to Paper's format
      const groupActions = actions.map(a => ({
          icon: a.icon,
          label: a.label,
          onPress: a.onPress,
          style: { backgroundColor: 'white' }, // Optional: style individual action buttons
          color: bgColor, // Icon color
          labelStyle: { color: 'black' }, // Label text color
      }));

      return (
          <Portal>
              <PaperFAB.Group
                  open={open}
                  visible
                  icon={open ? 'close' : 'plus'}
                  actions={groupActions}
                  onStateChange={({ open }) => setOpen(open)}
                  onPress={() => {
                      if (open) {
                          // Closing is handled by state change
                      }
                      // If closed, it opens.
                      // Note: Paper FAB.Group treats the main button as the toggler.
                      // If we want the main button to do something else when closed (like quick add),
                      // Paper doesn't support "Single tap for action, Long press for menu" easily on the Group component itself
                      // without custom logic or just accepting the speed dial pattern.
                      //
                      // Current app behavior: Tap -> Create Note. Long Press -> Menu.
                      //
                      // Paper FAB.Group standard behavior: Tap -> Open Menu.
                      //
                      // To maintain "Tap to create note", we might need to separate them
                      // or adopt the Speed Dial pattern fully (Tap -> Open Menu -> Select "New Note").
                      //
                      // "Update mobile app to use _Paper_ for native-like UI elements" implies adopting standard patterns.
                      // Standard Material Speed Dial: Main button toggles menu.
                      //
                      // However, if the user wants "Quick Note" + "Menu", maybe we just use the menu actions.
                      //
                      // Let's adopt the standard Speed Dial for now: Tap opens menu.
                      // One of the actions should be "New Note".
                  }}
                  fabStyle={{ backgroundColor: bgColor }}
                  color={fgColor}
                  backdropColor="rgba(0,0,0,0.5)"
              />
          </Portal>
      );
  }

  // Fallback for single action (though currently we always have actions in Home)
  return (
    <PaperFAB
      icon="plus"
      style={[styles.fab, { backgroundColor: bgColor }, style]}
      color={fgColor}
      onPress={onPress}
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
