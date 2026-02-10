import React, { createContext, useContext, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useSearchIndex } from '../components/SearchIndexContext';
import { useLinkIndex } from '../components/LinkIndexContext';

interface FileWatcherContextType {}

const FileWatcherContext = createContext<FileWatcherContextType | null>(null);

// Event payload from Rust
interface FileEvent {
  path: string;
}

type UnlistenFn = () => void;
type ListenFn = <T>(
  event: string,
  handler: (event: { payload: T }) => void | Promise<void>,
) => Promise<UnlistenFn>;

export function registerFileWatchListeners(
  listenFn: ListenFn,
  handlers: {
    updateSearch: (path: string) => void | Promise<void>;
    removeSearch: (path: string) => void | Promise<void>;
    updateLinks: (path: string) => void | Promise<void>;
    removeLinks: (path: string) => void | Promise<void>;
  },
): () => void {
  const { updateSearch, removeSearch, updateLinks, removeLinks } = handlers;

  const unlistenCreated = listenFn<FileEvent>('vault:file-created', async (event) => {
    await Promise.all([
      updateSearch(event.payload.path),
      updateLinks(event.payload.path),
    ]);
  });

  const unlistenModified = listenFn<FileEvent>('vault:file-modified', async (event) => {
    await Promise.all([
      updateSearch(event.payload.path),
      updateLinks(event.payload.path),
    ]);
  });

  const unlistenDeleted = listenFn<FileEvent>('vault:file-deleted', async (event) => {
    await Promise.all([
      removeSearch(event.payload.path),
      removeLinks(event.payload.path),
    ]);
  });

  return () => {
    void unlistenCreated.then((f) => f());
    void unlistenModified.then((f) => f());
    void unlistenDeleted.then((f) => f());
  };
}

export const FileWatcherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { updateFile: updateSearch, removeFile: removeSearch } = useSearchIndex();
  const { updateFile: updateLinks, removeFile: removeLinks } = useLinkIndex();

  useEffect(() => {
    return registerFileWatchListeners(listen as ListenFn, {
      updateSearch,
      removeSearch,
      updateLinks,
      removeLinks,
    });
  }, [updateSearch, removeSearch, updateLinks, removeLinks]);

  return (
    <FileWatcherContext.Provider value={{}}>
      {children}
    </FileWatcherContext.Provider>
  );
};
