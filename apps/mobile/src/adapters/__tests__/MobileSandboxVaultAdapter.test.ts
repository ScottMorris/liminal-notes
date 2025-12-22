import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoteId } from '@liminal-notes/core-shared/src/types';

// 1. Define mock types for our simulated file system
type MockFileSystemItem = {
    name: string;
    exists: boolean;
    modificationTime?: number | null;
    size?: number;
    // For files
    textSync?: () => string;
    write?: (content: string) => void;
    move?: (dest: any) => void;
    // For directories
    list?: () => any[];
    create?: (opts?: any) => void;
};

// 2. Global state for our mock file system
let mockFileSystemState: Record<string, MockFileSystemItem> = {};

// Helper to reset state
function resetMockState() {
    mockFileSystemState = {
        'vault': { name: 'vault', exists: false, list: () => [], create: () => {} }
    };
}

// 3. Mock the expo-file-system module
vi.mock('expo-file-system', () => {
    class MockDirectory {
        name: string;
        path: string[];

        constructor(...args: any[]) {
            // Simplified path handling: flatten args into a key
            // args[0] might be a Directory or string
            // We'll just assume for this mock that we can form a simple key
            this.path = args.map(a => a instanceof MockDirectory ? a.name : String(a));
            this.name = this.path[this.path.length - 1] || 'root';
        }

        get _key() {
             // In a real mock we'd handle full paths, but for unit tests we can simplify
             // If the last segment matches a key in our state, use it
             return this.name;
        }

        get exists() {
            return mockFileSystemState[this._key]?.exists ?? false;
        }

        create(opts?: any) {
            if (!mockFileSystemState[this._key]) {
                 mockFileSystemState[this._key] = { name: this.name, exists: true, list: () => [], create: () => {} };
            }
            mockFileSystemState[this._key].exists = true;
        }

        list() {
            // Return files that "belong" to this directory
            // For this simple mock, we'll just check a global "children" registry or similar
            // But let's just make the test define what .list() returns for a specific dir instance
            // We can check if the mocked item has a list function
            return mockFileSystemState[this._key]?.list?.() || [];
        }

        get modificationTime() { return mockFileSystemState[this._key]?.modificationTime; }
    }

    class MockFile {
        name: string;
        path: string[];

        constructor(...args: any[]) {
            this.path = args.map(a => (a && (a instanceof MockDirectory || a instanceof MockFile)) ? a.name : String(a));
            this.name = this.path[this.path.length - 1];
        }

        get _key() { return this.name; }

        get exists() {
            return mockFileSystemState[this._key]?.exists ?? false;
        }

        textSync() {
            return mockFileSystemState[this._key]?.textSync?.() || '';
        }

        write(content: string) {
            // Update state
             if (!mockFileSystemState[this._key]) {
                 mockFileSystemState[this._key] = { name: this.name, exists: true };
            }
            mockFileSystemState[this._key].exists = true;
            mockFileSystemState[this._key].textSync = () => content;
            mockFileSystemState[this._key].write = vi.fn(); // track calls

            // Call the spy if it exists
            const spy = mockFileSystemState[this._key].write;
            if (spy) spy(content);
        }

        move(dest: any) {
             const spy = mockFileSystemState[this._key]?.move;
             if (spy) spy(dest);
        }

        get modificationTime() { return mockFileSystemState[this._key]?.modificationTime; }
        get size() { return mockFileSystemState[this._key]?.size ?? 0; }
    }

    return {
        File: MockFile,
        Directory: MockDirectory,
        Paths: { document: 'DOCS' }
    };
});

// Import after mocking
import { MobileSandboxVaultAdapter } from '../MobileSandboxVaultAdapter';
import { File, Directory } from 'expo-file-system';

describe('MobileSandboxVaultAdapter', () => {
  let adapter: MobileSandboxVaultAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();
    adapter = new MobileSandboxVaultAdapter();
  });

  describe('init', () => {
    it('creates root directory if missing', async () => {
      mockFileSystemState['vault'].exists = false;
      await adapter.init();
      expect(mockFileSystemState['vault'].exists).toBe(true);
    });

    it('does not error if root directory exists', async () => {
      mockFileSystemState['vault'].exists = true;
      await adapter.init();
      expect(mockFileSystemState['vault'].exists).toBe(true);
    });
  });

  describe('listFiles', () => {
    it('returns flat list of markdown files', async () => {
       mockFileSystemState['vault'].exists = true;

       // Setup children
       const file1 = new File('file1.md');
       // We need to register file1 in state so it has props
       mockFileSystemState['file1.md'] = {
           name: 'file1.md',
           exists: true,
           modificationTime: 1000,
           size: 100
       };

       // Mock the list function of the root vault
       mockFileSystemState['vault'].list = () => [
           // The adapter expects File/Directory instances returned from list()
           // Since we mocked the class, we can return instances of our MockFile
           new File('file1.md')
       ];

       const files = await adapter.listFiles();
       expect(files).toHaveLength(1);
       expect(files[0].id).toBe('file1.md');
       expect(files[0].mtimeMs).toBe(1000);
    });
  });

  describe('readNote', () => {
      it('reads existing note', async () => {
          mockFileSystemState['test.md'] = {
              name: 'test.md',
              exists: true,
              textSync: () => 'content',
              modificationTime: 123
          };

          const res = await adapter.readNote('test.md' as NoteId);
          expect(res.content).toBe('content');
      });

      it('throws on missing note', async () => {
          // ensure 'missing.md' is not in state or exists=false
          await expect(adapter.readNote('missing.md' as NoteId)).rejects.toThrow();
      });
  });

  describe('writeNote', () => {
      it('writes content', async () => {
          // Pre-seed the entry so we can spy on it
          const writeSpy = vi.fn();
          mockFileSystemState['test.md'] = {
              name: 'test.md',
              exists: false, // will be created
              write: writeSpy
          };

          await adapter.writeNote('test.md' as NoteId, 'new content');

          // The adapter calls file.write('new content')
          // Our mock implementation calls the spy in state
          expect(mockFileSystemState['test.md'].textSync?.()).toBe('new content');
      });
  });
});
