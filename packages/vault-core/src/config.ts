import type { VaultDescriptor } from '@liminal-notes/core-shared/vault/types';

export type VaultLocatorMeta = {
  kind: 'path' | 'saf' | 'bookmark' | 'sandbox';
  displayValue?: string;
  permissionsOk?: boolean;
  needsReauth?: boolean;
};

/**
 * Platform-specific adapter for reading and persisting vault configuration.
 * Keeps platform details (paths, SAF URIs, bookmarks) out of core callers.
 */
export interface VaultConfigAdapter {
  getActiveVault(): Promise<VaultDescriptor | null>;
  setActiveVault(descriptor: VaultDescriptor): Promise<VaultDescriptor>;
  reset(): Promise<void>;
  resolveAbsolutePath(relativePath: string): Promise<string | null>;

  getDisplayName?(): Promise<string | null>;
  getLocatorMeta?(): Promise<VaultLocatorMeta>;
  getRootIdentifier?(): Promise<string | null>;
}
