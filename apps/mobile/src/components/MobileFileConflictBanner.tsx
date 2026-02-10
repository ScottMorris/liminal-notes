import React from 'react';
import { Surface, Button, Text, useTheme } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';

interface Props {
  onReload: () => void;
  onKeepMine: () => void;
  onDismiss: () => void;
}

export function MobileFileConflictBanner({ onReload, onKeepMine, onDismiss }: Props) {
  const theme = useTheme();

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.errorContainer }]} elevation={2}>
      <View style={styles.content}>
        <Text variant="titleSmall" style={{ color: theme.colors.onErrorContainer, fontWeight: 'bold' }}>
          External Change Detected
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
          This file has been modified on disk.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          mode="contained"
          compact
          onPress={onReload}
          style={styles.button}
          labelStyle={{ fontSize: 12 }}
          buttonColor={theme.colors.error}
          textColor={theme.colors.onError}
        >
          Reload
        </Button>
        <Button
          mode="outlined"
          compact
          onPress={onKeepMine}
          style={styles.button}
          labelStyle={{ fontSize: 12 }}
          textColor={theme.colors.onErrorContainer}
        >
          Keep Mine
        </Button>
        <Button
          mode="text"
          compact
          onPress={onDismiss}
          style={styles.button}
          labelStyle={{ fontSize: 12 }}
          textColor={theme.colors.onErrorContainer}
        >
          Dismiss
        </Button>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    margin: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    flexWrap: 'wrap'
  },
  button: {
    marginRight: 0,
  }
});
