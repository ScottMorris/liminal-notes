import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper';
import { Theme } from '@liminal-notes/core-shared/theme';

export const adaptLiminalThemeToPaper = (
  liminalTheme: Theme,
  isDark: boolean
): MD3Theme => {
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  // Helper to safely get color or fallback
  const get = (key: string, fallback: string) =>
    liminalTheme.variables[key] || fallback;

  // We map Liminal CSS vars (which are available in liminalTheme.variables)
  // to Paper MD3 colors.

  // Note: liminalTheme.variables keys are like '--ln-bg', '--ln-accent'.
  // However, the `Theme` object usually has them as keys.

  const primary = get('--ln-accent', baseTheme.colors.primary);
  const background = get('--ln-bg', baseTheme.colors.background);
  const onBackground = get('--ln-fg', baseTheme.colors.onBackground);
  const surface = get('--ln-surface', baseTheme.colors.surface); // Assuming --ln-surface exists or similar
  const onSurface = get('--ln-fg', baseTheme.colors.onSurface);
  const error = baseTheme.colors.error; // We don't have a distinct error color in all themes yet

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary,
      // On primary is usually white or black depending on contrast,
      // but we don't calculate contrast here yet.
      // Most Liminal themes use white text on accent, or we can use background.
      onPrimary: isDark ? '#000000' : '#FFFFFF',

      background,
      onBackground,

      surface,
      onSurface,

      // Map border to outline
      outline: get('--ln-border', baseTheme.colors.outline),
      outlineVariant: get('--ln-border', baseTheme.colors.outlineVariant),

      // Use accent for other primary-related slots to keep consistency
      primaryContainer: primary,
      onPrimaryContainer: isDark ? '#000000' : '#FFFFFF',

      // We can map more if our themes get more granular
    },
  };
};
