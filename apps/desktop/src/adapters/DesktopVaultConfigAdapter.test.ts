import { describe, expect, it, vi, beforeEach } from 'vitest';
import { desktopVaultConfig } from './DesktopVaultConfigAdapter';
import * as ipc from '../ipc';

describe('DesktopVaultConfigAdapter', () => {
  const legacyConfig = { root_path: '/home/user/vault', name: 'Vault' };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when no config is persisted', async () => {
    vi.spyOn(ipc, 'getVaultConfig').mockResolvedValue(null);
    const descriptor = await desktopVaultConfig.getActiveVault();
    expect(descriptor).toBeNull();
  });

  it('maps legacy config to descriptor', async () => {
    vi.spyOn(ipc, 'getVaultConfig').mockResolvedValue(legacyConfig);
    const descriptor = await desktopVaultConfig.getActiveVault();
    expect(descriptor).not.toBeNull();
    expect(descriptor?.displayName).toBe('Vault');
    expect(descriptor?.locator).toEqual({
      platform: 'desktop',
      scheme: 'path',
      rootPath: '/home/user/vault',
    });
  });

  it('persists descriptor via setActiveVault', async () => {
    const setSpy = vi.spyOn(ipc, 'setVaultConfig').mockResolvedValue();
    const descriptor = {
      vaultId: '/home/user/vault',
      displayName: 'Vault',
      kind: 'external' as const,
      locator: { platform: 'desktop', scheme: 'path', rootPath: '/home/user/vault' },
    };
    await desktopVaultConfig.setActiveVault(descriptor);
    expect(setSpy).toHaveBeenCalledWith('/home/user/vault', 'Vault');
  });

  it('builds descriptor from path and resolves absolute paths', async () => {
    const setSpy = vi.spyOn(ipc, 'setVaultConfig').mockResolvedValue();
    const getSpy = vi.spyOn(ipc, 'getVaultConfig').mockResolvedValue(legacyConfig);

    const descriptor = await desktopVaultConfig.setActiveVaultFromPath('/home/user/vault', 'Vault');
    expect(descriptor.locator.rootPath).toBe('/home/user/vault');
    expect(setSpy).toHaveBeenCalledWith('/home/user/vault', 'Vault');

    // resolution uses current persisted config (mocked above)
    const absolute = await desktopVaultConfig.resolveAbsolutePath('notes/today.md');
    expect(getSpy).toHaveBeenCalled();
    expect(absolute).toBe('/home/user/vault/notes/today.md');
  });

  it('normalises slashes when resolving absolute paths on Windows-style root', async () => {
    vi.spyOn(ipc, 'getVaultConfig').mockResolvedValue({
      root_path: 'C:\\vault',
      name: 'Vault',
    });
    const absolute = await desktopVaultConfig.resolveAbsolutePath('dir/file.md');
    expect(absolute).toBe('C:\\vault\\dir\\file.md');
  });
});
