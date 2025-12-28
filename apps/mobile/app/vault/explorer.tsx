import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
// We need a way to list files. The adapter doesn't expose it easily in context?
// The MobileSandboxVaultAdapter (and VaultAdapter interface) has listFiles.
// But we don't have direct access to the adapter instance via Context.
// We might need to instantiate one or add it to context.
// Actually, `useVault` only gives `activeVault` config.
// Let's create a temporary adapter instance for now, similar to how `VaultContext` does,
// OR better, update `VaultContext` or a hook to provide file listing.
// For now, I'll instantiate the adapter directly since it's stateless file IO for Sandbox.
import { MobileSandboxVaultAdapter } from '../../src/adapters/MobileSandboxVaultAdapter';
import type { VaultFileEntry } from '@liminal-notes/vault-core/types';

export default function ExplorerScreen() {
  const router = useRouter();
  const { folder } = useLocalSearchParams<{ folder?: string }>();
  const currentPath = folder || '';

  const [items, setItems] = useState<VaultFileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  const loadFiles = async () => {
    setLoading(true);
    try {
        const adapter = new MobileSandboxVaultAdapter();
        await adapter.init();
        // adapter.listFiles returns recursive list usually?
        // Wait, VaultAdapter.listFiles usually returns recursive list of files.
        // But for a file browser we want shallow list usually?
        // Let's check `VaultAdapter` interface.
        // If it's recursive, we filter client side.
        const allFiles = await adapter.listFiles();

        // Filter for current folder
        // If currentPath is empty, we want top level items.
        // If currentPath is 'folder', we want items starting with 'folder/' but no further slashes (unless we want flattened).
        // The spec says "folder opens folder-scoped list view (existing file browser filtered to that folder)".

        // Simple filtering:
        // If we are at root, we show files/folders that have no slash (files) or one slash (folders - wait, listFiles usually only returns files?)
        // VaultAdapter.listFiles returns `VaultFileEntry[]`.
        // If it only returns files, we need to infer folders.

        // Let's assume listFiles returns files only.
        // We need to synthesize folders.
        const entries = new Map<string, VaultFileEntry>();

        for (const file of allFiles) {
            const relPath = file.id; // VaultFileEntry uses `id` not `path` according to types.ts

            if (currentPath && !relPath.startsWith(currentPath + '/')) continue;

            const relativeToFolder = currentPath ? relPath.slice(currentPath.length + 1) : relPath;
            const parts = relativeToFolder.split('/');

            const name = parts[0];
            const isExplicitDir = file.type === 'directory';

            // If it's a directory (implicit via parts or explicit via type)
            const isDir = isExplicitDir || parts.length > 1;

            // If it's a directory, we only want one entry for it.
            const entryPath = currentPath ? `${currentPath}/${name}` : name;

            if (!entries.has(name)) {
                entries.set(name, {
                    id: entryPath,
                    type: isDir ? 'directory' : 'file',
                    mtimeMs: file.mtimeMs // Use latest mtime for folder?
                });
            } else if (isDir && entries.get(name)?.type === 'file') {
                 // Conflict: explicit folder overwrites file logic if any?
                 // Actually if we have 'a/b.md' we inferred 'a' is dir.
                 // If we now see 'a' (explicit dir), we just keep it as dir.
                 // Nothing to do.
            }
        }

        setItems(Array.from(entries.values()).sort((a, b) => {
            // Folders first
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

  if (loading) {
      return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: currentPath || 'Documents' }} />
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
      color: '#999'
  }
});
