import React from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useHomeData } from '../../src/hooks/useHomeData';
import { FocusedSection } from '../../src/components/home/FocusedSection';
import { FolderSection } from '../../src/components/home/FolderSection';
import { RecentSection } from '../../src/components/home/RecentSection';
import { FAB } from '../../src/components/FAB';
import { Text } from 'react-native';
import { MobileSandboxVaultAdapter } from '../../src/adapters/MobileSandboxVaultAdapter';

export default function HomeScreen() {
  const router = useRouter();
  const { pinned, recents, folders, loading, refresh } = useHomeData();

  const handleCreate = async () => {
    try {
      // Create new note logic
      const id = `Untitled ${Date.now()}.md`;
      const adapter = new MobileSandboxVaultAdapter();
      await adapter.init();
      // Write empty file
      await adapter.writeNote(id, '');

      // Navigate
      router.push(`/vault/note/${id}`);

      // Refresh home to show update if we return immediately?
      // Actually NoteScreen handles Recents update.
    } catch (e) {
      console.error('Failed to create note', e);
      Alert.alert('Error', 'Failed to create new note');
    }
  };

  const handleCreateOptions = () => {
      Alert.alert('Create New', 'Choose type', [
          { text: 'Note', onPress: handleCreate },
          { text: 'Cancel', style: 'cancel' }
      ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
            headerRight: () => (
                <TouchableOpacity onPress={() => router.push('/search')} style={styles.headerButton}>
                    <Text style={styles.headerButtonText}>🔍</Text>
                </TouchableOpacity>
            )
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.spacer} />

        <FocusedSection items={pinned} onRefresh={refresh} />
        <FolderSection folders={folders} onRefresh={refresh} />
        <RecentSection items={recents} onRefresh={refresh} />

        {/* Empty State */}
        {pinned.length === 0 && recents.length === 0 && folders.length === 0 && (
             <View style={styles.emptyState}>
                 <Text style={styles.emptyText}>Create your first note</Text>
             </View>
        )}
      </ScrollView>

      <FAB onPress={handleCreate} onLongPress={handleCreateOptions} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // TODO: Theme
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  spacer: {
      height: 16,
  },
  emptyState: {
      padding: 40,
      alignItems: 'center',
  },
  emptyText: {
      fontSize: 18,
      color: '#999',
  },
  headerButton: {
      padding: 8,
  },
  headerButtonText: {
      fontSize: 20,
  }
});
