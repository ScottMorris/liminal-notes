import { LinkIndex, NoteId, Link } from '@liminal-notes/core-shared/indexing/types';
import * as SQLite from 'expo-sqlite';

export class SQLiteLinkIndex implements LinkIndex {
  constructor(private db: SQLite.SQLiteDatabase) {}

  async upsertLinks(source: NoteId, links: Link[]): Promise<void> {
    await this.db.withTransactionAsync(async () => {
        // 1. Remove existing outbound links for this source
        await this.db.runAsync(`DELETE FROM links WHERE source = ?`, [source]);

        // 2. Insert new links
        for (const link of links) {
            // targetPath is the raw link target (e.g. "foo" in [[foo]])
            // We assume for now target_id is the same, or null if unresolvable.
            // In a real system, we might want to resolve "foo" to "foo.md" here or store raw.
            // Based on shared types, `link.targetPath` is the raw target.
            // We'll store it as target_id for now as a best-effort.

            if (link.targetPath) {
                await this.db.runAsync(
                    `INSERT INTO links (source, target, target_id) VALUES (?, ?, ?)`,
                    [source, link.targetPath, link.targetPath]
                );
            }
        }
    });
  }

  async removeSource(source: NoteId): Promise<void> {
    await this.db.runAsync(`DELETE FROM links WHERE source = ?`, [source]);
  }

  async getOutbound(source: NoteId): Promise<Link[]> {
    const rows = await this.db.getAllAsync<{ target: string }>(
        `SELECT target FROM links WHERE source = ?`,
        [source]
    );

    return rows.map(row => ({
        source: source,
        targetPath: row.target,
        targetRaw: row.target,
    }));
  }

  async getBacklinks(target: NoteId): Promise<Link[]> {
    // We match against target_id (resolved) or target (raw)
    // For now, let's match target_id which we populated with targetPath
    const rows = await this.db.getAllAsync<{ source: string; target: string }>(
        `SELECT source, target FROM links WHERE target_id = ?`,
        [target]
    );

    return rows.map(row => ({
        source: row.source,
        targetPath: row.target,
        targetRaw: row.target,
    }));
  }
}
