import React, { createContext, useContext, useState, useEffect } from 'react';
import { kv } from '../storage/kv';
import { SettingsState, DEFAULT_SETTINGS } from '../types/settings';

const SETTINGS_STORAGE_KEY = 'liminal_settings';

interface SettingsContextType {
  settings: SettingsState;
  updateSetting: (key: string, value: any) => Promise<void>;
  resetSettings: () => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Helper to update a nested object by dot-notation path
function setNestedValue(obj: any, path: string, value: any): any {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (!lastKey) return obj;

  const newObj = { ...obj };
  let current = newObj;

  for (const key of keys) {
    if (!current[key]) {
      current[key] = {};
    }
    // Copy the nested object to avoid mutation
    current[key] = { ...current[key] };
    current = current[key];
  }

  current[lastKey] = value;
  return newObj;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await kv.getJSON<Partial<SettingsState>>(SETTINGS_STORAGE_KEY);
      if (stored) {
        // Deep merge logic could go here, but for now we'll do a simple spread of top-level keys
        // or just ensure defaults are preserved.
        // Let's do a basic deep merge strategy for 2 levels to ensure new defaults appear
        setSettings(prev => ({
            ...prev,
            ...stored,
            editor: { ...prev.editor, ...stored.editor },
            appearance: { ...prev.appearance, ...stored.appearance },
            general: { ...prev.general, ...stored.general },
            vault: { ...prev.vault, ...stored.vault },
            developer: { ...prev.developer, ...stored.developer },
            corePlugins: { ...prev.corePlugins, ...stored.corePlugins },
        }));
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    setSettings(prev => {
        const next = setNestedValue(prev, key, value);
        // Persist immediately (fire and forget, or await if critical)
        kv.setJSON(SETTINGS_STORAGE_KEY, next).catch(e => console.error('Failed to save settings', e));
        return next;
    });
  };

  const resetSettings = async () => {
      setSettings(DEFAULT_SETTINGS);
      await kv.setJSON(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
