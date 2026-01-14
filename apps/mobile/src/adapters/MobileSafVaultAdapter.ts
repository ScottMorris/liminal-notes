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
import { FileNotFoundError } from '../errors';

// SAF is Android only, and exported from expo-file-system
// We cast to any to avoid TS errors if types are missing in this specific setup/platform check
const StorageAccessFramework = (FileSystem as any).StorageAccessFramework;

/**
 * Mobile implementation of the VaultAdapter using Android Storage Access Framework (SAF).
 */
export class MobileSafVaultAdapter implements VaultAdapter {
  private readonly treeUri: string;

  constructor(treeUri: string) {
    this.treeUri = treeUri;
  }

  async init(): Promise<void> {
     // No-op for now
  }

  async listFiles(opts?: ListFilesOptions): Promise<VaultFileEntry[]> {
    const entries: VaultFileEntry[] = [];

    // Recursive traversal
    const traverse = async (uri: string, relativePath: string) => {
        try {
            const files = await StorageAccessFramework.readDirectoryAsync(uri);

            for (const fileUri of files) {
                const info = await FileSystem.getInfoAsync(fileUri);
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
      let currentUri = this.treeUri;

      for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const children = await StorageAccessFramework.readDirectoryAsync(currentUri);
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

    const content = await StorageAccessFramework.readAsStringAsync(uri);
    const info = await FileSystem.getInfoAsync(uri);

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
          const children = await StorageAccessFramework.readDirectoryAsync(currentUri);
          let foundUri = children.find((u: string) => decodeURIComponent(u.split('%2F').pop() || '') === part);

          if (!foundUri) {
              if (opts?.createParents) {
                  foundUri = await StorageAccessFramework.createDirectoryAsync(currentUri, part);
              } else {
                  throw new FileNotFoundError(`Directory ${part} not found`);
              }
          }
          currentUri = foundUri;
      }

      const children = await StorageAccessFramework.readDirectoryAsync(currentUri);
      let fileUri = children.find((u: string) => decodeURIComponent(u.split('%2F').pop() || '') === fileName);

      if (fileUri) {
          await StorageAccessFramework.writeAsStringAsync(fileUri, content);
      } else {
          fileUri = await StorageAccessFramework.createFileAsync(currentUri, fileName, 'text/markdown');
          await StorageAccessFramework.writeAsStringAsync(fileUri, content);
      }

      const info = await FileSystem.getInfoAsync(fileUri);

      return {
          id,
          mtimeMs: info.exists ? info.modificationTime : undefined
      };
  }

  async rename(from: NoteId, to: NoteId): Promise<void> {
      throw new Error("Rename not supported in SAF adapter yet.");
  }

  async stat(id: string): Promise<VaultStat> {
    const uri = await this.findUriForPath(id);
    if (!uri) throw new FileNotFoundError(id);

    const info = await FileSystem.getInfoAsync(uri);
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
          const children = await StorageAccessFramework.readDirectoryAsync(currentUri);
          let foundUri = children.find((u: string) => decodeURIComponent(u.split('%2F').pop() || '') === part);

          if (!foundUri) {
             if (opts?.recursive) {
                 foundUri = await StorageAccessFramework.createDirectoryAsync(currentUri, part);
             } else {
                 throw new FileNotFoundError(`Parent directory for ${part} not found`);
             }
          }
          currentUri = foundUri;
      }
  }
}
