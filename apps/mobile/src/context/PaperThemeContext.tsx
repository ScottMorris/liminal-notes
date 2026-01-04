import React, { useMemo } from 'react';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useTheme } from './ThemeContext';
import { adaptLiminalThemeToPaper } from '../theme/paperAdapter';
import { useColorScheme } from 'react-native';

export function PaperThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, themeId } = useTheme();
  // We can use systemScheme to refine the adaptation if needed
  const systemScheme = useColorScheme();

  const paperTheme = useMemo(() => {
    // If we ever support "Material System" explicitly, we would handle it here.
    // For now, we adapt the ACTIVE Liminal theme.
    // The `Theme` object has a `category` ('light' | 'dark').

    const isDark = theme.category === 'dark';

    return adaptLiminalThemeToPaper(theme, isDark);
  }, [theme, themeId]);

  return (
    <PaperProvider theme={paperTheme}>
      {children}
    </PaperProvider>
  );
}
