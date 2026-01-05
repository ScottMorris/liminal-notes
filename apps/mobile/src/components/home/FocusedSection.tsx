import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { List, Text, useTheme, Surface } from 'react-native-paper';
import { PinnedItem, pinnedStorage } from '../../storage/pinned';

interface FocusedSectionProps {
  items: PinnedItem[];
  onRefresh: () => void;
}

export function FocusedSection({ items, onRefresh }: FocusedSectionProps) {
  const router = useRouter();
  const theme = useTheme();

  if (items.length === 0) return null;

  const handlePress = (item: PinnedItem) => {
    if (item.type === 'note') {
      router.push(`/vault/note/${item.id}`);
    } else {
      router.push({ pathname: '/vault/explorer', params: { folder: item.id } });
    }
  };

  const handleLongPress = (item: PinnedItem) => {
    Alert.alert(
      'Pinned Item',
      `Unpin "${item.id}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpin',
          style: 'destructive',
          onPress: async () => {
            await pinnedStorage.unpin(item.id);
            onRefresh();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Focused</Text>
      <Surface style={styles.list} elevation={1}>
        {items.map((item, index) => (
          <List.Item
            key={item.id}
            title={item.id}
            left={props => <List.Icon {...props} icon={item.type === 'folder' ? 'folder-outline' : 'file-document-outline'} />}
            onPress={() => handlePress(item)}
            onLongPress={() => handleLongPress(item)}
            style={index < items.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.outlineVariant } : undefined}
          />
        ))}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
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
