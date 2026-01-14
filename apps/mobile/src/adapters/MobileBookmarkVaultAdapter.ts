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
import { resolveBookmark, releaseAccess } from 'ios-bookmarks';

/**
 * Mobile implementation of the VaultAdapter using iOS FileSystem with Security Scoped Bookmarks.
 */
export class MobileBookmarkVaultAdapter implements VaultAdapter {
  private readonly bookmark: string;
  private rootUri: string | null = null;

  constructor(bookmarkBase64: string) {
    this.bookmark = bookmarkBase64;
  }

  async init(): Promise<void> {
    if (this.rootUri) return;

    try {
        // Resolve and start accessing
        const uri = await resolveBookmark(this.bookmark);
        this.rootUri = uri;

        const info = await FileSystem.getInfoAsync(this.rootUri);
        if (!info.exists) {
            throw new FileNotFoundError(`Resolved URI not found or inaccessible: ${this.rootUri}`);
        }
    } catch (e) {
        console.error("Failed to resolve bookmark", e);
        throw e;
    }
  }

  // Helper to ensure we have a root URI
  private getRoot(): string {
      if (!this.rootUri) {
          throw new Error("VaultAdapter not initialized. Call init() first.");
      }
      return this.rootUri;
  }

  async listFiles(opts?: ListFilesOptions): Promise<VaultFileEntry[]> {
    const root = this.getRoot();
    const entries: VaultFileEntry[] = [];

    const traverse = async (dirUri: string, relativePath: string) => {
        try {
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

    await traverse(root, '');
    return entries.sort((a, b) => a.id.localeCompare(b.id));
  }

  async readNote(id: NoteId): Promise<ReadNoteResult> {
    const root = this.getRoot();
    const uri = root.endsWith('/') ? `${root}${id}` : `${root}/${id}`;

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
    const root = this.getRoot();
    const uri = root.endsWith('/') ? `${root}${id}` : `${root}/${id}`;
    const segments = id.split('/');

    // Check parents
    if (segments.length > 1) {
        const parentPath = segments.slice(0, -1).join('/');
        const parentUri = root.endsWith('/') ? `${root}${parentPath}` : `${root}/${parentPath}`;

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
    const root = this.getRoot();
    const fromUri = root.endsWith('/') ? `${root}${from}` : `${root}/${from}`;
    const toUri = root.endsWith('/') ? `${root}${to}` : `${root}/${to}`;

    const fromInfo = await FileSystem.getInfoAsync(fromUri);
    if (!fromInfo.exists) throw new FileNotFoundError(from);

    const toInfo = await FileSystem.getInfoAsync(toUri);
    if (toInfo.exists) throw new FileExistsError(to);

    // Check parent of destination
    const toSegments = to.split('/');
    if (toSegments.length > 1) {
        const parentPath = toSegments.slice(0, -1).join('/');
        const parentUri = root.endsWith('/') ? `${root}${parentPath}` : `${root}/${parentPath}`;
        const parentInfo = await FileSystem.getInfoAsync(parentUri);
        if (!parentInfo.exists) {
            await FileSystem.makeDirectoryAsync(parentUri, { intermediates: true });
        }
    }

    await FileSystem.moveAsync({ from: fromUri, to: toUri });
  }

  async stat(id: string): Promise<VaultStat> {
    const root = this.getRoot();
    const uri = root.endsWith('/') ? `${root}${id}` : `${root}/${id}`;
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
    const root = this.getRoot();
    const uri = root.endsWith('/') ? `${root}${dirPath}` : `${root}/${dirPath}`;
    await FileSystem.makeDirectoryAsync(uri, { intermediates: opts?.recursive });
  }
}
