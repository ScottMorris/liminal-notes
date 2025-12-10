import { Theme } from './types';

export const lightTheme: Theme = {
  id: 'light',
  name: 'Light',
  variables: {
    '--ln-bg': '#ffffff',
    '--ln-fg': '#333333',
    '--ln-muted': '#888888',
    '--ln-border': '#dddddd',
    '--ln-accent': '#0066cc',
    '--ln-sidebar-bg': '#f5f5f5',
    '--ln-sidebar-fg': '#333333',
    '--ln-item-hover-bg': '#e0e0e0',
  },
};

export const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark',
  variables: {
    '--ln-bg': '#1e1e1e',
    '--ln-fg': '#d4d4d4',
    '--ln-muted': '#aaaaaa',
    '--ln-border': '#333333',
    '--ln-accent': '#4daafc',
    '--ln-sidebar-bg': '#252526',
    '--ln-sidebar-fg': '#cccccc',
    '--ln-item-hover-bg': '#2a2d2e',
  },
};

export const draculaTheme: Theme = {
  id: 'dracula',
  name: 'Dracula',
  variables: {
    '--ln-bg': '#282a36',
    '--ln-fg': '#f8f8f2',
    '--ln-muted': '#6272a4',
    '--ln-border': '#44475a',
    '--ln-accent': '#bd93f9',
    '--ln-sidebar-bg': '#21222c',
    '--ln-sidebar-fg': '#f8f8f2',
    '--ln-item-hover-bg': '#44475a',
  },
};

export const themes: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  dracula: draculaTheme,
};
