import * as SQLite from 'expo-sqlite';
import { Tag, TagId } from '@liminal-notes/core-shared/tags';

export class SQLiteTagIndex {
  constructor(private db: SQLite.SQLiteDatabase) {}

  async upsertTag(tag: Tag): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO tags (id, display_name, color, created_at) VALUES (?, ?, ?, ?)`,
      [tag.id, tag.displayName, tag.color || null, tag.createdAt]
    );
  }

  async getTag(tagId: TagId): Promise<Tag | null> {
    const row = await this.db.getFirstAsync<{ id: string; display_name: string; color: string; created_at: number }>(
      `SELECT * FROM tags WHERE id = ?`,
      [tagId]
    );
    if (!row) return null;
    return {
      id: row.id,
      displayName: row.display_name,
      color: row.color,
      createdAt: row.created_at,
    };
  }

  async getAllTags(): Promise<Tag[]> {
    const rows = await this.db.getAllAsync<{ id: string; display_name: string; color: string; created_at: number }>(
      `SELECT * FROM tags ORDER BY display_name ASC`
    );
    return rows.map(row => ({
      id: row.id,
      displayName: row.display_name,
      color: row.color,
      createdAt: row.created_at,
    }));
  }

  async deleteTag(tagId: TagId): Promise<void> {
    await this.db.runAsync(`DELETE FROM tags WHERE id = ?`, [tagId]);
  }

  async setNoteTags(noteId: string, tagIds: TagId[]): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      // Clear existing tags for this note
      await this.db.runAsync(`DELETE FROM note_tags WHERE note_id = ?`, [noteId]);

      // Insert new ones
      for (const tagId of tagIds) {
        await this.db.runAsync(
          `INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`,
          [noteId, tagId]
        );
      }
    });
  }

  async getTagsForNote(noteId: string): Promise<TagId[]> {
    const rows = await this.db.getAllAsync<{ tag_id: string }>(
      `SELECT tag_id FROM note_tags WHERE note_id = ?`,
      [noteId]
    );
    return rows.map(r => r.tag_id);
  }

  async getNotesForTag(tagId: TagId): Promise<string[]> {
    const rows = await this.db.getAllAsync<{ note_id: string }>(
      `SELECT note_id FROM note_tags WHERE tag_id = ?`,
      [tagId]
    );
    return rows.map(r => r.note_id);
  }
}
