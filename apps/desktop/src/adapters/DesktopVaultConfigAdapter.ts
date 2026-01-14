import type { VaultDescriptor } from '@liminal-notes/vault-core/vault/types';
import type { VaultConfigAdapter, VaultLocatorMeta } from '@liminal-notes/vault-core/config';
import { getVaultConfig, setVaultConfig, resetVaultConfig } from '../ipc';
import type { LegacyVaultConfig } from '../types';

const toDescriptor = (config: LegacyVaultConfig): VaultDescriptor => ({
  vaultId: config.root_path,
  displayName: config.name,
  kind: 'external',
  locator: {
    platform: 'desktop',
    scheme: 'path',
    rootPath: config.root_path,
  },
});

const toLegacy = (descriptor: VaultDescriptor): LegacyVaultConfig => {
  const locator = descriptor.locator;
  if (!(locator.platform === 'desktop' && locator.scheme === 'path')) {
    throw new Error('Desktop adapter only supports desktop path locators');
  }

  return {
    root_path: locator.rootPath,
    name: descriptor.displayName,
  };
};

const buildDescriptorFromPath = (rootPath: string, displayName: string): VaultDescriptor => ({
  vaultId: rootPath,
  displayName,
  kind: 'external',
  locator: {
    platform: 'desktop',
    scheme: 'path',
    rootPath,
  },
});

class DesktopVaultConfigAdapter implements VaultConfigAdapter {
  async getActiveVault(): Promise<VaultDescriptor | null> {
    const legacy = await getVaultConfig();
    if (!legacy) {
      return null;
    }
    return toDescriptor(legacy);
  }

  async setActiveVault(descriptor: VaultDescriptor): Promise<VaultDescriptor> {
    const legacy = toLegacy(descriptor);
    await setVaultConfig(legacy.root_path, legacy.name);
    return descriptor;
  }

  async setActiveVaultFromPath(rootPath: string, displayName: string): Promise<VaultDescriptor> {
    const descriptor = buildDescriptorFromPath(rootPath, displayName);
    return this.setActiveVault(descriptor);
  }

  async reset(): Promise<void> {
    await resetVaultConfig();
  }

  async resolveAbsolutePath(relativePath: string): Promise<string | null> {
    const rootPath = await this.getRootPath();
    if (!rootPath) {
      return null;
    }
    const separator = rootPath.includes('\\') ? '\\' : '/';
    const normalisedRelative = relativePath.replace(/\//g, separator);
    return `${rootPath}${separator}${normalisedRelative}`;
  }

  async getDisplayName(): Promise<string | null> {
    const descriptor = await this.getActiveVault();
    return descriptor?.displayName ?? null;
  }

  async getLocatorMeta(): Promise<VaultLocatorMeta> {
    const descriptor = await this.getActiveVault();
    if (!descriptor || descriptor.locator.platform !== 'desktop' || descriptor.locator.scheme !== 'path') {
      return { kind: 'path', permissionsOk: false, needsReauth: false };
    }
    return {
      kind: 'path',
      displayValue: descriptor.locator.rootPath,
      permissionsOk: true,
      needsReauth: false,
    };
  }

  async getRootIdentifier(): Promise<string | null> {
    const rootPath = await this.getRootPath();
    return rootPath ?? null;
  }

  private async getRootPath(): Promise<string | null> {
    const descriptor = await this.getActiveVault();
    if (!descriptor || descriptor.locator.platform !== 'desktop' || descriptor.locator.scheme !== 'path') {
      return null;
    }
    return descriptor.locator.rootPath;
  }
}

export const desktopVaultConfig = new DesktopVaultConfigAdapter();
