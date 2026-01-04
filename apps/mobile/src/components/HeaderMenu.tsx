import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export interface HeaderMenuAction {
  id: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface HeaderMenuProps {
  visible: boolean;
  onClose: () => void;
  actions: HeaderMenuAction[];
}

export function HeaderMenu({ visible, onClose, actions }: HeaderMenuProps) {
  const { resolveColor } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const bg = resolveColor('--ln-menu-bg') || resolveColor('--ln-bg') || '#fff';
  const fg = resolveColor('--ln-menu-fg') || resolveColor('--ln-fg') || '#000';
  const border = resolveColor('--ln-border') || '#ccc';

  // Calculate top position
  // Header height is typically 44 (iOS) or 56 (Android).
  // Status bar is insets.top.
  // We want it to appear just below the header.
  const headerHeight = Platform.OS === 'android' ? 56 : 44;
  const topOffset = insets.top + headerHeight;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.menuContainer, { top: topOffset, backgroundColor: bg, borderColor: border }]}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={[
                    styles.menuItem,
                    index < actions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border }
                ]}
                onPress={() => {
                  onClose();
                  setTimeout(action.onPress, 50);
                }}
              >
                <Text style={[
                    styles.menuItemText,
                    { color: action.destructive ? '#FF3B30' : fg }
                ]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  menuContainer: {
    position: 'absolute',
    right: 10,
    minWidth: 180,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 16,
  },
});
