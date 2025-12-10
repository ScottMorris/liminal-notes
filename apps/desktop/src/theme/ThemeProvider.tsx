import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, ThemeId } from './types';
import { themes } from './themes';

interface ThemeContextType {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'liminal-notes.theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
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

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeId);
  }, [themeId]);

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
  }, [themeId, systemIsDark]);

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
