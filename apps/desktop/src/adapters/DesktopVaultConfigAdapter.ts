import type {
  VaultDescriptor,
  VaultLocator,
  DesktopVaultLocator,
} from '@liminal-notes/core-shared/vault/types';
import {
  isDesktopPathLocator,
} from '@liminal-notes/core-shared/vault/types';
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
  if (!isDesktopPathLocator(locator)) {
    throw new Error('Desktop adapter only supports desktop path locators');
  }

  return {
    root_path: locator.rootPath,
    name: descriptor.displayName,
  };
};

class DesktopVaultConfigAdapter {
  async getActiveVault(): Promise<VaultDescriptor | null> {
    const legacy = await getVaultConfig();
    if (!legacy) {
      return null;
    }
    return toDescriptor(legacy);
  }

  async setActiveVault(rootPath: string, displayName: string): Promise<VaultDescriptor> {
    await setVaultConfig(rootPath, displayName);
    return toDescriptor({ root_path: rootPath, name: displayName });
  }

  async saveDescriptor(descriptor: VaultDescriptor): Promise<VaultDescriptor> {
    const legacy = toLegacy(descriptor);
    await setVaultConfig(legacy.root_path, legacy.name);
    return descriptor;
  }

  async reset(): Promise<void> {
    await resetVaultConfig();
  }

  async getRootPath(): Promise<string | null> {
    const descriptor = await this.getActiveVault();
    if (!descriptor || !isDesktopPathLocator(descriptor.locator)) {
      return null;
    }
    return descriptor.locator.rootPath;
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
}

export const desktopVaultConfig = new DesktopVaultConfigAdapter();
