import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { PinnedItem, pinnedStorage } from '../../storage/pinned';

interface FocusedSectionProps {
  items: PinnedItem[];
  onRefresh: () => void;
}

export function FocusedSection({ items, onRefresh }: FocusedSectionProps) {
  const router = useRouter();

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
      <Text style={styles.sectionTitle}>Focused</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => handlePress(item)}
            onLongPress={() => handleLongPress(item)}
          >
            <Text style={styles.icon}>{item.type === 'folder' ? '📁' : '📝'}</Text>
            <Text style={styles.label} numberOfLines={1}>{item.id}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  list: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  icon: {
    marginRight: 8,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});
