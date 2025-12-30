import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { FABMenu, FABAction } from './FABMenu';

interface FABProps {
  onPress: () => void;
  onLongPress?: () => void;
  actions?: FABAction[];
  style?: ViewStyle;
}

export function FAB({ onPress, onLongPress, actions, style }: FABProps) {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLongPress = () => {
    if (actions && actions.length > 0) {
      setMenuVisible(true);
    } else if (onLongPress) {
      onLongPress();
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={onPress}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>+</Text>
      </TouchableOpacity>

      {actions && (
        <FABMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          actions={actions}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000', // Uses theme later
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 999, // Ensure it sits above scroll content
  },
  icon: {
    color: '#fff',
    fontSize: 32,
    marginTop: -2,
    fontWeight: '300',
  },
});
