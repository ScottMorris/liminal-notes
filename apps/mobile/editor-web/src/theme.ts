import { EditorView } from '@codemirror/view';

export const fallbackThemeVars: Record<string, string> = {
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

  // Editor Core
  '--ln-editor-bg': 'var(--ln-bg)',
  '--ln-editor-fg': 'var(--ln-fg)',
  '--ln-editor-muted': 'var(--ln-muted)',
  '--ln-editor-selection': 'rgba(0, 102, 204, 0.15)',
  '--ln-editor-cursor': 'var(--ln-accent)',
  '--ln-editor-line-highlight': 'rgba(0, 0, 0, 0.03)',

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
};

export function createEditorTheme() {
  return EditorView.theme({
    '&': {
      backgroundColor: 'var(--ln-editor-bg)',
      color: 'var(--ln-editor-fg)',
      height: '100%',
      width: '100%',
    },
    '.cm-content': {
      caretColor: 'var(--ln-editor-cursor)',
      padding: '2rem 1rem', // Add some comfortable padding matching the previous textarea style
    },
    '.cm-scroller': {
      fontFamily: 'inherit', // Inherit app font
      lineHeight: '1.6',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--ln-editor-cursor)',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'var(--ln-editor-selection)',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--ln-editor-line-highlight)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--ln-editor-bg)', // Match editor bg
      color: 'var(--ln-editor-muted)',
      borderRight: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--ln-editor-fg)',
    },

    // Source Mode Decorations

    // Bold: slightly heavier weight, markers visible
    '.cm-strong': {
      fontWeight: 'var(--ln-syntax-bold-weight)',
      color: 'var(--ln-syntax-bold)',
    },

    // Italic: italic style, markers visible
    '.cm-emphasis': {
      fontStyle: 'italic',
      color: 'var(--ln-syntax-italic)',
    },

    // Inline code: monospace + background, backticks visible
    '.cm-inline-code': {
      fontFamily: 'var(--font-mono, monospace)',
      fontSize: '0.9em',
      color: 'var(--ln-syntax-code)',
      backgroundColor: 'var(--ln-syntax-code-bg)',
      padding: '1px 4px',
      borderRadius: '3px',
    },

    // Headings: larger/bolder, hashes visible
    '.cm-heading': {
      fontWeight: 'var(--ln-syntax-heading-weight)',
      color: 'var(--ln-syntax-heading)',
    },
    '.cm-heading-1': {
      fontSize: '1.6em',
    },
    '.cm-heading-2': {
      fontSize: '1.4em',
    },
    '.cm-heading-3': {
      fontSize: '1.2em',
    },
    '.cm-heading-4': {
      fontSize: '1.1em',
    },
    '.cm-heading-5': {
      fontSize: '1.05em',
    },
    '.cm-heading-6': {
      fontSize: '1em',
    },

    // Wikilinks: underline + link colour, brackets visible
    '.cm-wikilink': {
      color: 'var(--ln-syntax-link)',
      textDecoration: 'var(--ln-syntax-link-decoration)',
      cursor: 'pointer',
    },

    // Markdown links: link colour
    '.cm-link': {
      color: 'var(--ln-syntax-link)',
    },

    // Strikethrough
    '.cm-strikethrough': {
      textDecoration: 'line-through',
      opacity: '0.8',
    },

    // Blockquote
    '.cm-blockquote': {
      color: 'var(--ln-syntax-frontmatter)', // Use muted color
      fontStyle: 'italic',
    },

    // Horizontal Rule
    '.cm-hr': {
      color: 'var(--ln-syntax-frontmatter)',
      fontWeight: 'bold',
    },

    // Frontmatter
    '.cm-frontmatter': {
      color: 'var(--ln-syntax-frontmatter)',
      backgroundColor: 'var(--ln-syntax-frontmatter-bg)',
      fontFamily: 'var(--font-mono, monospace)',
      fontSize: '0.9em',
    },

    // Spellcheck
    '.cm-misspelling': {
      // Split properties to ensure compatibility across WebKit/Gecko
      textDecorationLine: 'underline',
      textDecorationStyle: 'wavy',
      textDecorationColor: '#db2828',
      textDecorationSkipInk: 'none',
      textDecorationThickness: '1px', // Thinner line
      textUnderlineOffset: '3px',
    },
  });
}
