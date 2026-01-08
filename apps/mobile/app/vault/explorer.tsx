import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { MobileSandboxVaultAdapter } from '../../src/adapters/MobileSandboxVaultAdapter';
import type { VaultFileEntry } from '@liminal-notes/vault-core/types';
import { FAB, FABAction } from '../../src/components/FAB';
import { PromptModal } from '../../src/components/PromptModal';
import { useTheme, Text, List, ActivityIndicator, Divider } from 'react-native-paper';
import { EditableHeaderTitle } from '../../src/components/EditableHeaderTitle';
import { renameFolder } from '../../src/utils/fileOperations';
import { useIndex } from '../../src/context/IndexContext';

export default function ExplorerScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { folder } = useLocalSearchParams<{ folder?: string }>();
  const currentPath = folder || '';
  const theme = useTheme();
  const { searchIndex, linkIndex } = useIndex();

  const [items, setItems] = useState<VaultFileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFolderPromptVisible, setIsFolderPromptVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFiles();
    }, [currentPath])
  );

  const loadFiles = async () => {
    try {
        const adapter = new MobileSandboxVaultAdapter();
        await adapter.init();
        const allFiles = await adapter.listFiles();

        const entries = new Map<string, VaultFileEntry>();

        for (const file of allFiles) {
            const relPath = file.id;

            if (currentPath && !relPath.startsWith(currentPath + '/')) continue;

            const relativeToFolder = currentPath ? relPath.slice(currentPath.length + 1) : relPath;
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
          // Encode path to handle nested folders (slashes)
          router.push(`/vault/note/${encodeURIComponent(item.id)}`);
      }
  };

  const handleCreateNote = async () => {
    try {
      const filename = `Untitled ${Date.now()}.md`;
      const fullPath = currentPath ? `${currentPath}/${filename}` : filename;

      const adapter = new MobileSandboxVaultAdapter();
      await adapter.init();
      await adapter.writeNote(fullPath, '', { createParents: true });

      // Encode path to handle nested folders
      router.push(`/vault/note/${encodeURIComponent(fullPath)}`);
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
          loadFiles();
      } catch (e) {
          console.error('Failed to create folder', e);
          Alert.alert('Error', 'Failed to create new folder');
      }
  };

  const handleRename = async (newName: string) => {
      if (!currentPath) return; // Cannot rename root

      try {
          await renameFolder({
              oldPath: currentPath,
              newName,
              searchIndex,
              linkIndex,
              router
          });
      } catch (e: unknown) {
          // Alert is handled here, but we rethrow so EditableHeaderTitle keeps the input open
          if (e instanceof Error) {
               // We might rely on EditableHeaderTitle's alert, but for now let's throw.
               // EditableHeaderTitle catches and Alerts too.
               // To avoid double alerts, we can just throw.
               // But wait, the previous code caught it and alerted.
               // If we throw, EditableHeaderTitle will Alert.
               // So we should remove the Alert here or let EditableHeaderTitle handle it.
               throw e;
          }
          throw new Error('Rename failed');
      }
  };

  const fabActions: FABAction[] = [
      { id: 'note', label: 'New Note', icon: 'file-document-outline', onPress: handleCreateNote },
      { id: 'folder', label: 'New Folder', icon: 'folder-outline', onPress: () => setIsFolderPromptVisible(true) },
  ];

  if (loading && items.length === 0) {
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ActivityIndicator style={{ flex: 1 }} animating={true} color={theme.colors.primary} />
        </View>
      );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
            headerTitle: currentPath
                ? () => <EditableHeaderTitle title={currentPath.split('/').pop() || ''} onRename={handleRename} />
                : 'Documents',
            headerRight: currentPath === '' ? () => (
                <TouchableOpacity onPress={() => router.push('/vault/sandbox')} style={{ marginRight: 8 }}>
                    <Text style={{ color: theme.colors.primary, fontSize: 16 }}>Sandbox Tools</Text>
                </TouchableOpacity>
            ) : undefined
        }}
      />

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <>
            <List.Item
              title={item.id.split('/').pop()}
              description={item.mtimeMs ? new Date(item.mtimeMs).toLocaleDateString() : undefined}
              left={props => <List.Icon {...props} icon={item.type === 'directory' ? 'folder-outline' : 'file-document-outline'} />}
              onPress={() => handlePress(item)}
              titleStyle={{ color: theme.colors.onBackground }}
            />
            <Divider />
          </>
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>No files found</Text>}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <FAB
        visible={isFocused}
        onPress={handleCreateNote}
        actions={fabActions}
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
  },
  empty: {
      padding: 20,
      textAlign: 'center',
      marginTop: 20,
  }
});
