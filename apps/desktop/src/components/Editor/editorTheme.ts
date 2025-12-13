import { EditorView } from '@codemirror/view';

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
  });
}
