import type { VaultId } from '../types';

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

export const isDesktopPathLocator = (locator: VaultLocator): locator is DesktopVaultLocator =>
  locator.platform === 'desktop' && locator.scheme === 'path';

export const isAndroidSafLocator = (locator: VaultLocator): locator is AndroidSafVaultLocator =>
  locator.platform === 'android' && locator.scheme === 'saf';

export const isAndroidSandboxLocator = (locator: VaultLocator): locator is AndroidSandboxVaultLocator =>
  locator.platform === 'android' && locator.scheme === 'sandbox';

export const isIosBookmarkLocator = (locator: VaultLocator): locator is IosBookmarkVaultLocator =>
  locator.platform === 'ios' && locator.scheme === 'bookmark';

export const isIosSandboxLocator = (locator: VaultLocator): locator is IosSandboxVaultLocator =>
  locator.platform === 'ios' && locator.scheme === 'sandbox';
