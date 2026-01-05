import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

export interface EditorCommandSpec {
  id: string;
  run: (view: EditorView) => boolean | void;
}

// Known markdown markers for smart toggling
const FORMAT_MARKERS = [
  ['**', '**'], // Bold
  ['_', '_'],   // Italic
  ['~~', '~~'], // Strikethrough
  ['==', '=='], // Highlight
  ['`', '`']    // Code
];

/**
 * Wrap selection with markers (e.g., **bold**) with smart toggle logic
 */
export function wrapSelection(view: EditorView, before: string, after: string = before) {
  const { from, to } = view.state.selection.main;

  // 1. Expand selection to include surrounding known markers
  let expandedFrom = from;
  let expandedTo = to;
  let expansionHappened = true;

  while (expansionHappened) {
      expansionHappened = false;
      // Check all markers to see if we are wrapped by them
      for (const [b, a] of FORMAT_MARKERS) {
          // Safety check: ensure we don't look before the start of the document
          const from = Math.max(0, expandedFrom - b.length);
          const contextBefore = view.state.sliceDoc(from, expandedFrom);
          const contextAfter = view.state.sliceDoc(expandedTo, expandedTo + a.length);
          if (contextBefore === b && contextAfter === a) {
              expandedFrom -= b.length;
              expandedTo += a.length;
              expansionHappened = true;
              // Restart loop to check for outer markers (e.g. found ** inside _)
              break;
          }
      }
  }

  // Get the fully wrapped text
  const fullText = view.state.sliceDoc(expandedFrom, expandedTo);

  // 2. Peel off existing markers to find the core text and the stack of styles
  let currentText = fullText;
  const stack: string[][] = []; // Stack of [b, a] (Outer -> Inner)

  let peeling = true;
  while (peeling) {
      peeling = false;
      for (const [b, a] of FORMAT_MARKERS) {
          if (currentText.startsWith(b) && currentText.endsWith(a) && currentText.length >= b.length + a.length) {
              stack.push([b, a]);
              currentText = currentText.slice(b.length, currentText.length - a.length);
              peeling = true;
              break;
          }
      }
  }

  // 3. Toggle the target marker
  // Check if target is already in the stack
  const targetIndex = stack.findIndex(([b, a]) => b === before && a === after);

  if (targetIndex !== -1) {
      // Remove it (Toggle Off)
      stack.splice(targetIndex, 1);
  } else {
      // Add it to the start (Outer) so it wraps existing styles (Toggle On)
      // e.g. _text_ -> **_text_**
      stack.unshift([before, after]);
  }

  // 4. Reconstruct the text with the new stack
  let resultText = currentText;
  // Apply styles from Inner (end of stack) to Outer (start of stack)
  for (let i = stack.length - 1; i >= 0; i--) {
      const [b, a] = stack[i];
      resultText = `${b}${resultText}${a}`;
  }

  // 5. Calculate new selection range (focus on the core text)
  let newAnchor = expandedFrom;
  // Add lengths of all left-side markers that are now present
  for (const [b, _] of stack) {
      newAnchor += b.length;
  }

  // 6. Apply change
  view.dispatch({
      changes: {
          from: expandedFrom,
          to: expandedTo,
          insert: resultText
      },
      selection: {
          anchor: newAnchor,
          head: newAnchor + currentText.length
      }
  });
  return true;
}

export function insertText(view: EditorView, text: string, selectOffset = 0) {
    const { to } = view.state.selection.main;
    view.dispatch({
        changes: { from: to, insert: text },
        selection: { anchor: to + selectOffset }
    });
    return true;
}

// Reusable command definitions
export const sharedEditingCommands: Record<string, (view: EditorView) => void> = {
    'editor.format.bold': (view) => wrapSelection(view, '**'),
    'editor.format.italic': (view) => wrapSelection(view, '_'),
    'editor.format.strikethrough': (view) => wrapSelection(view, '~~'),
    'editor.format.highlight': (view) => wrapSelection(view, '=='),
    'editor.format.code': (view) => wrapSelection(view, '`'),
    'editor.format.clear': (view) => {
        const { from, to } = view.state.selection.main;
        let text = view.state.sliceDoc(from, to);
        text = text.replace(/[*~=`_]/g, '');
        view.dispatch({
            changes: { from, to, insert: text },
        });
    },
    'editor.insert.table': (view) => insertText(view, '\n| Header 1 | Header 2 |\n| :--- | :--- |\n| Cell 1 | Cell 2 |\n'),
    'editor.insert.callout': (view) => insertText(view, '\n> [!info] Title\n> Content\n'),
    'editor.insert.hr': (view) => insertText(view, '\n---\n'),
    'editor.insert.codeblock': (view) => insertText(view, '\n```\n\n```\n', 5),
    'editor.insert.mathblock': (view) => insertText(view, '\n$$\n\n$$\n', 4),
    // Clipboard commands might need platform specifics, keeping them out of pure shared logic for now if they rely on Tauri plugins
    // But standard selectAll is pure CM
    'editor.edit.selectAll': (view) => {
        view.dispatch({
            selection: { anchor: 0, head: view.state.doc.length }
        });
    }
};
