export type ThemeId = 'system' | 'light' | 'dark' | 'dracula';

export interface Theme {
  id: Exclude<ThemeId, 'system'>;
  name: string;
  variables: Record<string, string>;
}
