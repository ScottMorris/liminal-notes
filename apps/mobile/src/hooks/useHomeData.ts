import { useState, useEffect, useCallback } from 'react';
import { useIndex } from '../context/IndexContext';
import { pinnedStorage, PinnedItem } from '../storage/pinned';
import { recentsStorage, RecentItem } from '../storage/recents';
import { FolderActivity } from '../indexing/sqlite/SQLiteSearchIndex';
import { MobileSandboxVaultAdapter } from '../adapters/MobileSandboxVaultAdapter';
import { useFocusEffect } from 'expo-router';

export interface HomeData {
  pinned: PinnedItem[];
  recents: RecentItem[];
  folders: FolderActivity[];
  loading: boolean;
}

export function useHomeData() {
  const { searchIndex: index } = useIndex(); // Destructure searchIndex as index
  const [data, setData] = useState<HomeData>({
    pinned: [],
    recents: [],
    folders: [],
    loading: true,
  });

  const loadData = useCallback(async () => {
    try {
      const [pinned, recents] = await Promise.all([
        pinnedStorage.getAll(),
        recentsStorage.getAll(),
      ]);

      // 1. Get folders from Search Index (Activity based)
      let activeFolders: FolderActivity[] = [];
      if (index && 'getFolderActivity' in index) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          activeFolders = await (index as any).getFolderActivity();
      }

      // 2. Get folders from File System (to include empty ones)
      const adapter = new MobileSandboxVaultAdapter();
      await adapter.init();
      const allFiles = await adapter.listFiles();

      const fsFolders = new Set<string>();
      for (const file of allFiles) {
          const parts = file.id.split('/');
          if (parts.length > 1) {
              // Implicit folder (contains file/dir)
              fsFolders.add(parts[0]);
          } else if (file.type === 'directory') {
              // Explicit top-level folder
              fsFolders.add(file.id);
          }
      }

      // 3. Merge Lists
      // Create a map from active folders for easy lookup
      const folderMap = new Map<string, FolderActivity>();
      activeFolders.forEach(f => folderMap.set(f.path, f));

      // Add missing FS folders
      fsFolders.forEach(folderName => {
          if (!folderMap.has(folderName)) {
              // Get mtime from the folder entry if possible, or 0
              const entry = allFiles.find(f => f.id === folderName && f.type === 'directory');
              const mtime = entry?.mtimeMs || 0;

              folderMap.set(folderName, {
                  path: folderName,
                  noteCount: 0,
                  lastActive: mtime
              });
          }
      });

      const mergedFolders = Array.from(folderMap.values());

      // 4. Sort (Active first, then by name)
      mergedFolders.sort((a, b) => {
          if (b.lastActive !== a.lastActive) {
              return b.lastActive - a.lastActive;
          }
          return a.path.localeCompare(b.path);
      });

      setData({
        pinned,
        recents,
        folders: mergedFolders,
        loading: false,
      });
    } catch (e: any) {
      // Ignore known race condition in Expo Go/SQLite
      if (e?.message?.includes('NativeDatabase.prepareAsync') && e?.message?.includes('NullPointerException')) {
          console.warn('Supressed Home load race condition:', e.message);
      } else {
          console.error('Failed to load home data', e);
      }
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [index]);

  // Reload when screen focuses to catch updates (e.g. new recent note)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return { ...data, refresh: loadData };
}
