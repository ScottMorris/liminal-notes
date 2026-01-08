import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { useTheme } from 'react-native-paper';

interface EditableHeaderTitleProps {
  title: string;
  onRename: (newName: string) => Promise<void>;
  disabled?: boolean;
}

export function EditableHeaderTitle({ title, onRename, disabled }: EditableHeaderTitleProps) {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const inputRef = useRef<TextInput>(null);
  const isCommittingRef = useRef(false);

  useEffect(() => {
    // Reset temp title if external title changes (e.g. navigation)
    // providing we are not currently editing it to avoid overwriting user input
    if (!isEditing) {
        setTempTitle(title);
    }
  }, [title, isEditing]);

  const handleStartEditing = () => {
    if (disabled) return;
    // Reset commit lock when starting new edit
    isCommittingRef.current = false;
    setTempTitle(title);
    setIsEditing(true);
    // Timeout to allow render to switch to TextInput before focusing
    setTimeout(() => {
        inputRef.current?.focus();
    }, 50);
  };

  const handleCommit = async () => {
    if (isCommittingRef.current) return;
    isCommittingRef.current = true;

    const trimmed = tempTitle.trim();
    if (!trimmed || trimmed === title) {
      cancelEditing();
      isCommittingRef.current = false;
      return;
    }

    try {
      await onRename(trimmed);
      setIsEditing(false);
      // Do NOT reset isCommittingRef here.
      // Successful rename will likely trigger unmount or navigation.
      // If we reset, a pending onBlur might fire and cause a double-rename error.
      // We rely on the component unmounting or re-initializing to reset the ref.
      // Or if we stay mounted, handleStartEditing will re-enable it (if we were to add logic there,
      // but actually since we set isEditing(false), the input is removed, so onBlur/onSubmit won't fire again on THAT input).
      // However, onBlur fires *before* the state update processes sometimes.
      // Letting the Ref stay true prevents the second event.
      // We only reset on error.
    } catch (e: any) {
      Alert.alert('Rename Failed', e.message || 'Unknown error');
      // Keep editing state so user can fix it
      inputRef.current?.focus();
      isCommittingRef.current = false;
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setTempTitle(title);
  };

  if (isEditing) {
    return (
      <View style={styles.container}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: theme.colors.onSurface,
              backgroundColor: theme.colors.elevation.level2,
              borderColor: theme.colors.primary,
            }
          ]}
          value={tempTitle}
          onChangeText={setTempTitle}
          onBlur={handleCommit}
          onSubmitEditing={handleCommit}
          returnKeyType="done"
          autoCapitalize="sentences"
          selectTextOnFocus
        />
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handleStartEditing}
      style={styles.container}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text
        style={[
            styles.text,
            { color: theme.colors.onSurface }
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
});
