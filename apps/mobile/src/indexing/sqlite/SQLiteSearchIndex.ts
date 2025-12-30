import { SearchIndex, NoteIndexEntry, SearchResult, NoteId } from '@liminal-notes/core-shared/indexing/types';
import * as SQLite from 'expo-sqlite';

export interface FolderActivity {
    path: string;
    noteCount: number;
    lastActive: number; // timestamp
}

export class SQLiteSearchIndex implements SearchIndex {
  constructor(private db: SQLite.SQLiteDatabase) {}

  async upsert(entry: NoteIndexEntry): Promise<void> {
    const { id, title, content, mtimeMs } = entry;

    // We use a transaction to update both the metadata table and the FTS table
    await this.db.withTransactionAsync(async () => {
        // 1. Update Notes Table
        await this.db.runAsync(
            `INSERT OR REPLACE INTO notes (id, title, updated_at) VALUES (?, ?, ?)`,
            [id, title, mtimeMs || Date.now()]
        );

        // 2. Update FTS Table
        // FTS5 doesn't support INSERT OR REPLACE nicely without rowid management usually,
        // but we can just DELETE and INSERT.
        await this.db.runAsync(`DELETE FROM search_fts WHERE id = ?`, [id]);

        if (content) {
            await this.db.runAsync(
                `INSERT INTO search_fts (id, title, content) VALUES (?, ?, ?)`,
                [id, title, content]
            );
        }
    });
  }

  async remove(id: NoteId): Promise<void> {
    await this.db.withTransactionAsync(async () => {
        await this.db.runAsync(`DELETE FROM notes WHERE id = ?`, [id]);
        await this.db.runAsync(`DELETE FROM search_fts WHERE id = ?`, [id]);
    });
  }

  async search(query: string, opts?: { limit?: number }): Promise<SearchResult[]> {
    const limit = opts?.limit || 50;

    // FTS5 Search
    // We match on title or content.
    // FTS syntax: "query*" for prefix search is common.
    // We'll do a simple match for now.
    const ftsQuery = `"${query.replace(/"/g, '""')}"*`;

    // We can also use 'rank' for sorting in FTS5
    const results = await this.db.getAllAsync<{ id: string; title: string; content: string }>(
        `SELECT id, title, content
         FROM search_fts
         WHERE search_fts MATCH ?
         ORDER BY rank
         LIMIT ?`,
        [ftsQuery, limit]
    );

    return results.map(row => ({
        id: row.id,
        // Simple scoring based on title match (dummy score for now as FTS handles rank)
        score: row.title.toLowerCase().includes(query.toLowerCase()) ? 2 : 1,
        // We could implement highlighting here if needed, or use FTS snippet()
    }));
  }

  // New method for Home Screen
  async getFolderActivity(): Promise<FolderActivity[]> {
      // Get all notes to process in memory (or complex SQL if we're brave).
      // Since paths are just strings, SQL might be tricky for "top level folders".
      // We can grab all ID and updated_at.
      const rows = await this.db.getAllAsync<{ id: string; updated_at: number }>(
          `SELECT id, updated_at FROM notes`
      );

      const folders = new Map<string, { count: number; lastActive: number }>();

      for (const row of rows) {
          const parts = row.id.split('/');
          if (parts.length > 1) {
              // It's inside a folder.
              // We only care about top-level folders for now?
              // "Shows top-level folders as cards/rows."
              const topFolder = parts[0];
              const current = folders.get(topFolder) || { count: 0, lastActive: 0 };

              folders.set(topFolder, {
                  count: current.count + 1,
                  lastActive: Math.max(current.lastActive, row.updated_at)
              });
          }
      }

      const result: FolderActivity[] = [];
      folders.forEach((val, key) => {
          result.push({
              path: key,
              noteCount: val.count,
              lastActive: val.lastActive
          });
      });

      // Sort by activity desc
      result.sort((a, b) => b.lastActive - a.lastActive);
      return result;
  }
}
