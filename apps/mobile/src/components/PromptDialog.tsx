import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Button, Dialog, Portal, TextInput, useTheme } from 'react-native-paper';

interface PromptDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  inputType?: 'default' | 'plain-text' | 'secure-text'; // mimic Alert.prompt
  onClose: () => void;
  onSubmit: (text: string) => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function PromptDialog({
  visible,
  title,
  message,
  defaultValue = '',
  placeholder = '',
  onClose,
  onSubmit,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel'
}: PromptDialogProps) {
  const [text, setText] = useState(defaultValue);
  const theme = useTheme();

  useEffect(() => {
    if (visible) {
      setText(defaultValue);
    }
  }, [visible, defaultValue]);

  const handleSubmit = () => {
    onSubmit(text);
    onClose();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={{ backgroundColor: theme.colors.surface }}>
        <Dialog.Title style={{ color: theme.colors.onSurface }}>{title}</Dialog.Title>
        <Dialog.Content>
          {message && <Dialog.ScrollArea style={{ marginBottom: 10 }}><Text style={{ color: theme.colors.onSurfaceVariant }}>{message}</Text></Dialog.ScrollArea>}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            autoFocus
            mode="outlined"
            textColor={theme.colors.onSurface}
            style={{ backgroundColor: theme.colors.surface }}
            theme={{ colors: { primary: theme.colors.primary } }}
            // For older Paper versions
            selectionColor={theme.colors.primary}
            onSubmitEditing={handleSubmit}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose} textColor={theme.colors.secondary}>{cancelLabel}</Button>
          <Button onPress={handleSubmit} textColor={theme.colors.primary}>{confirmLabel}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

// Helper Text component since importing React Native Text inside ScrollArea might be verbose
import { Text } from 'react-native';
