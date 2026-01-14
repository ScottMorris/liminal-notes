import { VaultConfigAdapter, VaultLocatorMeta } from '@liminal-notes/vault-core/config';
import { VaultDescriptor } from '@liminal-notes/vault-core/vault/types';
import kv from '../storage/kv';
import { STORAGE_KEYS } from '../storage/keys';

export class MobileVaultConfigAdapter implements VaultConfigAdapter {
  async getActiveVault(): Promise<VaultDescriptor | null> {
    try {
      return await kv.getJSON<VaultDescriptor>(STORAGE_KEYS.ACTIVE_VAULT);
    } catch (e) {
      console.error('Failed to load active vault config', e);
      return null;
    }
  }

  async setActiveVault(descriptor: VaultDescriptor): Promise<VaultDescriptor> {
    await kv.setJSON(STORAGE_KEYS.ACTIVE_VAULT, descriptor);
    return descriptor;
  }

  async reset(): Promise<void> {
    await kv.removeItem(STORAGE_KEYS.ACTIVE_VAULT);
  }

  async resolveAbsolutePath(relativePath: string): Promise<string | null> {
    // Mobile often works with Content URIs which aren't standard paths.
    // For sandbox, we could resolve to cache dir, but usually we don't need this for core logic.
    return null;
  }

  async getDisplayName(): Promise<string | null> {
    const vault = await this.getActiveVault();
    return vault?.displayName ?? null;
  }

  async getLocatorMeta(): Promise<VaultLocatorMeta> {
     const vault = await this.getActiveVault();
     if (!vault) {
         return { kind: 'path', permissionsOk: false };
     }

     return {
         kind: vault.locator.scheme as 'saf' | 'bookmark' | 'sandbox',
         displayValue: vault.displayName,
         // Validation happens during Adapter initialization usually,
         // but we can default to true here.
         permissionsOk: true
     };
  }
}
