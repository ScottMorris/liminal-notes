import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { List, Surface, Text, useTheme } from 'react-native-paper';
import { RecentItem } from '../../storage/recents';
import { pinnedStorage } from '../../storage/pinned';

interface RecentSectionProps {
  items: RecentItem[];
  onRefresh: () => void;
}

export function RecentSection({ items, onRefresh }: RecentSectionProps) {
  const router = useRouter();
  const theme = useTheme();

  if (items.length === 0) return null;

  const handlePress = (id: string) => {
    // Encode path to handle nested folders
    router.push(`/vault/note/${encodeURIComponent(id)}`);
  };

  const handleLongPress = (id: string) => {
    Alert.alert(
      'Recent Note',
      `Options for "${id}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pin Note',
          onPress: async () => {
            await pinnedStorage.pin(id, 'note');
            onRefresh();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Resume</Text>
      <Surface style={styles.list} elevation={1}>
        {items.map((item, index) => (
          <List.Item
            key={item.id}
            title={item.id}
            description={new Date(item.openedAt).toLocaleDateString()}
            left={props => <List.Icon {...props} icon="file-document-outline" />}
            onPress={() => handlePress(item.id)}
            onLongPress={() => handleLongPress(item.id)}
            style={index < items.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.outlineVariant } : undefined}
          />
        ))}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 80, // Space for FAB
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  list: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
