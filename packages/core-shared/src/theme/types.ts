export type ThemeId =
  | 'system'
  | 'light'
  | 'dark'
  | 'dracula'
  | 'claude-light'
  | 'claude-dark'
  | 'jules-dark'
  | 'chatgpt-light'
  | 'chatgpt-dark';

export interface Theme {
  id: Exclude<ThemeId, 'system'>;
  name: string;
  category: 'light' | 'dark';
  variables: Record<string, string>;
}
