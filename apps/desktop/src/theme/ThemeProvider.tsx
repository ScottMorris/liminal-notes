import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { getLinuxAccentColour } from '../ipc';
import { Theme, ThemeId } from './types';
import { themes } from './themes';

const GNOME_ACCENTS: Record<string, string> = {
    'blue': '#3584e4',
    'teal': '#2190a4',
    'green': '#3a944a',
    'yellow': '#f5c211',
    'orange': '#ff7800',
    'red': '#e01b24',
    'pink': '#d56199',
    'purple': '#9141ac',
    'slate': '#5e5c64',
    'default': '#3584e4'
};

interface ThemeContextType {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'liminal-notes.theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === 'system' || Object.prototype.hasOwnProperty.call(themes, stored))) {
      return stored as ThemeId;
    }
    return 'system';
  });

  const [systemIsDark, setSystemIsDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const [systemAccent, setSystemAccent] = useState<string | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeId);
  }, [themeId]);

  // Fetch System Accent (Linux)
  useEffect(() => {
      const fetchAccent = async () => {
          try {
              const name = await getLinuxAccentColour();
              const hex = GNOME_ACCENTS[name] || GNOME_ACCENTS['default'];
              setSystemAccent(hex);
          } catch (e) {
              console.warn("Failed to get system accent", e);
              setSystemAccent(null);
          }
      };
      fetchAccent();
  }, []);

  useEffect(() => {
    let activeTheme: Theme;
    if (themeId === 'system') {
      activeTheme = systemIsDark ? themes.dark : themes.light;
    } else {
      activeTheme = themes[themeId];
    }

    if (!activeTheme) return;

    const root = document.documentElement;
    Object.entries(activeTheme.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Override with System Accent
    if (systemAccent) {
        // Expose system accent for components (e.g. TitleBar close button)
        root.style.setProperty('--ln-system-accent', systemAccent);
        // Override close button hover with system accent
        root.style.setProperty('--ln-control-close-hover', systemAccent);

        if (settings['appearance.useSystemAccent']) {
            root.style.setProperty('--ln-accent', systemAccent);
            // Dependent variables
            root.style.setProperty('--ln-editor-cursor', systemAccent);
            root.style.setProperty('--ln-syntax-link', systemAccent);
            root.style.setProperty('--ln-tab-dirty', systemAccent);
            // Selection uses color-mix for transparency
            root.style.setProperty('--ln-editor-selection', `color-mix(in srgb, ${systemAccent}, transparent 80%)`);
        }
    }
  }, [themeId, systemIsDark, systemAccent, settings]);

  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
  };

  const availableThemes = Object.values(themes);

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
