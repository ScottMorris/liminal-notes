import React, { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { themes } from '@liminal-notes/core-shared/theme';
import { Theme, ThemeId } from '@liminal-notes/core-shared/theme';

interface ThemeContextType {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  theme: Theme;
  resolveColor: (variable: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [themeId, setThemeId] = useState<ThemeId>('system');

  const theme = useMemo(() => {
    if (themeId === 'system') {
      const isDark = systemScheme === 'dark';
      // Default system mapping
      return isDark ? themes['dark'] : themes['light'];
    }
    return themes[themeId] || themes['light'];
  }, [themeId, systemScheme]);

  const resolveColor = useMemo(() => {
    return (variable: string): string => {
       // 1. Get raw value
       let value = theme.variables[variable];
       if (!value) {
           console.warn(`Theme variable not found: ${variable}`);
           return '#FF00FF'; // Magenta error
       }

       // 2. Resolve CSS var references: var(--ln-bg)
       // Simple loop to handle nesting (though typically shallow)
       let depth = 0;
       while (value.startsWith('var(') && depth < 5) {
           const match = value.match(/var\((.+)\)/);
           if (match && match[1]) {
               const refVar = match[1];
               const refValue = theme.variables[refVar];
               if (refValue) {
                   value = refValue;
               } else {
                   break; // Broken reference
               }
           } else {
               break;
           }
           depth++;
       }

       // 3. Handle color-mix if necessary?
       // Current themes don't seem to use color-mix heavily in the core variables we need.
       // They use hex or hsl. React Native handles HSL.

       return value;
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, theme, resolveColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
