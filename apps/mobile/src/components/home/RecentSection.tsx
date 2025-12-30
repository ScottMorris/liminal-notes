import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { RecentItem } from '../../storage/recents';
import { pinnedStorage } from '../../storage/pinned';

interface RecentSectionProps {
  items: RecentItem[];
  onRefresh: () => void;
}

export function RecentSection({ items, onRefresh }: RecentSectionProps) {
  const router = useRouter();

  if (items.length === 0) return null;

  const handlePress = (id: string) => {
    router.push(`/vault/note/${id}`);
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
      <Text style={styles.sectionTitle}>Resume</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.row}
            onPress={() => handlePress(item.id)}
            onLongPress={() => handleLongPress(item.id)}
          >
            <Text style={styles.icon}>📄</Text>
            <View style={styles.content}>
              <Text style={styles.title} numberOfLines={1}>{item.id}</Text>
              <Text style={styles.meta}>
                 {/* TODO: Format relative time */}
                 {new Date(item.openedAt).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  list: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  icon: {
    fontSize: 18,
    marginRight: 12,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: '#999',
  },
});
