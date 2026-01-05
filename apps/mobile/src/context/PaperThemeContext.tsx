import React, { useMemo } from 'react';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';
import { useTheme } from './ThemeContext';
import { adaptLiminalThemeToPaper } from '../theme/paperAdapter';
import { useColorScheme } from 'react-native';

export function PaperThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, themeId } = useTheme();
  const systemScheme = useColorScheme();
  const { theme: materialTheme } = useMaterial3Theme();

  const paperTheme = useMemo(() => {
    // New "Material System" support
    if (themeId === 'material') {
        const isDark = systemScheme === 'dark';
        const sysTheme = isDark ? materialTheme.dark : materialTheme.light;

        // We can just use the sysTheme directly as it follows MD3 structure
        // But we might want to ensure properties that Paper expects are present.
        // Paper's MD3Theme type is compatible with what expo-material3-theme returns mostly.

        return {
            ... (isDark ? MD3DarkTheme : MD3LightTheme),
            colors: sysTheme // Override colors with dynamic ones
        };
    }

    // Default adaptation for existing themes (System (Light/Dark), Jules, etc.)
    const isDark = theme.category === 'dark';
    return adaptLiminalThemeToPaper(theme, isDark);
  }, [theme, themeId, systemScheme, materialTheme]);

  return (
    <PaperProvider theme={paperTheme}>
      {children}
    </PaperProvider>
  );
}
