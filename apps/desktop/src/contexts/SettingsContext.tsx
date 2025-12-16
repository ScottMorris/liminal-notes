import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSettings, setSetting } from '../ipc';

interface SettingsContextType {
  settings: Record<string, unknown>;
  updateSetting: (key: string, value: unknown) => Promise<void>;
  reloadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<Record<string, unknown>>({});

  const reloadSettings = useCallback(async () => {
    try {
      const loaded = await getSettings();
      setSettingsState(loaded);
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  }, []);

  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  const updateSetting = useCallback(async (key: string, value: unknown) => {
    // Optimistic update
    setSettingsState(prev => ({ ...prev, [key]: value }));
    try {
      await setSetting(key, value);
    } catch (e) {
      console.error(`Failed to save setting ${key}`, e);
      // Revert to disk state on error
      reloadSettings();
    }
  }, [reloadSettings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, reloadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
