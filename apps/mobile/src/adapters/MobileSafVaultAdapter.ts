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
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { FileNotFoundError, FileExistsError } from '../errors';

// SAF is Android only, and exported from expo-file-system legacy surface
const StorageAccessFramework = FileSystemLegacy.StorageAccessFramework;
type StorageAccessFrameworkApi = NonNullable<typeof StorageAccessFramework> & {
  createDirectoryAsync: (uri: string, dirName: string) => Promise<string>;
  createFileAsync: (uri: string, fileName: string, mimeType: string) => Promise<string>;
  deleteAsync?: (uri: string) => Promise<void>;
};

/**
 * Mobile implementation of the VaultAdapter using Android Storage Access Framework (SAF).
 */
export class MobileSafVaultAdapter implements VaultAdapter {
  private readonly treeUri: string;
  private readonly saf: StorageAccessFrameworkApi;

  constructor(treeUri: string) {
    this.treeUri = treeUri;
    const saf = StorageAccessFramework as StorageAccessFrameworkApi | undefined;
    if (!saf) {
      throw new Error('Storage Access Framework is unavailable on this platform. Use Android with expo-file-system SAF support.');
    }
    this.saf = saf;
  }

  async init(): Promise<void> {
     // No-op for now
  }

  async listFiles(opts?: ListFilesOptions): Promise<VaultFileEntry[]> {
    const entries: VaultFileEntry[] = [];

    // Recursive traversal
    const traverse = async (uri: string, relativePath: string) => {
        try {
            const files = await this.saf.readDirectoryAsync(uri);

            for (const fileUri of files) {
                const info = await FileSystemLegacy.getInfoAsync(fileUri);
                if (!info.exists) continue;

                const name = decodeURIComponent(fileUri.split('%2F').pop() || '');
                if (!name) continue;

                if (name.startsWith('.') && !opts?.includeHidden) continue;

                const itemRelativePath = relativePath ? `${relativePath}/${name}` : name;

                if (info.isDirectory) {
                   entries.push({
                       id: itemRelativePath as NoteId,
                       type: 'directory',
                       mtimeMs: info.modificationTime,
                       sizeBytes: 0
                   });
                   await traverse(fileUri, itemRelativePath);
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
        } catch (e) {
            console.warn(`Error traversing SAF URI ${uri}:`, e);
        }
    };

    await traverse(this.treeUri, '');
    return entries.sort((a, b) => a.id.localeCompare(b.id));
  }

  private async findUriForPath(path: string): Promise<string | null> {
      if (!path) return this.treeUri; // Root

      const parts = path.split('/');
      let currentUri: string = this.treeUri;

      for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const children = await this.saf.readDirectoryAsync(currentUri);
          let found = false;

          for (const childUri of children) {
              const name = decodeURIComponent(childUri.split('%2F').pop() || '');
              if (name === part) {
                  currentUri = childUri;
                  found = true;
                  break;
              }
          }

          if (!found) return null;
      }

      return currentUri;
  }

  async readNote(id: NoteId): Promise<ReadNoteResult> {
    const uri = await this.findUriForPath(id);
    if (!uri) throw new FileNotFoundError(id);

    const content = await this.saf.readAsStringAsync(uri);
    const info = await FileSystemLegacy.getInfoAsync(uri);

    return {
        id,
        content,
        mtimeMs: info.exists ? info.modificationTime : undefined
    };
  }

  async writeNote(id: NoteId, content: string, opts?: WriteNoteOptions): Promise<WriteNoteResult> {
      const parts = id.split('/');
      const fileName = parts.pop()!;

      let currentUri = this.treeUri;

      // Navigate/Create folders
      for (const part of parts) {
          const children = await this.saf.readDirectoryAsync(currentUri);
          let foundUri = children.find((u: string) => decodeURIComponent(u.split('%2F').pop() || '') === part);

          if (!foundUri) {
              if (opts?.createParents) {
                  foundUri = await this.saf.createDirectoryAsync(currentUri, part);
              } else {
                  throw new FileNotFoundError(`Directory ${part} not found`);
              }
          }
          currentUri = foundUri;
      }

      const children = await this.saf.readDirectoryAsync(currentUri);
      let fileUri = children.find((u: string) => decodeURIComponent(u.split('%2F').pop() || '') === fileName);

      if (fileUri) {
          await this.saf.writeAsStringAsync(fileUri, content);
      } else {
          fileUri = await this.saf.createFileAsync(currentUri, fileName, 'text/markdown');
          await this.saf.writeAsStringAsync(fileUri, content);
      }

      const info = await FileSystemLegacy.getInfoAsync(fileUri);

      return {
          id,
          mtimeMs: info.exists ? info.modificationTime : undefined
      };
  }

  async rename(from: NoteId, to: NoteId): Promise<void> {
      const fromUri = await this.findUriForPath(from);
      if (!fromUri) {
        throw new FileNotFoundError(from);
      }

      // Check destination does not exist
      const existingDest = await this.findUriForPath(to);
      if (existingDest) {
        throw new FileExistsError(to);
      }

      // Ensure parent directories for destination
      const toParts = to.split('/');
      const fileName = toParts.pop()!;
      let currentUri = this.treeUri;

      for (const part of toParts) {
        const children = await this.saf.readDirectoryAsync(currentUri);
        let foundUri = children.find((u: string) => decodeURIComponent(u.split('%2F').pop() || '') === part);

        if (!foundUri) {
          foundUri = await this.saf.createDirectoryAsync(currentUri, part);
        }
        currentUri = foundUri;
      }

      // Create new file and copy content
      const destChildren = await this.saf.readDirectoryAsync(currentUri);
      let destUri = destChildren.find((u: string) => decodeURIComponent(u.split('%2F').pop() || '') === fileName);
      if (!destUri) {
        destUri = await this.saf.createFileAsync(currentUri, fileName, 'text/markdown');
      } else {
        throw new FileExistsError(to);
      }

      const content = await this.saf.readAsStringAsync(fromUri);
      await this.saf.writeAsStringAsync(destUri, content);

      // Delete original
      if (typeof this.saf.deleteAsync === 'function') {
        await this.saf.deleteAsync(fromUri);
      }
  }

  async stat(id: string): Promise<VaultStat> {
    const uri = await this.findUriForPath(id);
    if (!uri) throw new FileNotFoundError(id);

    const info = await FileSystemLegacy.getInfoAsync(uri);
    if (!info.exists) throw new FileNotFoundError(id);

    return {
        mtimeMs: info.modificationTime,
        size: info.size,
        isFile: !info.isDirectory,
        isDirectory: info.isDirectory
    };
  }

  async mkdir(dirPath: string, opts?: { recursive?: boolean }): Promise<void> {
      const parts = dirPath.split('/');
      let currentUri = this.treeUri;

      for (const part of parts) {
          const children = await this.saf.readDirectoryAsync(currentUri);
          let foundUri = children.find((u: string) => decodeURIComponent(u.split('%2F').pop() || '') === part);

          if (!foundUri) {
              if (opts?.recursive) {
                 foundUri = await this.saf.createDirectoryAsync(currentUri, part);
              } else {
                 throw new FileNotFoundError(`Parent directory for ${part} not found`);
              }
          }
          currentUri = foundUri;
      }
  }
}
