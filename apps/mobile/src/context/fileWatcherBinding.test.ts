import { describe, expect, it, vi } from 'vitest';
import { bindFileWatcherToVault } from './fileWatcherBinding';
import type { VaultAdapter } from '@liminal-notes/vault-core/types';

function createAdapter(): VaultAdapter {
  return {
    listFiles: vi.fn(async () => []),
    readNote: vi.fn(async () => ({ id: 'a.md', content: '' })),
    writeNote: vi.fn(async () => ({ id: 'a.md' })),
  };
}

describe('bindFileWatcherToVault', () => {
  it('initialises watcher and binds active vault adapter', async () => {
    const watcher = {
      init: vi.fn(async () => {}),
      bindVault: vi.fn(async () => {}),
    };
    const adapter = createAdapter();

    await bindFileWatcherToVault(watcher, adapter, 'vault-1');

    expect(watcher.init).toHaveBeenCalledTimes(1);
    expect(watcher.bindVault).toHaveBeenCalledWith(adapter, 'vault-1');
  });
});
