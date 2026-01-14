import { ThemeId } from '@liminal-notes/core-shared/theme';

export interface SettingsState {
  general: {
    // version is usually derived, but we might store preferences here later
  };
  vault: {
    // Placeholder for vault specific settings if any
  };
  editor: {
    focusNewTabs: boolean;
    showLineNumbers: boolean;
    highlightActiveLine: boolean;
    readableLineLength: boolean;
    wordWrap: boolean;
    defaultMode: 'source' | 'preview';
  };
  appearance: {
    theme: ThemeId;
    fontSize: number;
    useNativeDecorations: boolean;
    timeFormat: 'system' | '12h' | '24h';
  };
  developer: {
    showFrontmatter: boolean;
  };
  corePlugins: Record<string, boolean>;
}

export const DEFAULT_SETTINGS: SettingsState = {
  general: {},
  vault: {},
  editor: {
    focusNewTabs: true,
    showLineNumbers: false,
    highlightActiveLine: true,
    readableLineLength: false,
    wordWrap: true,
    defaultMode: 'source',
  },
  appearance: {
    theme: 'system',
    fontSize: 16,
    useNativeDecorations: false,
    timeFormat: 'system',
  },
  developer: {
    showFrontmatter: false,
  },
  corePlugins: {},
};
