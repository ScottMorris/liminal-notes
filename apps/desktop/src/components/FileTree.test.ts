import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildMovedPath,
  canDropPathIntoDirectory,
  createEmptySpaceMenuModel,
  registerFileTreeRefreshListeners
} from './FileTree';

describe('registerFileTreeRefreshListeners', () => {
  const callbacks = new Map<string, () => void>();
  const unlistenMocks: Array<ReturnType<typeof vi.fn>> = [];
  const onRefresh = vi.fn(async () => {});

  const listenSpy = vi.fn(async (event: string, handler: () => void) => {
    callbacks.set(event, handler);
    const unlisten = vi.fn();
    unlistenMocks.push(unlisten);
    return unlisten;
  });

  beforeEach(() => {
    callbacks.clear();
    unlistenMocks.length = 0;
    onRefresh.mockClear();
    listenSpy.mockClear();
  });

  it('subscribes to created and deleted events only', async () => {
    const cleanup = registerFileTreeRefreshListeners(listenSpy, onRefresh);

    expect(listenSpy).toHaveBeenCalledTimes(2);
    expect(callbacks.has('vault:file-created')).toBe(true);
    expect(callbacks.has('vault:file-deleted')).toBe(true);
    expect(callbacks.has('vault:file-modified')).toBe(false);

    callbacks.get('vault:file-created')?.();
    callbacks.get('vault:file-deleted')?.();

    expect(onRefresh).toHaveBeenCalledTimes(2);

    cleanup();
    await Promise.resolve();

    expect(unlistenMocks).toHaveLength(2);
    unlistenMocks.forEach((unlisten) => {
      expect(unlisten).toHaveBeenCalledTimes(1);
    });
  });
});

describe('createEmptySpaceMenuModel', () => {
  it('creates add-note and add-folder entries with actions', () => {
    const onAddNote = vi.fn();
    const onAddFolder = vi.fn();

    const model = createEmptySpaceMenuModel(onAddNote, onAddFolder);

    expect(model.sections).toHaveLength(1);
    const items = model.sections[0]?.items;
    expect(items).toHaveLength(2);

    const addNote = items?.[0];
    const addFolder = items?.[1];

    if (!addNote || !addFolder || !('action' in addNote) || !('action' in addFolder)) {
      throw new Error('Menu model shape mismatch');
    }

    expect(addNote.id).toBe('fileTree.empty.addNote');
    expect(addNote.label).toBe('Add New Note');
    expect(addFolder.id).toBe('fileTree.empty.addFolder');
    expect(addFolder.label).toBe('Add New Folder');

    addNote.action?.();
    addFolder.action?.();

    expect(onAddNote).toHaveBeenCalledTimes(1);
    expect(onAddFolder).toHaveBeenCalledTimes(1);
  });
});

describe('buildMovedPath', () => {
  it('builds destination path using source basename under target folder', () => {
    expect(buildMovedPath('notes/today.md', 'archive')).toBe('archive/today.md');
    expect(buildMovedPath('projects', 'archive')).toBe('archive/projects');
  });
});

describe('canDropPathIntoDirectory', () => {
  it('allows moving into a different folder', () => {
    expect(canDropPathIntoDirectory('notes/today.md', 'archive')).toBe(true);
  });

  it('blocks dropping on same parent folder', () => {
    expect(canDropPathIntoDirectory('notes/today.md', 'notes')).toBe(false);
  });

  it('blocks dropping onto itself or a child folder', () => {
    expect(canDropPathIntoDirectory('notes', 'notes')).toBe(false);
    expect(canDropPathIntoDirectory('notes', 'notes/subfolder')).toBe(false);
  });
});
