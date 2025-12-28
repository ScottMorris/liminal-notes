import * as SQLite from 'expo-sqlite';

const DB_NAME = 'index.db';
const SCHEMA_VERSION = 1;

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  return await SQLite.openDatabaseAsync(DB_NAME);
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  const userVersion = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = userVersion?.user_version || 0;

  if (currentVersion >= SCHEMA_VERSION) {
    return;
  }

  // Detect FTS5 support
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let ftsVersion = 'fts5';
  try {
    // Attempt to create a dummy FTS5 table to check support
    await db.execAsync('CREATE VIRTUAL TABLE IF NOT EXISTS _fts_check USING fts5(content); DROP TABLE _fts_check;');
  } catch (e) {
    console.warn('FTS5 not supported, falling back to simple search table or FTS4', e);
    // For now, we'll try FTS4 or just stick to FTS5 as Expo usually supports it.
  }

  await db.withTransactionAsync(async () => {
    // 1. Notes Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT,
        updated_at INTEGER
      );
    `);

    // 2. Links Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS links (
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        target_id TEXT, -- Resolved ID (optional if we only store raw path, but useful for backlinks)
        PRIMARY KEY (source, target)
      );
      CREATE INDEX IF NOT EXISTS idx_links_source ON links(source);
      CREATE INDEX IF NOT EXISTS idx_links_target_id ON links(target_id);
    `);

    // 3. Search Index (FTS5)
    // We store content in FTS table for searchability
    await db.execAsync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
        id UNINDEXED,
        title,
        content
      );
    `);

    // Update version
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
}

// Helper to clear database (for debugging/reset)
export async function clearDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.closeAsync();
    await SQLite.deleteDatabaseAsync(DB_NAME);
}
