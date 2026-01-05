import React, { useState } from 'react';
import { Modal, View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, Surface } from 'react-native-paper';

interface PromptModalProps {
  visible: boolean;
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}

export function PromptModal({
  visible,
  title,
  message,
  defaultValue = '',
  placeholder = '',
  onCancel,
  onSubmit,
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const theme = useTheme();

  const handleSubmit = () => {
    onSubmit(value);
    setValue(defaultValue); // Reset for next time
  };

  const handleCancel = () => {
    onCancel();
    setValue(defaultValue);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Surface style={[styles.dialog, { backgroundColor: theme.colors.elevation.level3 }]} elevation={5}>
          <Text variant="headlineSmall" style={styles.title}>{title}</Text>
          {message && <Text variant="bodyMedium" style={styles.message}>{message}</Text>}

          <TextInput
            mode="outlined"
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            autoFocus
            style={styles.input}
          />

          <View style={styles.buttons}>
            <Button onPress={handleCancel} style={styles.button}>Cancel</Button>
            <Button onPress={handleSubmit} mode="contained" style={styles.button}>OK</Button>
          </View>
        </Surface>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    borderRadius: 28, // Material 3 Dialog shape
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 16,
    opacity: 0.7,
  },
  input: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    minWidth: 80,
  },
});
