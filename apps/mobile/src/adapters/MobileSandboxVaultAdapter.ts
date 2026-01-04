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
import { assertSafeNotePath } from '@liminal-notes/vault-core/pathSafety';
import { File, Directory, Paths } from 'expo-file-system';

/**
 * Mobile implementation of the VaultAdapter using Expo FileSystem.
 * Operates in a sandbox directory.
 */
export class MobileSandboxVaultAdapter implements VaultAdapter {
  private readonly rootDir: Directory;

  constructor(customRoot?: Directory) {
    // Default to 'vault' subdirectory in documents
    // Note: The new API doesn't throw if directories don't exist until you try to use them
    this.rootDir = customRoot ?? new Directory(Paths.document, 'vault');
  }

  async init(): Promise<void> {
    if (!this.rootDir.exists) {
        this.rootDir.create();
    }
  }

  async listFiles(opts?: ListFilesOptions): Promise<VaultFileEntry[]> {
    const entries: VaultFileEntry[] = [];

    // Recursive helper
    const traverse = (dir: Directory, relativePath: string) => {
        if (!dir.exists) return;

        // .list() returns (File | Directory)[]
        const items = dir.list();

        for (const item of items) {
             // Skip hidden files/dirs if needed (simple dot check)
             if (item.name.startsWith('.')) continue;

             const itemRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name;

             if (item instanceof Directory) {
                 // Push directory entry first
                 // Note: Directory modification time access might vary, using safe cast
                 const mtime = (item as any).modificationTime;

                 entries.push({
                     id: itemRelativePath as NoteId, // Directories use path as ID too
                     type: 'directory',
                     mtimeMs: typeof mtime === 'number' ? mtime : undefined,
                     sizeBytes: 0
                 });

                 traverse(item, itemRelativePath);
             } else if (item instanceof File) {
                 const isMarkdown = item.name.toLowerCase().endsWith('.md');
                 // Only markdown files for now per requirements
                 if (isMarkdown) {
                     // Metadata access
                     const mtime = item.modificationTime;

                     entries.push({
                         id: itemRelativePath as NoteId,
                         type: 'file',
                         // item.modificationTime returns null | number
                         mtimeMs: typeof mtime === 'number' ? mtime : undefined,
                         sizeBytes: item.size
                     });
                 }
             }
        }
    };

    if (this.rootDir.exists) {
        traverse(this.rootDir, '');
    }

    return entries.sort((a, b) => a.id.localeCompare(b.id));
  }

  async readNote(id: NoteId): Promise<ReadNoteResult> {
    console.log(`[MobileSandboxVaultAdapter] Reading note: ${id}`);
    assertSafeNotePath(id);

    // Construct file from root + id
    // File constructor takes path segments
    const segments = id.split('/');
    const file = new File(this.rootDir, ...segments);

    if (!file.exists) {
        console.warn(`[MobileSandboxVaultAdapter] File not found: ${id}`);
        throw new Error(`File not found: ${id}`);
    }

    const content = file.textSync(); // or await file.text()
    console.log(`[MobileSandboxVaultAdapter] Read success: ${id} (${content.length} bytes)`);

    return {
      id,
      content,
      mtimeMs: typeof file.modificationTime === 'number' ? file.modificationTime : undefined,
    };
  }

  async writeNote(id: NoteId, content: string, opts?: WriteNoteOptions): Promise<WriteNoteResult> {
    console.log(`[MobileSandboxVaultAdapter] Writing note: ${id} (${content.length} bytes)`);
    assertSafeNotePath(id);
    const segments = id.split('/');
    const file = new File(this.rootDir, ...segments);

    // If file is in a subdirectory, ensure it exists
    if (segments.length > 1) {
        const parentSegments = segments.slice(0, -1);
        const parentDir = new Directory(this.rootDir, ...parentSegments);

        // Check if parent dir exists before trying to create it
        if (opts?.createParents && !parentDir.exists) {
            console.log(`[MobileSandboxVaultAdapter] Creating parent directory for ${id}`);
            parentDir.create({ intermediates: true });
        }
    }

    file.write(content);
    console.log(`[MobileSandboxVaultAdapter] Write success: ${id}`);

    return {
      id,
      mtimeMs: typeof file.modificationTime === 'number' ? file.modificationTime : undefined,
    };
  }

  async rename(from: NoteId, to: NoteId): Promise<void> {
    assertSafeNotePath(from);
    assertSafeNotePath(to);

    const fromSegments = from.split('/');
    const toSegments = to.split('/');

    const fromFile = new File(this.rootDir, ...fromSegments);
    const toFile = new File(this.rootDir, ...toSegments);

    // Check parent of destination
    if (toSegments.length > 1) {
        const parentSegments = toSegments.slice(0, -1);
        const parentDir = new Directory(this.rootDir, ...parentSegments);
        if (!parentDir.exists) {
             parentDir.create({ intermediates: true });
        }
    }

    // Move file
    // file.move() takes a Directory or File as destination.
    fromFile.move(toFile);
  }

  async stat(id: string): Promise<VaultStat> {
    // id could be file or directory
    const segments = id.split('/');

    // Check if it's a file first
    const file = new File(this.rootDir, ...segments);
    if (file.exists) {
        return {
            mtimeMs: typeof file.modificationTime === 'number' ? file.modificationTime : 0,
            size: file.size,
            isFile: true,
            isDirectory: false
        };
    }

    const dir = new Directory(this.rootDir, ...segments);
    if (dir.exists) {
        // cast to any because Typescript definitions for Directory.modificationTime seem inconsistent in this version
        const mtime = (dir as any).modificationTime;
        return {
             mtimeMs: typeof mtime === 'number' ? mtime : 0,
             size: 0,
             isFile: false,
             isDirectory: true
        };
    }

    throw new Error(`Item not found: ${id}`);
  }

  async mkdir(dirPath: string, opts?: { recursive?: boolean }): Promise<void> {
      const segments = dirPath.split('/');
      const dir = new Directory(this.rootDir, ...segments);
      dir.create({ intermediates: opts?.recursive });
  }
}
