import type { VaultId } from '@liminal-notes/core-shared/types';

export type VaultKind = 'sandbox' | 'external';

export type DesktopVaultLocator = {
  platform: 'desktop';
  scheme: 'path';
  rootPath: string;
};

export type AndroidSafVaultLocator = {
  platform: 'android';
  scheme: 'saf';
  treeUri: string;
};

export type AndroidSandboxVaultLocator = {
  platform: 'android';
  scheme: 'sandbox';
  rootUri: string;
};

export type IosBookmarkVaultLocator = {
  platform: 'ios';
  scheme: 'bookmark';
  bookmark: string;
};

export type IosSandboxVaultLocator = {
  platform: 'ios';
  scheme: 'sandbox';
  rootUri: string;
};

export type VaultLocator =
  | DesktopVaultLocator
  | AndroidSafVaultLocator
  | AndroidSandboxVaultLocator
  | IosBookmarkVaultLocator
  | IosSandboxVaultLocator;

export type VaultSettings = {
  indexing?: boolean;
  themeOverride?: string;
};

export type VaultDescriptor = {
  vaultId: VaultId;
  displayName: string;
  kind: VaultKind;
  locator: VaultLocator;
  settings?: VaultSettings;
};
