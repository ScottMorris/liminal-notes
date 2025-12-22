import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const STORAGE_KEY = 'liminal_active_vault';

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [activeVault, setActiveVault] = useState<VaultConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored);
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
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
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
