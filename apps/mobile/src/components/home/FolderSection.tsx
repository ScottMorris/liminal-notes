import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { FolderActivity } from '../../indexing/sqlite/SQLiteSearchIndex';
import { pinnedStorage } from '../../storage/pinned';

interface FolderSectionProps {
  folders: FolderActivity[];
  onRefresh: () => void;
}

export function FolderSection({ folders, onRefresh }: FolderSectionProps) {
  const router = useRouter();

  if (folders.length === 0) return null;

  const handlePress = (folder: string) => {
    router.push({ pathname: '/vault/explorer', params: { folder } });
  };

  const handleLongPress = (folder: string) => {
      // Option to pin folder
      import('react-native').then(({ Alert }) => {
          Alert.alert(
            'Folder Options',
            `Manage "${folder}"`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Pin Folder',
                onPress: async () => {
                  await pinnedStorage.pin(folder, 'folder');
                  onRefresh();
                }
              }
            ]
          );
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Spaces</Text>
      <View style={styles.grid}>
        {folders.map((f) => (
          <TouchableOpacity
            key={f.path}
            style={styles.card}
            onPress={() => handlePress(f.path)}
            onLongPress={() => handleLongPress(f.path)}
          >
            <View style={styles.header}>
                <Text style={styles.icon}>📁</Text>
                <Text style={styles.title} numberOfLines={1}>{f.path}</Text>
            </View>
            <Text style={styles.meta}>
              {f.noteCount} notes
            </Text>
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
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%', // roughly 2 columns
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    justifyContent: 'space-between',
  },
  header: {
      marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    color: '#888',
  },
});
