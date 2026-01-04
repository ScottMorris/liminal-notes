import { useState, useEffect, useCallback } from 'react';
import { useIndex } from '../context/IndexContext';
import { pinnedStorage, PinnedItem } from '../storage/pinned';
import { recentsStorage, RecentItem } from '../storage/recents';
import { FolderActivity } from '../indexing/sqlite/SQLiteSearchIndex';
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
    // setData(prev => ({ ...prev, loading: true })); // Optional: don't flash loading state on refocus if we have data?
    try {
      const [pinned, recents] = await Promise.all([
        pinnedStorage.getAll(),
        recentsStorage.getAll(),
      ]);

      let folders: FolderActivity[] = [];
      // We need to access the SQLite index specifically to call getFolderActivity
      // The interface might not expose it directly if it's generic SearchIndex.
      // We can cast or check.
      // But wait, useIndex returns `index: SearchIndex | null`.
      // I'll need to cast it safely.
      if (index && 'getFolderActivity' in index) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          folders = await (index as any).getFolderActivity();
      }

      setData({
        pinned,
        recents,
        folders,
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
