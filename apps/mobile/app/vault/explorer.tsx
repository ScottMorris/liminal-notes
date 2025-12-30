import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Button, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { MobileSandboxVaultAdapter } from '../../src/adapters/MobileSandboxVaultAdapter';
import type { VaultFileEntry } from '@liminal-notes/vault-core/types';
import { FAB } from '../../src/components/FAB';
import { PromptModal } from '../../src/components/PromptModal';
import { FABAction } from '../../src/components/FABMenu';

export default function ExplorerScreen() {
  const router = useRouter();
  const { folder } = useLocalSearchParams<{ folder?: string }>();
  const currentPath = folder || '';

  const [items, setItems] = useState<VaultFileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFolderPromptVisible, setIsFolderPromptVisible] = useState(false);

  // useFocusEffect to refresh data when screen becomes active (e.g. back from note or subfolder)
  useFocusEffect(
    useCallback(() => {
      loadFiles();
    }, [currentPath])
  );

  const loadFiles = async () => {
    // Don't set loading to true on refresh to avoid flickering, only on initial mount or path change
    // But since we use same function, maybe check if items is empty?
    // Actually, fast refresh is better.
    try {
        const adapter = new MobileSandboxVaultAdapter();
        await adapter.init();
        const allFiles = await adapter.listFiles();

        const entries = new Map<string, VaultFileEntry>();

        for (const file of allFiles) {
            const relPath = file.id;

            if (currentPath && !relPath.startsWith(currentPath + '/')) continue;

            const relativeToFolder = currentPath ? relPath.slice(currentPath.length + 1) : relPath;
            // Filter out exact match (the folder itself if listed)
            if (!relativeToFolder) continue;

            const parts = relativeToFolder.split('/');

            const name = parts[0];
            const isExplicitDir = file.type === 'directory';
            const isDir = isExplicitDir || parts.length > 1;

            const entryPath = currentPath ? `${currentPath}/${name}` : name;

            if (!entries.has(name)) {
                entries.set(name, {
                    id: entryPath,
                    type: isDir ? 'directory' : 'file',
                    mtimeMs: file.mtimeMs
                });
            }
        }

        setItems(Array.from(entries.values()).sort((a, b) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
            return a.id.localeCompare(b.id);
        }));

    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handlePress = (item: VaultFileEntry) => {
      if (item.type === 'directory') {
          router.push({ pathname: '/vault/explorer', params: { folder: item.id } });
      } else {
          router.push(`/vault/note/${item.id}`);
      }
  };

  const handleCreateNote = async () => {
    try {
      const filename = `Untitled ${Date.now()}.md`;
      const fullPath = currentPath ? `${currentPath}/${filename}` : filename;

      const adapter = new MobileSandboxVaultAdapter();
      await adapter.init();
      await adapter.writeNote(fullPath, '', { createParents: true });

      router.push(`/vault/note/${fullPath}`);
    } catch (e) {
      console.error('Failed to create note', e);
      Alert.alert('Error', 'Failed to create new note');
    }
  };

  const handleCreateFolder = async (folderName: string) => {
      try {
          setIsFolderPromptVisible(false);
          if (!folderName.trim()) return;

          const fullPath = currentPath ? `${currentPath}/${folderName}` : folderName;

          const adapter = new MobileSandboxVaultAdapter();
          await adapter.init();

          await adapter.mkdir(fullPath, { recursive: true });

          // Refresh list immediately
          loadFiles();
      } catch (e) {
          console.error('Failed to create folder', e);
          Alert.alert('Error', 'Failed to create new folder');
      }
  };

  const fabActions: FABAction[] = [
      { id: 'note', label: 'New Note', icon: 'document-text-outline', onPress: handleCreateNote },
      { id: 'folder', label: 'New Folder', icon: 'folder-outline', onPress: () => setIsFolderPromptVisible(true) },
  ];

  if (loading && items.length === 0) {
      return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
            title: currentPath ? currentPath.split('/').pop() : 'Documents',
            headerRight: currentPath === '' ? () => (
                <TouchableOpacity onPress={() => router.push('/vault/sandbox')} style={{ marginRight: 8 }}>
                    <Text style={{ color: '#007AFF', fontSize: 16 }}>Sandbox Tools</Text>
                </TouchableOpacity>
            ) : undefined
        }}
      />

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => handlePress(item)}>
                <Text style={styles.icon}>{item.type === 'directory' ? '📁' : '📄'}</Text>
                <Text style={styles.text}>{item.id.split('/').pop()}</Text>
            </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No files found</Text>}
        contentContainerStyle={{ paddingBottom: 100 }} // Add padding for FAB
      />

      <FAB
        onPress={handleCreateNote} // Default single tap action
        actions={fabActions}       // Long press menu actions (which includes Create Note too)
      />

      <PromptModal
        visible={isFolderPromptVisible}
        title="New Folder"
        placeholder="Folder Name"
        defaultValue=""
        onCancel={() => setIsFolderPromptVisible(false)}
        onSubmit={handleCreateFolder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  item: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0'
  },
  icon: {
      fontSize: 20,
      marginRight: 12,
  },
  text: {
      fontSize: 16,
  },
  empty: {
      padding: 20,
      textAlign: 'center',
      color: '#999',
      marginTop: 20,
  }
});
