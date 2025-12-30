import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  if (!visible) return null;

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
          {actions.map((action, index) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionButton}
              onPress={() => {
                onClose();
                requestAnimationFrame(() => action.onPress());
              }}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                 <Ionicons name={action.icon} size={24} color="#000" />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
             <Ionicons name="close" size={32} color="#000" />
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
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'flex-end',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9F9EFF', // Lavender/Periwinkle
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
    color: '#000',
  },
  closeButton: {
    width: 56,
    height: 56,
    borderRadius: 20, // Squarish rounded
    backgroundColor: '#9F9EFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    marginTop: 8,
  }
});
