import { VaultAdapter } from '@liminal-notes/vault-core/types';

export interface FileWatcherBinder {
  init: () => Promise<void>;
  bindVault: (adapter: VaultAdapter, vaultId: string) => Promise<void>;
}

export async function bindFileWatcherToVault(
  watcher: FileWatcherBinder,
  adapter: VaultAdapter,
  vaultId: string
): Promise<void> {
  await watcher.init();
  await watcher.bindVault(adapter, vaultId);
}
