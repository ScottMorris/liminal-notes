import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

interface FABProps {
  onPress: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
}

export function FAB({ onPress, onLongPress, style }: FABProps) {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>+</Text>
    </TouchableOpacity>
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
  },
  icon: {
    color: '#fff',
    fontSize: 32,
    marginTop: -2,
    fontWeight: '300',
  },
});
