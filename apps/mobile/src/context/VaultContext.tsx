import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { VaultAdapter } from '@liminal-notes/vault-core/types';
import { VaultDescriptor, VaultKind } from '@liminal-notes/vault-core/vault/types';
import { MobileVaultConfigAdapter } from '../adapters/MobileVaultConfigAdapter';
import { MobileSandboxVaultAdapter } from '../adapters/MobileSandboxVaultAdapter';
import { MobileSafVaultAdapter } from '../adapters/MobileSafVaultAdapter';
import { MobileBookmarkVaultAdapter } from '../adapters/MobileBookmarkVaultAdapter';
import { createBookmark } from 'ios-bookmarks';

const StorageAccessFramework = (FileSystem as any).StorageAccessFramework;

interface VaultContextType {
  activeVault: VaultDescriptor | null;
  adapter: VaultAdapter | null;
  isLoading: boolean;
  openSandboxVault: () => Promise<void>;
  openSafVault: () => Promise<void>;
  openIosDocumentPicker: () => Promise<void>;
  resetVault: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [activeVault, setActiveVault] = useState<VaultDescriptor | null>(null);
  const [adapter, setAdapter] = useState<VaultAdapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const configAdapter = new MobileVaultConfigAdapter();

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (!activeVault) {
      setAdapter(null);
      return;
    }

    const initAdapter = async () => {
      try {
        let newAdapter: VaultAdapter | null = null;
        if (activeVault.locator.scheme === 'sandbox') {
          newAdapter = new MobileSandboxVaultAdapter();
        } else if (activeVault.locator.scheme === 'saf') {
          newAdapter = new MobileSafVaultAdapter(activeVault.locator.treeUri);
        } else if (activeVault.locator.scheme === 'bookmark') {
           newAdapter = new MobileBookmarkVaultAdapter(activeVault.locator.bookmark);
        }

        if (newAdapter) {
          if (newAdapter.init) {
              await newAdapter.init();
          }
          setAdapter(newAdapter);
        }
      } catch (e) {
        console.error('Failed to init adapter for vault', activeVault.displayName, e);
        // Do not clear active vault automatically to avoid losing the bookmark if it's just a temporary failure
        setAdapter(null);
      }
    };

    initAdapter();
  }, [activeVault]);

  const loadConfig = async () => {
    try {
      const config = await configAdapter.getActiveVault();
      if (config) {
        setActiveVault(config);
      }
    } catch (e) {
      console.error('Failed to load vault config', e);
    } finally {
      setIsLoading(false);
    }
  };

  const openSandboxVault = async () => {
    try {
      setIsLoading(true);
      const adapter = new MobileSandboxVaultAdapter();
      await adapter.init();

      const sandboxConfig: VaultDescriptor = {
        vaultId: 'sandbox',
        displayName: 'Sandbox Vault',
        kind: 'sandbox',
        locator: {
             platform: Platform.OS === 'android' ? 'android' : 'ios',
             scheme: 'sandbox',
             rootUri: 'sandbox://default'
        } as any
      };

      await configAdapter.setActiveVault(sandboxConfig);
      setActiveVault(sandboxConfig);
    } catch (e) {
      console.error('Failed to open sandbox vault', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const openSafVault = async () => {
      if (Platform.OS !== 'android') {
          throw new Error('SAF is only available on Android');
      }

      try {
          const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (!permissions.granted) {
              // User cancelled or denied
              return;
          }

          const treeUri = permissions.directoryUri;
          const decoded = decodeURIComponent(treeUri);
          const name = decoded.split(':').pop() || 'External Vault';

          const descriptor: VaultDescriptor = {
              vaultId: treeUri,
              displayName: name,
              kind: 'external',
              locator: {
                  platform: 'android',
                  scheme: 'saf',
                  treeUri
              }
          };

          await configAdapter.setActiveVault(descriptor);
          setActiveVault(descriptor);

      } catch (e) {
          console.error("SAF Error", e);
          throw e;
      }
  };

  const openIosDocumentPicker = async () => {
      if (Platform.OS !== 'ios') return;

      try {
          const result = await DocumentPicker.getDocumentAsync({
              type: 'public.folder',
              copyToCacheDirectory: false,
              multiple: false
          });

          if (result.canceled) return;

          const uri = result.assets[0].uri;
          const name = result.assets[0].name;

          // Create security-scoped bookmark for persistence
          const bookmark = await createBookmark(uri);

          const descriptor: VaultDescriptor = {
              vaultId: uri, // Use original URI as ID, though bookmark is the truth
              displayName: name,
              kind: 'external',
              locator: {
                  platform: 'ios',
                  scheme: 'bookmark',
                  bookmark: bookmark
              }
          };

          await configAdapter.setActiveVault(descriptor);
          setActiveVault(descriptor);
      } catch (e) {
          console.error("iOS Picker Error", e);
          throw e;
      }
  };

  const resetVault = async () => {
    await configAdapter.reset();
    setActiveVault(null);
    setAdapter(null);
  };

  return (
    <VaultContext.Provider value={{
        activeVault,
        adapter,
        isLoading,
        openSandboxVault,
        openSafVault,
        openIosDocumentPicker,
        resetVault
    }}>
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
