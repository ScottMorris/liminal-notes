import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VaultAdapter, VaultFileEntry } from '@liminal-notes/vault-core/types';
import { FileWatcherServiceCore } from './fileWatcherCore';

function createAdapter(initialFiles: VaultFileEntry[]): VaultAdapter & {
  listFiles: ReturnType<typeof vi.fn>;
  init: ReturnType<typeof vi.fn>;
  stat: ReturnType<typeof vi.fn>;
} {
  const listFiles = vi.fn(async () => initialFiles);
  const init = vi.fn(async () => {});
  const stat = vi.fn(async () => ({
    mtimeMs: 0,
    size: 0,
    isFile: true,
    isDirectory: false,
  }));

  return {
    init,
    listFiles,
    stat,
    readNote: vi.fn(async (id: string) => ({ id, content: '' })),
    writeNote: vi.fn(async (id: string) => ({ id })),
  };
}

describe('FileWatcherService', () => {
  const emitMock = vi.fn();
  const addEventListenerMock = vi.fn();

  const appState = {
    currentState: 'active',
    addEventListener: addEventListenerMock,
  };

  const emitter = {
    emit: emitMock,
  };

  beforeEach(() => {
    emitMock.mockClear();
    addEventListenerMock.mockClear();
  });

  it('scans the bound adapter and emits modified events', async () => {
    const adapter = createAdapter([{ id: 'note.md', type: 'file', mtimeMs: 1 }]);
    const watcher = new FileWatcherServiceCore(appState, emitter);

    await watcher.init();
    await watcher.bindVault(adapter, 'vault-a');

    emitMock.mockClear();
    adapter.listFiles.mockResolvedValueOnce([{ id: 'note.md', type: 'file', mtimeMs: 2 }]);
    await watcher.performScan();

    expect(adapter.listFiles).toHaveBeenCalled();
    expect(emitMock).toHaveBeenCalledWith('vault:file-event', { type: 'modified', path: 'note.md' });
  });

  it('rebinds to a new adapter when active vault changes', async () => {
    const adapterA = createAdapter([{ id: 'old.md', type: 'file', mtimeMs: 1 }]);
    const adapterB = createAdapter([{ id: 'new.md', type: 'file', mtimeMs: 1 }]);
    const watcher = new FileWatcherServiceCore(appState, emitter);

    await watcher.init();
    await watcher.bindVault(adapterA, 'vault-a');
    await watcher.bindVault(adapterB, 'vault-b');

    emitMock.mockClear();
    adapterB.listFiles.mockResolvedValueOnce([{ id: 'new.md', type: 'file', mtimeMs: 2 }]);
    await watcher.performScan();

    expect(adapterB.listFiles).toHaveBeenCalled();
    expect(emitMock).toHaveBeenCalledWith('vault:file-event', { type: 'modified', path: 'new.md' });
    expect(emitMock).not.toHaveBeenCalledWith('vault:file-event', { type: 'modified', path: 'old.md' });
  });

  it('uses bound adapter stat in notifyInternalWrite to avoid false modified emit', async () => {
    const adapter = createAdapter([{ id: 'note.md', type: 'file', mtimeMs: 1 }]);
    adapter.stat.mockResolvedValueOnce({
      mtimeMs: 5,
      size: 0,
      isFile: true,
      isDirectory: false,
    });
    const watcher = new FileWatcherServiceCore(appState, emitter);

    await watcher.init();
    await watcher.bindVault(adapter, 'vault-a');
    await watcher.notifyInternalWrite('note.md');

    emitMock.mockClear();
    adapter.listFiles.mockResolvedValueOnce([{ id: 'note.md', type: 'file', mtimeMs: 5 }]);
    await watcher.performScan();

    expect(adapter.stat).toHaveBeenCalledWith('note.md');
    expect(emitMock).not.toHaveBeenCalled();
  });
});
