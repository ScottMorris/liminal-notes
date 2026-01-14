import { describe, expect, it } from 'vitest';
import {
  isAndroidSafLocator,
  isAndroidSandboxLocator,
  isDesktopPathLocator,
  isIosBookmarkLocator,
  isIosSandboxLocator,
  type VaultDescriptor,
} from '../src/vault/types';

const makeDescriptor = (locator: VaultDescriptor['locator']): VaultDescriptor => ({
  vaultId: 'test',
  displayName: 'Test Vault',
  kind: locator.platform === 'desktop' ? 'external' : 'sandbox',
  locator,
});

describe('vault locator type guards', () => {
  it('matches desktop path locators', () => {
    const descriptor = makeDescriptor({ platform: 'desktop', scheme: 'path', rootPath: '/tmp/vault' });
    expect(isDesktopPathLocator(descriptor.locator)).toBe(true);
  });

  it('matches android SAF locators', () => {
    const descriptor = makeDescriptor({ platform: 'android', scheme: 'saf', treeUri: 'content://tree/1' });
    expect(isAndroidSafLocator(descriptor.locator)).toBe(true);
  });

  it('matches android sandbox locators', () => {
    const descriptor = makeDescriptor({ platform: 'android', scheme: 'sandbox', rootUri: 'sandbox://default' });
    expect(isAndroidSandboxLocator(descriptor.locator)).toBe(true);
  });

  it('matches iOS bookmark locators', () => {
    const descriptor = makeDescriptor({ platform: 'ios', scheme: 'bookmark', bookmark: 'bookmark-data' });
    expect(isIosBookmarkLocator(descriptor.locator)).toBe(true);
  });

  it('matches iOS sandbox locators', () => {
    const descriptor = makeDescriptor({ platform: 'ios', scheme: 'sandbox', rootUri: 'sandbox://default' });
    expect(isIosSandboxLocator(descriptor.locator)).toBe(true);
  });
});
