import { EditorView } from '@codemirror/view';
import type { EditorContext } from './types';

/**
 * Build base EditorContext from current editor state
 * Note: App-level operations must be added by the caller (EditorPane)
 */
export function buildEditorContext(
  view: EditorView,
  noteId: string,
  path: string
): Omit<EditorContext, 'operations' | 'isUnsaved'> {
  const state = view.state;
  const selection = state.selection.main;

  return {
    type: 'Editor',
    noteId,
    path,
    editorMode: 'source',
    view,
    selection: {
      from: selection.from,
      to: selection.to,
      empty: selection.empty,
      text: state.sliceDoc(selection.from, selection.to),
    },
    cursor: selection.head,
    documentLength: state.doc.length,
  };
}
