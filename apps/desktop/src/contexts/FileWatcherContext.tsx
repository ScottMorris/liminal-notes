import React, { createContext, useContext, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useSearchIndex } from '../components/SearchIndexContext';
import { useLinkIndex } from '../components/LinkIndexContext';
import { useFileTree } from '../components/FileTree';
import { useNotification } from '../components/NotificationContext';

interface FileWatcherContextType {}

const FileWatcherContext = createContext<FileWatcherContextType | null>(null);

// Event payload from Rust
interface FileEvent {
  path: string;
}

export const FileWatcherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { updateFile: updateSearch, removeFile: removeSearch } = useSearchIndex();
  const { updateFile: updateLinks, removeFile: removeLinks } = useLinkIndex();
  // We can't access FileTreeContext directly if it's not exported or if we are outside the provider.
  // Ideally, FileTree should listen internally or expose a reload method.
  // For now, we assume the indices are sufficient for data, and we need a way to refresh UI.
  // But wait, FileTree component manages its own state usually.
  // Let's rely on event propagation or specific context methods.

  // Actually, FileTree usually re-fetches or we need to trigger it.
  // Let's check FileTree implementation later. For now, we handle Data Indices.

  useEffect(() => {
    // console.log('[FileWatcher] Setting up listeners');

    const unlistenCreated = listen<FileEvent>('vault:file-created', async (event) => {
      // console.log('[FileWatcher] Created:', event.payload.path);
      // New file: update indices
      // We might need to read content first.
      // The indices usually take a note object or read from disk.
      // Let's assume the IndexContext has methods to handle "path changed, go re-read it".
      // Checking SearchIndexContext...
      // It usually needs content.

      // Ideally, we trigger a "re-index this path" action.
      // If the contexts only accept (id, content), we need to fetch it here.
      // But let's see if we can delegate that.

      await Promise.all([
          updateSearch(event.payload.path),
          updateLinks(event.payload.path)
      ]);
    });

    const unlistenChanged = listen<FileEvent>('vault:file-changed', async (event) => {
      // console.log('[FileWatcher] Changed:', event.payload.path);
      await Promise.all([
          updateSearch(event.payload.path),
          updateLinks(event.payload.path)
      ]);
    });

    const unlistenDeleted = listen<FileEvent>('vault:file-deleted', async (event) => {
      // console.log('[FileWatcher] Deleted:', event.payload.path);
      await Promise.all([
          removeSearch(event.payload.path),
          removeLinks(event.payload.path)
      ]);
    });

    return () => {
      unlistenCreated.then(f => f());
      unlistenChanged.then(f => f());
      unlistenDeleted.then(f => f());
    };
  }, [updateSearch, removeSearch, updateLinks, removeLinks]);

  return (
    <FileWatcherContext.Provider value={{}}>
      {children}
    </FileWatcherContext.Provider>
  );
};
