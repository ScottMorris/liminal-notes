import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export interface FABAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface FABMenuProps {
  visible: boolean;
  onClose: () => void;
  actions: FABAction[];
}

export function FABMenu({ visible, onClose, actions }: FABMenuProps) {
  const { resolveColor } = useTheme();

  if (!visible) return null;

  const accentColor = resolveColor('--ln-accent');
  // Use background color for text/icon on accent-colored buttons (high contrast)
  const contrastColor = resolveColor('--ln-bg');

  // According to Material Speed Dial, the FAB transforms into a close button (or rotate)
  // We are simulating this by rendering the Close button exactly where the FAB was.

  // Position needs to match FAB.tsx: bottom: 24, right: 24, width: 56, height: 56.

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
         {/* Backdrop - tap to close */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.menuContainer}>
           {/* Actions stack above the close button */}
           <View style={styles.actionsStack}>
            {actions.map((action, index) => (
                <TouchableOpacity
                key={action.id}
                style={[styles.actionButton, { backgroundColor: accentColor }]}
                onPress={() => {
                    onClose();
                    requestAnimationFrame(() => action.onPress());
                }}
                activeOpacity={0.8}
                >
                <View style={styles.iconContainer}>
                    <Ionicons name={action.icon} size={24} color={contrastColor} />
                </View>
                <Text style={[styles.actionLabel, { color: contrastColor }]}>{action.label}</Text>
                </TouchableOpacity>
            ))}
          </View>

          {/* Close Button - positioned to overlay the original FAB */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: accentColor }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
             <Ionicons name="close" size={32} color={contrastColor} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    // We don't use justifyContent: flex-end here because we want precise positioning
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'flex-end', // Aligns children (stack and button) to the right
  },
  actionsStack: {
      marginBottom: 16, // Gap between actions and close button
      gap: 16,
      alignItems: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30, // Pill shape
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 140,
    justifyContent: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    width: 56,
    height: 56,
    borderRadius: 28, // Circle to match FAB
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    // No margin top needed, it's the anchor
  }
});
