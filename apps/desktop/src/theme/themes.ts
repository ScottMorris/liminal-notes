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
    '--ln-danger': '#d14343',
    '--ln-sidebar-bg': '#f5f5f5',
    '--ln-sidebar-fg': '#333333',
    '--ln-control-close-hover': '#e81123',
    '--ln-item-hover-bg': '#e0e0e0',
    '--ln-tts-highlight': 'rgba(255, 255, 0, 0.3)',

    // Editor Core
    '--ln-editor-bg': 'var(--ln-bg)',
    '--ln-editor-fg': 'var(--ln-fg)',
    '--ln-editor-muted': 'var(--ln-muted)',
    '--ln-editor-selection': 'rgba(0, 102, 204, 0.15)', // Based on accent #0066cc
    '--ln-editor-cursor': 'var(--ln-accent)',
    '--ln-editor-line-highlight': 'rgba(0, 0, 0, 0.03)',

    // Tabs
    '--ln-tab-bg': 'rgba(0, 0, 0, 0.03)',
    '--ln-tab-bg-active': 'var(--ln-bg)',
    '--ln-tab-fg': 'var(--ln-muted)',
    '--ln-tab-fg-active': 'var(--ln-fg)',
    '--ln-tab-border': 'var(--ln-border)',
    '--ln-tab-dirty': 'var(--ln-accent)',

    // Context Menu
    '--ln-menu-bg': 'var(--ln-bg)',
    '--ln-menu-fg': 'var(--ln-fg)',
    '--ln-menu-border': 'var(--ln-border)',
    '--ln-menu-shadow': '0 2px 8px rgba(0, 0, 0, 0.15)',
    '--ln-menu-radius': '6px',
    '--ln-menu-hover': 'rgba(0, 0, 0, 0.05)',
    '--ln-menu-muted': 'var(--ln-muted)',

    // Source Mode Decorations
    '--ln-syntax-bold': 'var(--ln-fg)',
    '--ln-syntax-bold-weight': '600',
    '--ln-syntax-italic': 'var(--ln-fg)',
    '--ln-syntax-code': 'var(--ln-accent)',
    '--ln-syntax-code-bg': 'rgba(0, 0, 0, 0.05)',
    '--ln-syntax-heading': 'var(--ln-fg)',
    '--ln-syntax-heading-weight': '700',
    '--ln-syntax-link': 'var(--ln-accent)',
    '--ln-syntax-link-decoration': 'underline',
    '--ln-syntax-frontmatter': 'var(--ln-muted)',
    '--ln-syntax-frontmatter-bg': 'rgba(0, 0, 0, 0.03)',
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
    '--ln-danger': '#ff6b6b',
    '--ln-sidebar-bg': '#252526',
    '--ln-sidebar-fg': '#cccccc',
    '--ln-control-close-hover': '#e81123',
    '--ln-item-hover-bg': '#2a2d2e',
    '--ln-tts-highlight': 'rgba(255, 255, 0, 0.3)',

    // Editor Core
    '--ln-editor-bg': 'var(--ln-bg)',
    '--ln-editor-fg': 'var(--ln-fg)',
    '--ln-editor-muted': 'var(--ln-muted)',
    '--ln-editor-selection': 'rgba(77, 170, 252, 0.25)', // Based on accent #4daafc
    '--ln-editor-cursor': 'var(--ln-accent)',
    '--ln-editor-line-highlight': 'rgba(255, 255, 255, 0.03)',

    // Tabs
    '--ln-tab-bg': 'rgba(255, 255, 255, 0.03)',
    '--ln-tab-bg-active': 'var(--ln-bg)',
    '--ln-tab-fg': 'var(--ln-muted)',
    '--ln-tab-fg-active': 'var(--ln-fg)',
    '--ln-tab-border': 'var(--ln-border)',
    '--ln-tab-dirty': 'var(--ln-accent)',

    // Context Menu
    '--ln-menu-bg': 'var(--ln-bg)',
    '--ln-menu-fg': 'var(--ln-fg)',
    '--ln-menu-border': 'var(--ln-border)',
    '--ln-menu-shadow': '0 2px 8px rgba(0, 0, 0, 0.3)',
    '--ln-menu-radius': '6px',
    '--ln-menu-hover': 'rgba(255, 255, 255, 0.05)',
    '--ln-menu-muted': 'var(--ln-muted)',

    // Source Mode Decorations
    '--ln-syntax-bold': 'var(--ln-fg)',
    '--ln-syntax-bold-weight': '600',
    '--ln-syntax-italic': 'var(--ln-fg)',
    '--ln-syntax-code': 'var(--ln-accent)',
    '--ln-syntax-code-bg': 'rgba(255, 255, 255, 0.05)',
    '--ln-syntax-heading': 'var(--ln-fg)',
    '--ln-syntax-heading-weight': '700',
    '--ln-syntax-link': 'var(--ln-accent)',
    '--ln-syntax-link-decoration': 'underline',
    '--ln-syntax-frontmatter': 'var(--ln-muted)',
    '--ln-syntax-frontmatter-bg': 'rgba(255, 255, 255, 0.03)',
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
    '--ln-danger': '#ff5555',
    '--ln-sidebar-bg': '#21222c',
    '--ln-sidebar-fg': '#f8f8f2',
    '--ln-control-close-hover': '#e81123',
    '--ln-item-hover-bg': '#44475a',
    '--ln-tts-highlight': 'rgba(189, 147, 249, 0.3)', // Purple tint

    // Editor Core (Dracula specifics)
    '--ln-editor-bg': '#282a36',
    '--ln-editor-fg': '#f8f8f2',
    '--ln-editor-muted': '#6272a4',
    '--ln-editor-selection': '#44475a',
    '--ln-editor-cursor': '#ff79c6',
    '--ln-editor-line-highlight': 'rgba(255, 255, 255, 0.03)',

    // Tabs
    '--ln-tab-bg': 'rgba(255, 255, 255, 0.03)',
    '--ln-tab-bg-active': 'var(--ln-bg)',
    '--ln-tab-fg': 'var(--ln-muted)',
    '--ln-tab-fg-active': 'var(--ln-fg)',
    '--ln-tab-border': 'var(--ln-border)',
    '--ln-tab-dirty': '#ff79c6', // Dracula pink

    // Context Menu
    '--ln-menu-bg': '#282a36',
    '--ln-menu-fg': '#f8f8f2',
    '--ln-menu-border': '#44475a',
    '--ln-menu-shadow': '0 2px 8px rgba(0, 0, 0, 0.3)',
    '--ln-menu-radius': '6px',
    '--ln-menu-hover': '#44475a',
    '--ln-menu-muted': '#6272a4',

    // Source Mode Decorations
    '--ln-syntax-bold': '#f8f8f2',
    '--ln-syntax-bold-weight': '600',
    '--ln-syntax-italic': '#f8f8f2',
    '--ln-syntax-code': '#50fa7b', // Green
    '--ln-syntax-code-bg': 'rgba(255, 255, 255, 0.05)',
    '--ln-syntax-heading': '#bd93f9', // Purple
    '--ln-syntax-heading-weight': '700',
    '--ln-syntax-link': '#8be9fd', // Cyan
    '--ln-syntax-link-decoration': 'underline',
    '--ln-syntax-frontmatter': '#6272a4',
    '--ln-syntax-frontmatter-bg': 'rgba(255, 255, 255, 0.03)',
  },
};

// Claude Light
export const claudeLightTheme: Theme = {
  id: 'claude-light',
  name: 'Claude Light',
  category: 'light',
  variables: {
    '--ln-bg': 'hsl(0, 0%, 100%)',
    '--ln-fg': 'hsl(60, 2.6%, 7.6%)',
    '--ln-muted': 'hsl(0, 0%, 36%)',
    '--ln-border': 'hsl(0, 0%, 88%)',
    '--ln-accent': 'hsl(15, 63.1%, 59.6%)',
    '--ln-danger': 'hsl(4, 65%, 51%)',
    '--ln-sidebar-bg': 'hsl(48, 33.3%, 97.1%)',
    '--ln-sidebar-fg': 'hsl(60, 2.6%, 7.6%)',
    '--ln-control-close-hover': '#e81123',
    '--ln-item-hover-bg': 'hsl(0, 0%, 93%)',
    '--ln-tts-highlight': 'hsla(15, 63.1%, 59.6%, 0.3)',

    // Editor Core
    '--ln-editor-bg': 'var(--ln-bg)',
    '--ln-editor-fg': 'var(--ln-fg)',
    '--ln-editor-muted': 'var(--ln-muted)',
    '--ln-editor-selection': 'hsla(15, 63.1%, 59.6%, 0.15)', // Accent based
    '--ln-editor-cursor': 'var(--ln-accent)',
    '--ln-editor-line-highlight': 'hsla(0, 0%, 0%, 0.03)',

    // Tabs
    '--ln-tab-bg': 'hsla(0, 0%, 0%, 0.03)',
    '--ln-tab-bg-active': 'var(--ln-bg)',
    '--ln-tab-fg': 'var(--ln-muted)',
    '--ln-tab-fg-active': 'var(--ln-fg)',
    '--ln-tab-border': 'var(--ln-border)',
    '--ln-tab-dirty': 'var(--ln-accent)',

    // Context Menu
    '--ln-menu-bg': 'var(--ln-bg)',
    '--ln-menu-fg': 'var(--ln-fg)',
    '--ln-menu-border': 'var(--ln-border)',
    '--ln-menu-shadow': '0 2px 8px hsla(0, 0%, 0%, 0.15)',
    '--ln-menu-radius': '6px',
    '--ln-menu-hover': 'hsla(0, 0%, 0%, 0.05)',
    '--ln-menu-muted': 'var(--ln-muted)',

    // Source Mode Decorations
    '--ln-syntax-bold': 'var(--ln-fg)',
    '--ln-syntax-bold-weight': '600',
    '--ln-syntax-italic': 'var(--ln-fg)',
    '--ln-syntax-code': 'var(--ln-accent)',
    '--ln-syntax-code-bg': 'hsla(0, 0%, 0%, 0.05)',
    '--ln-syntax-heading': 'var(--ln-fg)',
    '--ln-syntax-heading-weight': '700',
    '--ln-syntax-link': 'var(--ln-accent)',
    '--ln-syntax-link-decoration': 'underline',
    '--ln-syntax-frontmatter': 'var(--ln-muted)',
    '--ln-syntax-frontmatter-bg': 'hsla(0, 0%, 0%, 0.03)',
  },
};

// Claude Dark
export const claudeDarkTheme: Theme = {
  id: 'claude-dark',
  name: 'Claude Dark',
  category: 'dark',
  variables: {
    '--ln-bg': 'hsl(60, 2.1%, 18.4%)',
    '--ln-fg': 'hsl(48, 33.3%, 97.1%)',
    '--ln-muted': 'hsl(0, 0%, 62%)',
    '--ln-border': 'hsl(60, 2%, 25%)',
    '--ln-accent': 'hsl(15, 63.1%, 59.6%)',
    '--ln-danger': 'hsl(4, 72%, 62%)',
    '--ln-sidebar-bg': 'hsl(60, 2.7%, 14.5%)',
    '--ln-sidebar-fg': 'hsl(48, 33.3%, 97.1%)',
    '--ln-control-close-hover': '#e81123',
    '--ln-item-hover-bg': 'hsl(60, 2.5%, 23%)',
    '--ln-tts-highlight': 'hsla(15, 63.1%, 59.6%, 0.3)',

    // Editor Core
    '--ln-editor-bg': 'var(--ln-bg)',
    '--ln-editor-fg': 'var(--ln-fg)',
    '--ln-editor-muted': 'var(--ln-muted)',
    '--ln-editor-selection': 'hsla(15, 63.1%, 59.6%, 0.2)', // Accent based
    '--ln-editor-cursor': 'var(--ln-accent)',
    '--ln-editor-line-highlight': 'hsla(0, 0%, 100%, 0.03)',

    // Tabs
    '--ln-tab-bg': 'hsla(0, 0%, 100%, 0.03)',
    '--ln-tab-bg-active': 'var(--ln-bg)',
    '--ln-tab-fg': 'var(--ln-muted)',
    '--ln-tab-fg-active': 'var(--ln-fg)',
    '--ln-tab-border': 'var(--ln-border)',
    '--ln-tab-dirty': 'var(--ln-accent)',

    // Context Menu
    '--ln-menu-bg': 'var(--ln-bg)',
    '--ln-menu-fg': 'var(--ln-fg)',
    '--ln-menu-border': 'var(--ln-border)',
    '--ln-menu-shadow': '0 2px 8px hsla(0, 0%, 0%, 0.3)',
    '--ln-menu-radius': '6px',
    '--ln-menu-hover': 'hsla(0, 0%, 100%, 0.05)',
    '--ln-menu-muted': 'var(--ln-muted)',

    // Source Mode Decorations
    '--ln-syntax-bold': 'var(--ln-fg)',
    '--ln-syntax-bold-weight': '600',
    '--ln-syntax-italic': 'var(--ln-fg)',
    '--ln-syntax-code': 'var(--ln-accent)',
    '--ln-syntax-code-bg': 'hsla(0, 0%, 100%, 0.05)',
    '--ln-syntax-heading': 'var(--ln-fg)',
    '--ln-syntax-heading-weight': '700',
    '--ln-syntax-link': 'var(--ln-accent)',
    '--ln-syntax-link-decoration': 'underline',
    '--ln-syntax-frontmatter': 'var(--ln-muted)',
    '--ln-syntax-frontmatter-bg': 'hsla(0, 0%, 100%, 0.03)',
  },
};

// Jules Dark
export const julesDarkTheme: Theme = {
  id: 'jules-dark',
  name: 'Jules Dark',
  category: 'dark',
  variables: {
    '--ln-bg': 'hsl(260, 8%, 8%)',
    '--ln-fg': 'hsl(240, 67%, 99%)',
    '--ln-muted': 'hsl(250, 6%, 67%)',
    '--ln-border': 'hsl(250, 6%, 18%)',
    '--ln-accent': 'hsl(250, 60%, 60%)', // Purple
    '--ln-danger': 'hsl(0, 75%, 64%)',
    '--ln-sidebar-bg': 'hsl(240, 8%, 9%)',
    '--ln-sidebar-fg': 'hsl(240, 67%, 99%)',
    '--ln-control-close-hover': '#e81123',
    '--ln-item-hover-bg': 'hsl(250, 7%, 16%)',
    '--ln-tts-highlight': 'hsla(250, 60%, 60%, 0.3)',

    // Editor Core
    '--ln-editor-bg': 'var(--ln-bg)',
    '--ln-editor-fg': 'var(--ln-fg)',
    '--ln-editor-muted': 'var(--ln-muted)',
    '--ln-editor-selection': 'hsla(250, 60%, 60%, 0.2)', // Accent
    '--ln-editor-cursor': 'var(--ln-accent)',
    '--ln-editor-line-highlight': 'hsla(0, 0%, 100%, 0.03)',

    // Tabs
    '--ln-tab-bg': 'hsla(0, 0%, 100%, 0.03)',
    '--ln-tab-bg-active': 'var(--ln-bg)',
    '--ln-tab-fg': 'var(--ln-muted)',
    '--ln-tab-fg-active': 'var(--ln-fg)',
    '--ln-tab-border': 'var(--ln-border)',
    '--ln-tab-dirty': 'hsl(35, 90%, 60%)', // Amber for dirty indicator

    // Context Menu
    '--ln-menu-bg': 'var(--ln-bg)',
    '--ln-menu-fg': 'var(--ln-fg)',
    '--ln-menu-border': 'var(--ln-border)',
    '--ln-menu-shadow': '0 2px 8px hsla(260, 8%, 0%, 0.4)',
    '--ln-menu-radius': '6px',
    '--ln-menu-hover': 'hsla(250, 7%, 20%, 0.5)',
    '--ln-menu-muted': 'var(--ln-muted)',

    // Source Mode Decorations
    '--ln-syntax-bold': 'var(--ln-fg)',
    '--ln-syntax-bold-weight': '600',
    '--ln-syntax-italic': 'var(--ln-fg)',
    '--ln-syntax-code': 'hsl(140, 70%, 50%)', // Green
    '--ln-syntax-code-bg': 'hsla(140, 70%, 50%, 0.1)',
    '--ln-syntax-heading': 'hsl(280, 70%, 75%)', // Lilac/Pink
    '--ln-syntax-heading-weight': '700',
    '--ln-syntax-link': 'var(--ln-accent)',
    '--ln-syntax-link-decoration': 'underline',
    '--ln-syntax-frontmatter': 'var(--ln-muted)',
    '--ln-syntax-frontmatter-bg': 'hsla(0, 0%, 100%, 0.03)',
  },
};

// ChatGPT Light
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
    '--ln-danger': '#d14343',
    '--ln-sidebar-bg': 'hsl(0, 0%, 98%)',
    '--ln-sidebar-fg': 'hsl(0, 0%, 5%)',
    '--ln-control-close-hover': '#e81123',
    '--ln-item-hover-bg': 'hsl(0, 0%, 93%)',
    '--ln-tts-highlight': 'hsla(209, 100%, 50%, 0.3)',

    // Editor Core
    '--ln-editor-bg': 'var(--ln-bg)',
    '--ln-editor-fg': 'var(--ln-fg)',
    '--ln-editor-muted': 'var(--ln-muted)',
    '--ln-editor-selection': 'hsla(209, 100%, 50%, 0.15)',
    '--ln-editor-cursor': 'var(--ln-accent)',
    '--ln-editor-line-highlight': 'hsla(0, 0%, 0%, 0.03)',

    // Tabs
    '--ln-tab-bg': 'hsla(0, 0%, 0%, 0.03)',
    '--ln-tab-bg-active': 'var(--ln-bg)',
    '--ln-tab-fg': 'var(--ln-muted)',
    '--ln-tab-fg-active': 'var(--ln-fg)',
    '--ln-tab-border': 'var(--ln-border)',
    '--ln-tab-dirty': 'var(--ln-accent)',

    // Context Menu
    '--ln-menu-bg': 'var(--ln-bg)',
    '--ln-menu-fg': 'var(--ln-fg)',
    '--ln-menu-border': 'var(--ln-border)',
    '--ln-menu-shadow': '0 2px 8px hsla(0, 0%, 0%, 0.1)',
    '--ln-menu-radius': '6px',
    '--ln-menu-hover': 'hsla(0, 0%, 0%, 0.05)',
    '--ln-menu-muted': 'var(--ln-muted)',

    // Source Mode Decorations
    '--ln-syntax-bold': 'var(--ln-fg)',
    '--ln-syntax-bold-weight': '600',
    '--ln-syntax-italic': 'var(--ln-fg)',
    '--ln-syntax-code': 'var(--ln-accent)',
    '--ln-syntax-code-bg': 'hsla(0, 0%, 0%, 0.05)',
    '--ln-syntax-heading': 'var(--ln-fg)',
    '--ln-syntax-heading-weight': '700',
    '--ln-syntax-link': 'var(--ln-accent)',
    '--ln-syntax-link-decoration': 'underline',
    '--ln-syntax-frontmatter': 'var(--ln-muted)',
    '--ln-syntax-frontmatter-bg': 'hsla(0, 0%, 0%, 0.03)',
  },
};

// ChatGPT Dark
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
    '--ln-danger': '#ff6b6b',
    '--ln-sidebar-bg': 'hsl(0, 0%, 9%)',
    '--ln-sidebar-fg': 'hsl(0, 0%, 100%)',
    '--ln-control-close-hover': '#e81123',
    '--ln-item-hover-bg': 'hsl(0, 0%, 19%)',
    '--ln-tts-highlight': 'hsla(209, 100%, 50%, 0.3)',

    // Editor Core
    '--ln-editor-bg': 'var(--ln-bg)',
    '--ln-editor-fg': 'var(--ln-fg)',
    '--ln-editor-muted': 'var(--ln-muted)',
    '--ln-editor-selection': 'hsla(209, 100%, 50%, 0.25)',
    '--ln-editor-cursor': 'var(--ln-accent)',
    '--ln-editor-line-highlight': 'hsla(0, 0%, 100%, 0.03)',

    // Tabs
    '--ln-tab-bg': 'hsla(0, 0%, 100%, 0.03)',
    '--ln-tab-bg-active': 'var(--ln-bg)',
    '--ln-tab-fg': 'var(--ln-muted)',
    '--ln-tab-fg-active': 'var(--ln-fg)',
    '--ln-tab-border': 'var(--ln-border)',
    '--ln-tab-dirty': 'var(--ln-accent)',

    // Context Menu
    '--ln-menu-bg': 'var(--ln-bg)',
    '--ln-menu-fg': 'var(--ln-fg)',
    '--ln-menu-border': 'var(--ln-border)',
    '--ln-menu-shadow': '0 2px 8px hsla(0, 0%, 0%, 0.3)',
    '--ln-menu-radius': '6px',
    '--ln-menu-hover': 'hsla(0, 0%, 100%, 0.05)',
    '--ln-menu-muted': 'var(--ln-muted)',

    // Source Mode Decorations
    '--ln-syntax-bold': 'var(--ln-fg)',
    '--ln-syntax-bold-weight': '600',
    '--ln-syntax-italic': 'var(--ln-fg)',
    '--ln-syntax-code': 'var(--ln-accent)',
    '--ln-syntax-code-bg': 'hsla(0, 0%, 100%, 0.05)',
    '--ln-syntax-heading': 'var(--ln-fg)',
    '--ln-syntax-heading-weight': '700',
    '--ln-syntax-link': 'var(--ln-accent)',
    '--ln-syntax-link-decoration': 'underline',
    '--ln-syntax-frontmatter': 'var(--ln-muted)',
    '--ln-syntax-frontmatter-bg': 'hsla(0, 0%, 100%, 0.03)',
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
