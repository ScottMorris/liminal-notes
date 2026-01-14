import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as SQLite from 'expo-sqlite';
import { SearchIndex, LinkIndex } from '@liminal-notes/core-shared/indexing/types';
import { SQLiteSearchIndex } from '../indexing/sqlite/SQLiteSearchIndex';
import { SQLiteLinkIndex } from '../indexing/sqlite/SQLiteLinkIndex';
import { SQLiteTagIndex } from '../indexing/sqlite/SQLiteTagIndex';
import { openDatabase, initDatabase } from '../indexing/sqlite/database';
import { useVault } from './VaultContext';
import { parseWikilinks } from '@liminal-notes/core-shared/indexing/resolution'; // Fixed import path from previous knowledge
import { parseFrontmatter } from '@liminal-notes/core-shared/frontmatter';
import { normalizeTagId, deriveTagsFromPath, humanizeTagId } from '@liminal-notes/core-shared/tags';

interface IndexContextType {
  searchIndex: SearchIndex | null;
  linkIndex: LinkIndex | null;
  tagIndex: SQLiteTagIndex | null;
  isIndexing: boolean;
  db: SQLite.SQLiteDatabase | null;
}

const IndexContext = createContext<IndexContextType | undefined>(undefined);

export function IndexProvider({ children }: { children: React.ReactNode }) {
  const { activeVault, adapter } = useVault();
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);
  const [linkIndex, setLinkIndex] = useState<LinkIndex | null>(null);
  const [tagIndex, setTagIndex] = useState<SQLiteTagIndex | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  // Ref to track if we've already started the background scan for this vault session
  const scanStartedRef = useRef(false);

  // 1. Initialize DB per vault
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      // Tear down previous DB state
      if (db) {
        try {
          await db.closeAsync();
        } catch (e) {
          console.warn('Failed to close previous index db', e);
        }
        setDb(null);
        setSearchIndex(null);
        setLinkIndex(null);
        setTagIndex(null);
      }

      scanStartedRef.current = false;

      if (!activeVault) {
        return;
      }

      try {
        const database = await openDatabase(activeVault.vaultId);
        if (cancelled) {
          await database.closeAsync();
          return;
        }

        await initDatabase(database);

        setDb(database);
        setSearchIndex(new SQLiteSearchIndex(database));
        setLinkIndex(new SQLiteLinkIndex(database));
        setTagIndex(new SQLiteTagIndex(database));
      } catch (e) {
        console.error('Failed to init index db', e);
      }
    }

    setup();

    return () => {
      cancelled = true;
    };
  }, [activeVault?.vaultId]);

  // 2. Background Scan Logic (Lazy)
  useEffect(() => {
    if (!db || !activeVault || !adapter || !searchIndex || !tagIndex || scanStartedRef.current) return;

    const vaultId = activeVault.vaultId;

    const runBackgroundScan = async () => {
        scanStartedRef.current = true;
        setIsIndexing(true);
        console.log('[Index] Starting background scan...');

        try {
            // Adapter is already initialised by VaultContext
            const files = await adapter.listFiles();

            // Get all indexed notes to check mtimes
            // Optimization: Get map of id -> updated_at
            const existingRows = await db.getAllAsync<{ id: string; updated_at: number }>('SELECT id, updated_at FROM notes');
            const existingMap = new Map(existingRows.map(r => [r.id, r.updated_at]));
            const forceFullScan = existingMap.size === 0; // Fresh DB: index everything from disk

            // Filter for stale or new files
            const tasks: string[] = [];
            for (const file of files) {
                // file is VaultFileEntry: { id: NoteId, type: 'file', ... }
                // id is the relative path (e.g. 'foo.md')
                if (file.type !== 'file' || !file.id.endsWith('.md')) continue;

                if (forceFullScan || !existingMap.has(file.id)) {
                    tasks.push(file.id);
                }
            }

            console.log(`[Index] Found ${tasks.length} unindexed files.`);

            // Process tasks with low priority / batching
            // We'll do simple serial processing with sleeps to yield UI
            for (const noteId of tasks) {
                // Yield to UI loop
                await new Promise(r => setTimeout(r, 50));

                try {
                    const note = await adapter.readNote(noteId);
                    // Upsert Note & Content
                    await searchIndex.upsert({
                        id: noteId,
                        title: noteId.replace(/\.md$/, ''), // Simple title derivation
                        content: note.content,
                        mtimeMs: Date.now() // Approximation since we just read it
                    });

                    // Upsert Links
                    if (linkIndex) {
                        const links = parseWikilinks(note.content).map(match => ({
                            source: noteId,
                            targetRaw: match.targetRaw,
                            targetPath: match.targetRaw, // Best effort: assume raw is path for now
                        }));
                        await linkIndex.upsertLinks(noteId, links);
                    }

                    // Upsert Tags
                    if (tagIndex) {
                        const { data } = parseFrontmatter(note.content);
                        let fileTags: string[] = [];
                        if (data.tags && Array.isArray(data.tags)) {
                            fileTags = data.tags.map((t: any) => normalizeTagId(String(t)));
                        } else if (data.tags && typeof data.tags === 'string') {
                            fileTags = [normalizeTagId(data.tags)];
                        }

                        // Derived
                        const folderTags = deriveTagsFromPath(noteId);
                        const uniqueTags = Array.from(new Set([...fileTags, ...folderTags]));

                        // Auto-discovery of tags
                        for (const tagId of uniqueTags) {
                            const existing = await tagIndex.getTag(tagId);
                            if (!existing) {
                                await tagIndex.upsertTag({
                                    id: tagId,
                                    displayName: humanizeTagId(tagId),
                                    createdAt: Date.now()
                                });
                            }
                        }

                        await tagIndex.setNoteTags(noteId, uniqueTags);
                    }
                } catch (e) {
                    console.warn(`[Index] Failed to index ${noteId}`, e);
                }
            }

        } catch (e) {
            console.error('[Index] Background scan error', e);
        } finally {
            setIsIndexing(false);
            console.log('[Index] Background scan complete.');
        }
    };

    // Delay scan slightly to let app settle
    const timer = setTimeout(runBackgroundScan, 2000);
    return () => clearTimeout(timer);

  }, [db, activeVault, adapter, searchIndex, tagIndex]);

  // Close DB on unmount to avoid dangling handles
  useEffect(() => {
    return () => {
      if (db) {
        db.closeAsync().catch((e) => console.warn('Failed to close index db on unmount', e));
      }
    };
  }, [db]);

  return (
    <IndexContext.Provider value={{ searchIndex, linkIndex, tagIndex, isIndexing, db }}>
      {children}
    </IndexContext.Provider>
  );
}

export function useIndex() {
  const context = useContext(IndexContext);
  if (context === undefined) {
    throw new Error('useIndex must be used within an IndexProvider');
  }
  return context;
}
