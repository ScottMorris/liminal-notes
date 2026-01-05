import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useHomeData } from '../../src/hooks/useHomeData';
import { FocusedSection } from '../../src/components/home/FocusedSection';
import { FolderSection } from '../../src/components/home/FolderSection';
import { RecentSection } from '../../src/components/home/RecentSection';
import { FAB, FABAction } from '../../src/components/FAB';
import { Text, useTheme } from 'react-native-paper'; // Use Paper Text and useTheme
import { MobileSandboxVaultAdapter } from '../../src/adapters/MobileSandboxVaultAdapter';
import { PromptModal } from '../../src/components/PromptModal';
import { HeaderMenu } from '../../src/components/HeaderMenu';
import { IconButton } from 'react-native-paper';

export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const theme = useTheme();
  const { pinned, recents, folders, loading, refresh } = useHomeData();
  const [isFolderPromptVisible, setIsFolderPromptVisible] = useState(false);

  const handleCreateNote = async () => {
    try {
      // Create new note logic
      const id = `Untitled ${Date.now()}.md`;
      const adapter = new MobileSandboxVaultAdapter();
      await adapter.init();
      // Write empty file
      await adapter.writeNote(id, '', { createParents: true });

      // Navigate
      router.push(`/vault/note/${id}`);
    } catch (e) {
      console.error('Failed to create note', e);
      Alert.alert('Error', 'Failed to create new note');
    }
  };

  const handleCreateFolder = async (folderName: string) => {
      try {
          setIsFolderPromptVisible(false);
          const adapter = new MobileSandboxVaultAdapter();
          await adapter.init();

          await adapter.mkdir(folderName, { recursive: true });
          // Navigate to folder
          router.push({ pathname: '/vault/explorer', params: { folder: folderName } });
      } catch (e) {
          console.error('Failed to create folder', e);
          Alert.alert('Error', 'Failed to create new folder');
      }
  };

  const fabActions: FABAction[] = [
      { id: 'note', label: 'New Note', icon: 'file-document-outline', onPress: handleCreateNote },
      { id: 'folder', label: 'New Folder', icon: 'folder-outline', onPress: () => setIsFolderPromptVisible(true) },
  ];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <IconButton icon="magnify" onPress={() => router.push('/search')} />
                  {/* Self-contained Menu Button */}
                  <HeaderMenu
                      actions={[
                          { id: 'settings', label: 'Settings', onPress: () => router.push('/settings') }
                      ]}
                  />
                </View>
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
                 <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>Create your first note</Text>
             </View>
        )}
      </ScrollView>

      <FAB
          visible={isFocused}
          onPress={() => {}}
          actions={fabActions}
      />

      <PromptModal
        visible={isFolderPromptVisible}
        title="New Folder"
        placeholder="Folder Name"
        defaultValue="Untitled Folder"
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
  },
});
