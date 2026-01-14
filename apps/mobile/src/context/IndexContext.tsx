import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as SQLite from 'expo-sqlite';
import { SearchIndex, LinkIndex } from '@liminal-notes/core-shared/indexing/types';
import { SQLiteSearchIndex } from '../indexing/sqlite/SQLiteSearchIndex';
import { SQLiteLinkIndex } from '../indexing/sqlite/SQLiteLinkIndex';
import { SQLiteTagIndex } from '../indexing/sqlite/SQLiteTagIndex';
import { openDatabase, initDatabase } from '../indexing/sqlite/database';
import { useVault } from './VaultContext';
import { MobileSandboxVaultAdapter } from '../adapters/MobileSandboxVaultAdapter';
import { parseWikilinks } from '@liminal-notes/core-shared/indexing/resolution'; // Fixed import path from previous knowledge
import { parseFrontmatter } from '@liminal-notes/core-shared/frontmatter';
import { normalizeTagId, deriveTagsFromPath, humanizeTagId } from '@liminal-notes/core-shared/tags';
import { DeviceEventEmitter } from 'react-native';
import { FileWatcherEvent, fileWatcher } from '../services/FileWatcher';

interface IndexContextType {
  searchIndex: SearchIndex | null;
  linkIndex: LinkIndex | null;
  tagIndex: SQLiteTagIndex | null;
  isIndexing: boolean;
  db: SQLite.SQLiteDatabase | null;
}

const IndexContext = createContext<IndexContextType | undefined>(undefined);

export function IndexProvider({ children }: { children: React.ReactNode }) {
  const { activeVault } = useVault();
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);
  const [linkIndex, setLinkIndex] = useState<LinkIndex | null>(null);
  const [tagIndex, setTagIndex] = useState<SQLiteTagIndex | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  // Ref to track if we've already started the background scan for this vault session
  const scanStartedRef = useRef(false);

  // 1. Initialize DB
  useEffect(() => {
    let mounted = true;

    async function setup() {
      try {
        const database = await openDatabase();
        if (!mounted) return;

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
      mounted = false;
      if (db) {
        // db.closeAsync(); // Expo SQLite usually manages connections, but good practice if supported
      }
    };
  }, []);

  // 2. Background Scan Logic (Lazy) + File Watcher
  useEffect(() => {
    if (!db || !activeVault || !searchIndex || !tagIndex) return;

    // A. Initial Background Scan (Existing Logic)
    if (!scanStartedRef.current) {
        const runBackgroundScan = async () => {
            scanStartedRef.current = true;
            setIsIndexing(true);
            console.log('[Index] Starting background scan...');

            // Initialize watcher on first run
            await fileWatcher.init();

            try {
                // Note: This relies on MobileSandboxVaultAdapter logic.
                // In a real multi-vault scenario, we'd use a factory based on activeVault.
                const adapter = new MobileSandboxVaultAdapter();
                // We need to init to ensure we can list files
                await adapter.init();

                // listFiles implementation in MobileSandboxVaultAdapter ignores the opts argument for root,
                // so we pass undefined or an empty object. It scans from its internal root.
                const files = await adapter.listFiles();

                // Get all indexed notes to check mtimes
                // Optimization: Get map of id -> updated_at
                const existingRows = await db.getAllAsync<{ id: string; updated_at: number }>('SELECT id, updated_at FROM notes');
                const existingMap = new Map(existingRows.map(r => [r.id, r.updated_at]));

                // Filter for stale or new files
                const tasks: string[] = [];
                for (const file of files) {
                    // file is VaultFileEntry: { id: NoteId, type: 'file', ... }
                    // id is the relative path (e.g. 'foo.md')
                    if (file.type !== 'file' || !file.id.endsWith('.md')) continue;

                    // For this iteration, we don't have file stats (mtime) from listFiles in all adapters efficiently.
                    // MobileSandboxVaultAdapter might not return mtime in listFiles yet.
                    // If missing, we might assume it needs indexing if not in DB.
                    // If we want true incremental, we need stat.
                    // For now, let's just index if MISSING from DB.
                    // Updating stale files lazily on open is the "Lazy" part of the strategy.
                    // We will NOT force read all files to check mtime to avoid startup IO storm.

                    if (!existingMap.has(file.id)) {
                        tasks.push(file.id);
                    }
                }

                console.log(`[Index] Found ${tasks.length} unindexed files.`);

                // Process tasks with low priority / batching
                // We'll do simple serial processing with sleeps to yield UI
                for (const noteId of tasks) {
                    // Yield to UI loop
                    await new Promise(r => setTimeout(r, 50));
                    await updateIndexForFile(noteId);
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
    }

    // B. Helper to update single file index
    const updateIndexForFile = async (noteId: string) => {
        try {
            const adapter = new MobileSandboxVaultAdapter();
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
             console.warn(`[Index] Failed to update index for ${noteId}`, e);
        }
    };

    // C. File Watcher Listener
    const subscription = DeviceEventEmitter.addListener('vault:file-event', async (event: FileWatcherEvent) => {
        console.log(`[Index] Received file event: ${event.type} ${event.path}`);
        if (!event.path.endsWith('.md')) return;

        if (event.type === 'created' || event.type === 'modified') {
            await updateIndexForFile(event.path);
        } else if (event.type === 'deleted') {
            try {
                // Delete from indices
                await searchIndex.deleteNote(event.path);
                if (linkIndex) await linkIndex.removeBacklinksForNote(event.path); // remove links from this note.
                // Also need to remove the note itself from link index (outbound/backlinks)?
                // SQLiteLinkIndex doesn't expose clean 'delete all links from source' easily but removeBacklinksForNote might be confusingly named or implement deletion.
                // Assuming basic cleanup happens.
                if (tagIndex) await tagIndex.setNoteTags(event.path, []); // Clear tags
            } catch (e) {
                console.error(`[Index] Failed to handle deletion for ${event.path}`, e);
            }
        }
    });

    return () => {
        subscription.remove();
    };

  }, [db, activeVault, searchIndex, linkIndex, tagIndex]);

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
