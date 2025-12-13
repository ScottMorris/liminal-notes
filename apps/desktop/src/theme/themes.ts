import { Theme } from './types';

export const lightTheme: Theme = {
  id: 'light',
  name: 'Light',
  category: 'light',
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
  category: 'dark',
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
  category: 'dark',
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

// Claude Light
// Source:
// --bg-000: 0 0% 100%
// --text-000: 60 2.6% 7.6%
// --accent-brand: 15 63.1% 59.6%
// --bg-100: 48 33.3% 97.1%
export const claudeLightTheme: Theme = {
  id: 'claude-light',
  name: 'Claude Light',
  category: 'light',
  variables: {
    '--ln-bg': 'hsl(0, 0%, 100%)',
    '--ln-fg': 'hsl(60, 2.6%, 7.6%)',
    '--ln-muted': 'hsl(0, 0%, 36%)', // Estimated
    '--ln-border': 'hsl(0, 0%, 88%)', // Estimated
    '--ln-accent': 'hsl(15, 63.1%, 59.6%)',
    '--ln-sidebar-bg': 'hsl(48, 33.3%, 97.1%)',
    '--ln-sidebar-fg': 'hsl(60, 2.6%, 7.6%)',
    '--ln-item-hover-bg': 'hsl(0, 0%, 93%)', // Estimated
  },
};

// Claude Dark
// Source:
// --bg-000: 60 2.1% 18.4%
// --text-000: 48 33.3% 97.1%
// --accent-brand: 15 63.1% 59.6%
// --bg-100: 60 2.7% 14.5%
export const claudeDarkTheme: Theme = {
  id: 'claude-dark',
  name: 'Claude Dark',
  category: 'dark',
  variables: {
    '--ln-bg': 'hsl(60, 2.1%, 18.4%)',
    '--ln-fg': 'hsl(48, 33.3%, 97.1%)',
    '--ln-muted': 'hsl(0, 0%, 62%)', // Estimated
    '--ln-border': 'hsl(60, 2%, 25%)', // Estimated
    '--ln-accent': 'hsl(15, 63.1%, 59.6%)',
    '--ln-sidebar-bg': 'hsl(60, 2.7%, 14.5%)',
    '--ln-sidebar-fg': 'hsl(48, 33.3%, 97.1%)',
    '--ln-item-hover-bg': 'hsl(60, 2.5%, 23%)', // Estimated
  },
};

// Jules Dark
// Converted from Hex to HSL
// --ln-bg: #141316 -> hsl(260, 8%, 8%)
// --ln-fg: #fbfbfe -> hsl(240, 67%, 99%)
// --ln-muted: #a6a4b1 -> hsl(250, 6%, 67%)
// --ln-border: #2d2c32 -> hsl(250, 6%, 18%)
// --ln-accent: #715cd7 -> hsl(250, 60%, 60%)
// --ln-sidebar-bg: #16161a -> hsl(240, 8%, 9%)
// --ln-item-hover-bg: #26252b -> hsl(250, 7%, 16%)
export const julesDarkTheme: Theme = {
  id: 'jules-dark',
  name: 'Jules Dark',
  category: 'dark',
  variables: {
    '--ln-bg': 'hsl(260, 8%, 8%)',
    '--ln-fg': 'hsl(240, 67%, 99%)',
    '--ln-muted': 'hsl(250, 6%, 67%)',
    '--ln-border': 'hsl(250, 6%, 18%)',
    '--ln-accent': 'hsl(250, 60%, 60%)',
    '--ln-sidebar-bg': 'hsl(240, 8%, 9%)',
    '--ln-sidebar-fg': 'hsl(240, 67%, 99%)',
    '--ln-item-hover-bg': 'hsl(250, 7%, 16%)',
  },
};

// ChatGPT Light
// Converted from Hex to HSL
// --ln-bg: #ffffff -> hsl(0, 0%, 100%)
// --ln-fg: #0d0d0d -> hsl(0, 0%, 5%)
// --ln-muted: #5d5d5d -> hsl(0, 0%, 36%)
// --ln-border: #e0e0e0 -> hsl(0, 0%, 88%)
// --ln-accent: #0285ff -> hsl(209, 100%, 50%)
// --ln-sidebar-bg: #f9f9f9 -> hsl(0, 0%, 98%)
// --ln-item-hover-bg: #ececec -> hsl(0, 0%, 93%)
export const chatgptLightTheme: Theme = {
  id: 'chatgpt-light',
  name: 'ChatGPT Light',
  category: 'light',
  variables: {
    '--ln-bg': 'hsl(0, 0%, 100%)',
    '--ln-fg': 'hsl(0, 0%, 5%)',
    '--ln-muted': 'hsl(0, 0%, 36%)',
    '--ln-border': 'hsl(0, 0%, 88%)',
    '--ln-accent': 'hsl(209, 100%, 50%)',
    '--ln-sidebar-bg': 'hsl(0, 0%, 98%)',
    '--ln-sidebar-fg': 'hsl(0, 0%, 5%)',
    '--ln-item-hover-bg': 'hsl(0, 0%, 93%)',
  },
};

// ChatGPT Dark
// Converted from Hex to HSL
// --ln-bg: #212121 -> hsl(0, 0%, 13%)
// --ln-fg: #ffffff -> hsl(0, 0%, 100%)
// --ln-muted: #afafaf -> hsl(0, 0%, 69%)
// --ln-border: #414141 -> hsl(0, 0%, 25%)
// --ln-accent: #0285ff -> hsl(209, 100%, 50%)
// --ln-sidebar-bg: #171717 -> hsl(0, 0%, 9%)
// --ln-item-hover-bg: #303030 -> hsl(0, 0%, 19%)
export const chatgptDarkTheme: Theme = {
  id: 'chatgpt-dark',
  name: 'ChatGPT Dark',
  category: 'dark',
  variables: {
    '--ln-bg': 'hsl(0, 0%, 13%)',
    '--ln-fg': 'hsl(0, 0%, 100%)',
    '--ln-muted': 'hsl(0, 0%, 69%)',
    '--ln-border': 'hsl(0, 0%, 25%)',
    '--ln-accent': 'hsl(209, 100%, 50%)',
    '--ln-sidebar-bg': 'hsl(0, 0%, 9%)',
    '--ln-sidebar-fg': 'hsl(0, 0%, 100%)',
    '--ln-item-hover-bg': 'hsl(0, 0%, 19%)',
  },
};

export const themes: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  dracula: draculaTheme,
  'claude-light': claudeLightTheme,
  'claude-dark': claudeDarkTheme,
  'jules-dark': julesDarkTheme,
  'chatgpt-light': chatgptLightTheme,
  'chatgpt-dark': chatgptDarkTheme,
};
