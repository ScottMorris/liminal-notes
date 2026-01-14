import {
  VaultAdapter,
  VaultFileEntry,
  ListFilesOptions,
  ReadNoteResult,
  WriteNoteResult,
  WriteNoteOptions,
  VaultStat
} from '@liminal-notes/vault-core/types';
import { NoteId } from '@liminal-notes/core-shared/types';
import * as FileSystem from 'expo-file-system';
import { FileNotFoundError, FileExistsError } from '../errors';

/**
 * Mobile implementation of the VaultAdapter using iOS FileSystem (Bookmarks/Picker URIs).
 *
 * Note: On iOS, `expo-document-picker` returns a URI that might be temporary or valid only
 * for the current session unless security-scoped bookmarks are used.
 * Standard `expo-file-system` does not support creating/resolving security-scoped bookmarks.
 * This adapter attempts to work with the provided URI as-is, which works for the session
 * but may fail after app restart if the OS invalidates permission.
 */
export class MobileBookmarkVaultAdapter implements VaultAdapter {
  private readonly rootUri: string;

  constructor(bookmarkOrUri: string) {
    // In a full implementation, this would resolve the bookmark to a URI.
    // For now, we assume we are passed the URI directly.
    this.rootUri = bookmarkOrUri;
  }

  async init(): Promise<void> {
    const info = await FileSystem.getInfoAsync(this.rootUri);
    if (!info.exists) {
        throw new FileNotFoundError(`Root URI not found or inaccessible: ${this.rootUri}`);
    }
  }

  async listFiles(opts?: ListFilesOptions): Promise<VaultFileEntry[]> {
    const entries: VaultFileEntry[] = [];

    // Recursive helper similar to Sandbox
    const traverse = async (dirUri: string, relativePath: string) => {
        try {
            // readDirectoryAsync returns file NAMES, not full URIs, for standard file://
            // Check if this holds for picker URIs. usually yes.
            const itemNames = await FileSystem.readDirectoryAsync(dirUri);

            for (const name of itemNames) {
                if (name.startsWith('.') && !opts?.includeHidden) continue;

                const itemUri = dirUri.endsWith('/') ? `${dirUri}${name}` : `${dirUri}/${name}`;
                const itemRelativePath = relativePath ? `${relativePath}/${name}` : name;

                const info = await FileSystem.getInfoAsync(itemUri);

                if (info.exists) {
                    if (info.isDirectory) {
                         entries.push({
                             id: itemRelativePath as NoteId,
                             type: 'directory',
                             mtimeMs: info.modificationTime,
                             sizeBytes: 0
                         });
                         await traverse(itemUri, itemRelativePath);
                    } else {
                        const isMarkdown = name.toLowerCase().endsWith('.md');
                        if (isMarkdown) {
                            entries.push({
                                id: itemRelativePath as NoteId,
                                type: 'file',
                                mtimeMs: info.modificationTime,
                                sizeBytes: info.size
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn(`Error traversing URI ${dirUri}:`, e);
        }
    };

    await traverse(this.rootUri, '');
    return entries.sort((a, b) => a.id.localeCompare(b.id));
  }

  async readNote(id: NoteId): Promise<ReadNoteResult> {
    const uri = this.rootUri.endsWith('/') ? `${this.rootUri}${id}` : `${this.rootUri}/${id}`;

    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
        throw new FileNotFoundError(id);
    }

    const content = await FileSystem.readAsStringAsync(uri);

    return {
      id,
      content,
      mtimeMs: info.modificationTime,
    };
  }

  async writeNote(id: NoteId, content: string, opts?: WriteNoteOptions): Promise<WriteNoteResult> {
    const uri = this.rootUri.endsWith('/') ? `${this.rootUri}${id}` : `${this.rootUri}/${id}`;
    const segments = id.split('/');

    // Check parents
    if (segments.length > 1) {
        const parentPath = segments.slice(0, -1).join('/');
        const parentUri = this.rootUri.endsWith('/') ? `${this.rootUri}${parentPath}` : `${this.rootUri}/${parentPath}`;

        const parentInfo = await FileSystem.getInfoAsync(parentUri);
        if (!parentInfo.exists) {
            if (opts?.createParents) {
                await FileSystem.makeDirectoryAsync(parentUri, { intermediates: true });
            } else {
                throw new FileNotFoundError(`Parent directory not found for ${id}`);
            }
        }
    }

    await FileSystem.writeAsStringAsync(uri, content);

    const info = await FileSystem.getInfoAsync(uri);

    return {
      id,
      mtimeMs: info.exists ? info.modificationTime : undefined
    };
  }

  async rename(from: NoteId, to: NoteId): Promise<void> {
    const fromUri = this.rootUri.endsWith('/') ? `${this.rootUri}${from}` : `${this.rootUri}/${from}`;
    const toUri = this.rootUri.endsWith('/') ? `${this.rootUri}${to}` : `${this.rootUri}/${to}`;

    const fromInfo = await FileSystem.getInfoAsync(fromUri);
    if (!fromInfo.exists) throw new FileNotFoundError(from);

    const toInfo = await FileSystem.getInfoAsync(toUri);
    if (toInfo.exists) throw new FileExistsError(to);

    // Check parent of destination
    const toSegments = to.split('/');
    if (toSegments.length > 1) {
        const parentPath = toSegments.slice(0, -1).join('/');
        const parentUri = this.rootUri.endsWith('/') ? `${this.rootUri}${parentPath}` : `${this.rootUri}/${parentPath}`;
        const parentInfo = await FileSystem.getInfoAsync(parentUri);
        if (!parentInfo.exists) {
            await FileSystem.makeDirectoryAsync(parentUri, { intermediates: true });
        }
    }

    // Expo FileSystem moveAsync works with file:// URIs
    await FileSystem.moveAsync({ from: fromUri, to: toUri });
  }

  async stat(id: string): Promise<VaultStat> {
    const uri = this.rootUri.endsWith('/') ? `${this.rootUri}${id}` : `${this.rootUri}/${id}`;
    const info = await FileSystem.getInfoAsync(uri);

    if (!info.exists) {
        throw new FileNotFoundError(id);
    }

    return {
        mtimeMs: info.modificationTime,
        size: info.size,
        isFile: !info.isDirectory,
        isDirectory: info.isDirectory
    };
  }

  async mkdir(dirPath: string, opts?: { recursive?: boolean }): Promise<void> {
    const uri = this.rootUri.endsWith('/') ? `${this.rootUri}${dirPath}` : `${this.rootUri}/${dirPath}`;
    await FileSystem.makeDirectoryAsync(uri, { intermediates: opts?.recursive });
  }
}
