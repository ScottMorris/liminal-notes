import type { NoteId } from '@liminal-notes/core-shared/src/types';

/**
 * The type of a vault entry.
 */
export type VaultEntryType = 'file' | 'directory';

/**
 * Represents a file entry in the vault.
 */
export interface VaultFileEntry {
  /** The vault-relative path (e.g., 'folder/note.md'). */
  id: NoteId;
  /** The type of the entry. */
  type: VaultEntryType;
  /** The modification time in milliseconds. */
  mtimeMs?: number;
  /** The size of the file in bytes. */
  sizeBytes?: number;
}

/**
 * Basic file statistics.
 */
export interface VaultStat {
  /** The modification time in milliseconds. */
  mtimeMs: number;
  /** The size of the file in bytes. */
  size: number;
  /** Whether the item is a file. */
  isFile: boolean;
  /** Whether the item is a directory. */
  isDirectory: boolean;
}

/**
 * Options for listing files.
 */
export interface ListFilesOptions {
  /** Whether to include hidden files (starting with .). */
  includeHidden?: boolean;
  /** Filter by file extensions (e.g., ['.md']). */
  extensions?: string[];
}

/**
 * Options for writing a note.
 */
export interface WriteNoteOptions {
  /** Whether to create parent directories if they don't exist. */
  createParents?: boolean;
}

/**
 * Result of a read operation.
 */
export interface ReadNoteResult {
  /** The note ID. */
  id: NoteId;
  /** The string content of the note. */
  content: string;
  /** The modification time in milliseconds. */
  mtimeMs?: number;
}

/**
 * Result of a write operation.
 */
export interface WriteNoteResult {
  /** The note ID. */
  id: NoteId;
  /** The modification time in milliseconds. */
  mtimeMs?: number;
}

/**
 * Platform-agnostic interface for accessing a vault.
 *
 * This adapter abstracts filesystem operations, allowing the same core logic
 * to work on Desktop (Node.js/Rust) and Mobile (React Native/Expo).
 */
export interface VaultAdapter {
  /**
   * Lists files in the vault.
   *
   * @param opts - Options for filtering the list.
   * @returns A promise resolving to a list of file entries.
   */
  listFiles(opts?: ListFilesOptions): Promise<VaultFileEntry[]>;

  /**
   * Reads a note from the vault.
   *
   * @param id - The note ID (vault-relative path).
   * @returns A promise resolving to the note content and metadata.
   */
  readNote(id: NoteId): Promise<ReadNoteResult>;

  /**
   * Writes a note to the vault.
   *
   * @param id - The note ID (vault-relative path).
   * @param content - The new content string.
   * @param opts - Options for the write operation.
   * @returns A promise resolving to the write result.
   */
  writeNote(id: NoteId, content: string, opts?: WriteNoteOptions): Promise<WriteNoteResult>;

  /**
   * Renames a note or directory.
   *
   * @param from - The current path.
   * @param to - The new path.
   */
  rename?(from: NoteId, to: NoteId): Promise<void>;

  /**
   * Gets statistics for a file or directory.
   *
   * @param id - The path relative to the vault root.
   * @returns A promise resolving to the file statistics.
   */
  stat?(id: string): Promise<VaultStat>;

  /**
   * Creates a directory.
   *
   * @param dir - The directory path relative to the vault root.
   * @param opts - Options for directory creation.
   */
  mkdir?(dir: string, opts?: { recursive?: boolean }): Promise<void>;
}
