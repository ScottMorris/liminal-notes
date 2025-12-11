import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { readNote } from '../commands';
import { FileEntry } from '../types';

export interface NoteIndexEntry {
  path: string;
  title: string;
  content: string;
}

interface SearchIndexContextProps {
  buildIndex: (files: FileEntry[]) => Promise<void>;
  updateEntry: (path: string, content: string) => void;
  search: (query: string) => NoteIndexEntry[];
  getEntry: (path: string) => NoteIndexEntry | undefined;
  isIndexing: boolean;
}

const SearchIndexContext = createContext<SearchIndexContextProps | undefined>(undefined);

export const useSearchIndex = () => {
  const context = useContext(SearchIndexContext);
  if (!context) {
    throw new Error('useSearchIndex must be used within a SearchIndexProvider');
  }
  return context;
};

export const SearchIndexProvider = ({ children }: { children: ReactNode }) => {
  const [index, setIndex] = useState<Map<string, NoteIndexEntry>>(new Map());
  const [isIndexing, setIsIndexing] = useState(false);

  const parseTitle = (path: string, content: string): string => {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') continue;

      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      } else {
        // First non-empty line is not a heading
        break;
      }
    }

    // Fallback to basename
    // Handle both / and \ just in case, though standardizing on / is better
    const normalizedPath = path.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/\.md$/, '');
  };

  const buildIndex = useCallback(async (files: FileEntry[]) => {
    setIsIndexing(true);
    const newIndex = new Map<string, NoteIndexEntry>();
    const mdFiles = files.filter(f => !f.is_dir && f.path.endsWith('.md'));

    // Process files in parallel to speed up indexing.
    // The Tauri backend handles these concurrent requests using a thread pool.
    await Promise.all(mdFiles.map(async (file) => {
      try {
        const content = await readNote(file.path);
        const title = parseTitle(file.path, content);
        newIndex.set(file.path, { path: file.path, title, content });
      } catch (err) {
        console.error(`Failed to index ${file.path}:`, err);
      }
    }));

    setIndex(newIndex);
    setIsIndexing(false);
  }, []);

  const updateEntry = useCallback((path: string, content: string) => {
    setIndex(prev => {
      const newIndex = new Map(prev);
      const title = parseTitle(path, content);
      newIndex.set(path, { path, title, content });
      return newIndex;
    });
  }, []);

  const search = useCallback((query: string): NoteIndexEntry[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: { entry: NoteIndexEntry, score: number }[] = [];

    for (const entry of index.values()) {
      let score = 0;
      const titleLower = entry.title.toLowerCase();
      const contentLower = entry.content.toLowerCase();

      if (titleLower.includes(q)) score += 2;
      if (contentLower.includes(q)) score += 1;

      if (score > 0) {
        results.push({ entry, score });
      }
    }

    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Secondary sort: Title then Path
      const titleCompare = a.entry.title.localeCompare(b.entry.title);
      if (titleCompare !== 0) return titleCompare;
      return a.entry.path.localeCompare(b.entry.path);
    });

    return results.map(r => r.entry);
  }, [index]);

  const getEntry = useCallback((path: string): NoteIndexEntry | undefined => {
    return index.get(path);
  }, [index]);

  return (
    <SearchIndexContext.Provider value={{ buildIndex, updateEntry, search, getEntry, isIndexing }}>
      {children}
    </SearchIndexContext.Provider>
  );
};
