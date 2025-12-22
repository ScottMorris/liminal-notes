import type {
  VaultAdapter,
  VaultFileEntry,
  ListFilesOptions,
  ReadNoteResult,
  WriteNoteResult,
  WriteNoteOptions
} from '@liminal-notes/vault-core/src/types';
import type { NoteId } from '@liminal-notes/core-shared/src/types';
import {
  readNote,
  writeNote,
  listMarkdownFiles,
  renameItem
} from '../ipc';

/**
 * Desktop implementation of the VaultAdapter.
 * Wraps existing Tauri IPC commands.
 */
class DesktopVaultAdapter implements VaultAdapter {

  async listFiles(opts?: ListFilesOptions): Promise<VaultFileEntry[]> {
    // Current desktop IPC is hardcoded to Markdown files and folders.
    // If we need to support other extensions or filters,
    // we might need to modify the backend or filter here.

    const files = await listMarkdownFiles();

    return files.map(f => ({
      id: f.path,
      type: f.is_dir ? 'directory' : 'file',
      mtimeMs: f.mtime,
      // sizeBytes is not returned by current IPC
    }));
  }

  async readNote(id: NoteId): Promise<ReadNoteResult> {
    const content = await readNote(id);
    return {
      id,
      content,
      // mtimeMs is not returned by current readNote IPC
    };
  }

  async writeNote(id: NoteId, content: string, _opts?: WriteNoteOptions): Promise<WriteNoteResult> {
    await writeNote(id, content);
    return {
      id,
      // mtimeMs is not returned by current writeNote IPC
    };
  }

  async rename(from: NoteId, to: NoteId): Promise<void> {
    await renameItem(from, to);
  }
}

// Export a singleton instance
export const desktopVault = new DesktopVaultAdapter();
