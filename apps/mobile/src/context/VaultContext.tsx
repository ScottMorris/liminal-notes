import React, { createContext, useContext, useState, useEffect } from 'react';
import kv from '../storage/kv';
import { STORAGE_KEYS } from '../storage/keys';
import { MobileSandboxVaultAdapter } from '../adapters/MobileSandboxVaultAdapter';

interface VaultConfig {
  kind: 'sandbox';
  vaultId: 'sandbox';
  rootUri: string;
}

interface VaultContextType {
  activeVault: VaultConfig | null;
  isLoading: boolean;
  openSandboxVault: () => Promise<void>;
  resetVault: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [activeVault, setActiveVault] = useState<VaultConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await kv.getJSON<VaultConfig>(STORAGE_KEYS.ACTIVE_VAULT);
      if (config) {
        setActiveVault(config);
      }
    } catch (e) {
      console.error('Failed to load vault config', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (config: VaultConfig | null) => {
    try {
      if (config) {
        await kv.setJSON(STORAGE_KEYS.ACTIVE_VAULT, config);
      } else {
        await kv.removeItem(STORAGE_KEYS.ACTIVE_VAULT);
      }
    } catch (e) {
      console.error('Failed to save vault config', e);
    }
  };

  const openSandboxVault = async () => {
    try {
      setIsLoading(true);
      // Initialize Adapter to ensure directory exists
      const adapter = new MobileSandboxVaultAdapter();
      await adapter.init();

      // Construct config
      const sandboxConfig: VaultConfig = {
        kind: 'sandbox',
        vaultId: 'sandbox',
        rootUri: 'sandbox://default'
      };

      await saveConfig(sandboxConfig);
      setActiveVault(sandboxConfig);
    } catch (e) {
      console.error('Failed to open sandbox vault', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const resetVault = async () => {
    await saveConfig(null);
    setActiveVault(null);
  };

  return (
    <VaultContext.Provider value={{ activeVault, isLoading, openSandboxVault, resetVault }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
