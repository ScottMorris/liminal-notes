import React, { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { themes } from '@liminal-notes/core-shared/theme';
import { Theme, ThemeId } from '@liminal-notes/core-shared/theme';
import { useSettings } from './SettingsContext';
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';

interface ThemeContextType {
  themeId: string;
  setThemeId: (id: string) => void;
  theme: Theme;
  resolveColor: (variable: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const { settings, updateSetting } = useSettings();
  const { theme: materialTheme } = useMaterial3Theme();

  const themeId = settings.appearance.theme as string; // Broaden type

  const setThemeId = (id: string) => {
      updateSetting('appearance.theme', id as any);
  };

  const theme = useMemo(() => {
    if (themeId === 'material') {
        const isDark = systemScheme === 'dark';
        const colors = isDark ? materialTheme.dark : materialTheme.light;

        return {
            id: 'material' as any,
            name: 'System Material',
            category: isDark ? 'dark' : 'light',
            variables: {
                '--ln-bg': colors.background,
                '--ln-fg': colors.onBackground,
                '--ln-muted': colors.onSurfaceVariant,
                '--ln-border': colors.outline,
                '--ln-accent': colors.primary,
                '--ln-danger': colors.error,
                '--ln-sidebar-bg': colors.surface,
                '--ln-sidebar-fg': colors.onSurface,
                '--ln-control-close-hover': colors.error,
                '--ln-item-hover-bg': colors.surfaceVariant,

                // Editor Core
                '--ln-editor-bg': colors.background,
                '--ln-editor-fg': colors.onBackground,
                '--ln-editor-muted': colors.onSurfaceVariant,
                '--ln-editor-selection': colors.secondaryContainer,
                '--ln-editor-cursor': colors.primary,
                '--ln-editor-line-highlight': colors.surfaceVariant,

                // Tabs
                '--ln-tab-bg': colors.surface,
                '--ln-tab-bg-active': colors.background,
                '--ln-tab-fg': colors.onSurfaceVariant,
                '--ln-tab-fg-active': colors.onBackground,
                '--ln-tab-border': colors.outlineVariant,
                '--ln-tab-dirty': colors.tertiary,

                // Context Menu
                '--ln-menu-bg': colors.surface,
                '--ln-menu-fg': colors.onSurface,
                '--ln-menu-border': colors.outlineVariant,
                '--ln-menu-shadow': '0 2px 8px rgba(0,0,0,0.2)',
                '--ln-menu-radius': '12px',
                '--ln-menu-hover': colors.surfaceVariant,
                '--ln-menu-muted': colors.onSurfaceVariant,

                // Syntax
                '--ln-syntax-bold': colors.onSurface,
                '--ln-syntax-bold-weight': '600',
                '--ln-syntax-italic': colors.onSurface,
                '--ln-syntax-code': colors.primary,
                '--ln-syntax-code-bg': colors.secondaryContainer,
                '--ln-syntax-heading': colors.secondary,
                '--ln-syntax-heading-weight': '700',
                '--ln-syntax-link': colors.primary,
                '--ln-syntax-link-decoration': 'underline',
                '--ln-syntax-frontmatter': colors.outline,
                '--ln-syntax-frontmatter-bg': colors.surfaceVariant,
            }
        } as Theme;
    }

    // Cast themeId back to ThemeId for shared map lookup if it's not 'material'
    // But 'system' is also special logic
    if (themeId === 'system') {
      const isDark = systemScheme === 'dark';
      return isDark ? themes['dark'] : themes['light'];
    }

    return themes[themeId] || themes['light'];
  }, [themeId, systemScheme, materialTheme]);

  const resolveColor = useMemo(() => {
    return (variable: string): string => {
       let value = theme.variables[variable];
       if (!value) {
           return '#FF00FF';
       }

       let depth = 0;
       while (value.startsWith('var(') && depth < 5) {
           const match = value.match(/var\((.+)\)/);
           if (match && match[1]) {
               const refVar = match[1];
               const refValue = theme.variables[refVar];
               if (refValue) {
                   value = refValue;
               } else {
                   break;
               }
           } else {
               break;
           }
           depth++;
       }

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
