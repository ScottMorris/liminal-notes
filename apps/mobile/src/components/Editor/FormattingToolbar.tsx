import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Keyboard, Platform, KeyboardEvent } from 'react-native';
import { useTheme } from 'react-native-paper';
import { EditorCommand } from '@liminal-notes/core-shared/mobile/editorProtocol';
import type { EditorViewRef } from '../EditorView';

interface FormattingToolbarProps {
  editorRef: React.RefObject<EditorViewRef>;
}

const TOOLBAR_HEIGHT = 44;

export function FormattingToolbar({ editorRef }: FormattingToolbarProps) {
  const theme = useTheme();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = () => setKeyboardVisible(true);
    const onHide = () => setKeyboardVisible(false);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleCommand = (id: string) => {
    if (editorRef.current) {
      editorRef.current.sendCommand(EditorCommand.Execute, { id });
    }
  };

  if (!isKeyboardVisible) return null;

  return (
    <View style={[styles.container, {
      backgroundColor: theme.colors.elevation.level2,
      borderTopColor: theme.colors.outlineVariant
    }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity style={styles.button} onPress={() => handleCommand('editor.format.bold')}>
          <Text style={[styles.buttonText, { color: theme.colors.onSurface }]}>B</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleCommand('editor.format.italic')}>
          <Text style={[styles.buttonText, { color: theme.colors.onSurface, fontStyle: 'italic' }]}>I</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleCommand('editor.format.strikethrough')}>
          <Text style={[styles.buttonText, { color: theme.colors.onSurface, textDecorationLine: 'line-through' }]}>S</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleCommand('editor.format.highlight')}>
          <Text style={[styles.buttonText, { color: theme.colors.onSurface }]}>H</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleCommand('editor.format.code')}>
          <Text style={[styles.buttonText, { color: theme.colors.onSurface }]}>{`</>`}</Text>
        </TouchableOpacity>
        <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />
        <TouchableOpacity style={styles.button} onPress={() => handleCommand('editor.insert.codeblock')}>
          <Text style={[styles.buttonText, { color: theme.colors.onSurface }]}>CB</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleCommand('editor.insert.callout')}>
          <Text style={[styles.buttonText, { color: theme.colors.onSurface }]}>Quote</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleCommand('editor.format.clear')}>
          <Text style={[styles.buttonText, { color: theme.colors.onSurface }]}>Clear</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: TOOLBAR_HEIGHT,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  scrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  }
});
