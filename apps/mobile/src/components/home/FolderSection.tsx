import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Card, useTheme } from 'react-native-paper';
import { FolderActivity } from '../../indexing/sqlite/SQLiteSearchIndex';
import { pinnedStorage } from '../../storage/pinned';

interface FolderSectionProps {
  folders: FolderActivity[];
  onRefresh: () => void;
}

export function FolderSection({ folders, onRefresh }: FolderSectionProps) {
  const router = useRouter();
  const theme = useTheme();

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
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Spaces</Text>
      <View style={styles.grid}>
        {folders.map((f) => (
          <Card
            key={f.path}
            style={styles.card}
            onPress={() => handlePress(f.path)}
            onLongPress={() => handleLongPress(f.path)}
            mode="outlined"
          >
            <Card.Content style={styles.cardContent}>
                <View>
                    <Text variant="titleMedium" numberOfLines={1}>{f.path}</Text>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {f.noteCount} notes
                </Text>
            </Card.Content>
          </Card>
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
    minHeight: 80,
  },
  cardContent: {
      flex: 1,
      justifyContent: 'space-between',
  }
});
