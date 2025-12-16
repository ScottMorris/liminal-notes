import type { Command } from './types';
import { commandRegistry } from './CommandRegistry';
import { EditorView } from '@codemirror/view';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';

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
function wrapSelection(view: EditorView, before: string, after: string = before) {
  const { from, to } = view.state.selection.main;

  // 1. Expand selection to include surrounding known markers
  let expandedFrom = from;
  let expandedTo = to;
  let expansionHappened = true;

  while (expansionHappened) {
      expansionHappened = false;
      // Check all markers to see if we are wrapped by them
      for (const [b, a] of FORMAT_MARKERS) {
          const contextBefore = view.state.sliceDoc(expandedFrom - b.length, expandedFrom);
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
}

// Parent Command: Format
const formatCommand: Command = {
  id: 'editor.format.group',
  label: 'Format',
  context: 'Editor',
  group: 'Format',
  icon: 'format',
  run: () => {}, // No-op parent
  children: [
    {
      id: 'editor.format.bold',
      label: 'Bold',
      context: 'Editor',
      group: 'Format',
      icon: 'bold',
      shortcut: 'Ctrl+B',
      run: (ctx, view) => wrapSelection(view, '**'),
    },
    {
      id: 'editor.format.italic',
      label: 'Italic',
      context: 'Editor',
      group: 'Format',
      icon: 'italic',
      shortcut: 'Ctrl+I',
      run: (ctx, view) => wrapSelection(view, '_'),
    },
    {
      id: 'editor.format.strikethrough',
      label: 'Strikethrough',
      context: 'Editor',
      group: 'Format',
      icon: 'strike',
      run: (ctx, view) => wrapSelection(view, '~~'),
    },
    {
      id: 'editor.format.highlight',
      label: 'Highlight',
      context: 'Editor',
      group: 'Format',
      icon: 'highlight',
      run: (ctx, view) => wrapSelection(view, '=='),
    },
    {
      id: 'editor.format.code',
      label: 'Code',
      context: 'Editor',
      group: 'Format',
      icon: 'code',
      shortcut: 'Ctrl+E',
      run: (ctx, view) => wrapSelection(view, '`'),
    },
    {
      id: 'editor.format.clear',
      label: 'Clear formatting',
      context: 'Editor',
      group: 'Format',
      icon: 'clear',
      run: (ctx, view) => {
        const { from, to } = view.state.selection.main;
        let text = view.state.sliceDoc(from, to);
        // Very basic stripping of common markers
        text = text.replace(/[*~=`_]/g, '');
        view.dispatch({
          changes: { from, to, insert: text },
        });
      },
    },
  ],
};

// Parent Command: Insert
const insertCommand: Command = {
  id: 'editor.insert.group',
  label: 'Insert',
  context: 'Editor',
  group: 'Insert',
  icon: 'insert',
  run: () => {}, // No-op parent
  children: [
    {
      id: 'editor.insert.table',
      label: 'Table',
      context: 'Editor',
      group: 'Insert',
      icon: 'table',
      run: (ctx, view) => {
        const { to } = view.state.selection.main;
        const table =
`| Header 1 | Header 2 |
| :--- | :--- |
| Cell 1 | Cell 2 |
`;
        view.dispatch({
          changes: { from: to, insert: '\n' + table },
        });
      },
    },
    {
      id: 'editor.insert.callout',
      label: 'Callout',
      context: 'Editor',
      group: 'Insert',
      icon: 'callout',
      run: (ctx, view) => {
        const { to } = view.state.selection.main;
        view.dispatch({
          changes: { from: to, insert: '\n> [!info] Title\n> Content\n' },
        });
      },
    },
    {
      id: 'editor.insert.hr',
      label: 'Horizontal rule',
      context: 'Editor',
      group: 'Insert',
      icon: 'hr',
      run: (ctx, view) => {
        const { to } = view.state.selection.main;
        view.dispatch({
          changes: { from: to, insert: '\n---\n' },
        });
      },
    },
    {
      id: 'editor.insert.codeblock',
      label: 'Code block',
      context: 'Editor',
      group: 'Insert',
      icon: 'code',
      run: (ctx, view) => {
        const { to } = view.state.selection.main;
        view.dispatch({
          changes: { from: to, insert: '\n```\n\n```\n' },
          selection: { anchor: to + 5 },
        });
      },
    },
    {
      id: 'editor.insert.mathblock',
      label: 'Math block',
      context: 'Editor',
      group: 'Insert',
      icon: 'math',
      run: (ctx, view) => {
        const { to } = view.state.selection.main;
        view.dispatch({
          changes: { from: to, insert: '\n$$\n\n$$\n' },
          selection: { anchor: to + 4 },
        });
      },
    },
  ],
};

// Edit: Cut
const cutCommand: Command = {
  id: 'editor.edit.cut',
  label: 'Cut',
  context: 'Editor',
  group: 'Edit',
  icon: 'cut',
  shortcut: 'Ctrl+X',
  when: (ctx) => !ctx.selection.empty,
  run: async (ctx, view) => {
    await writeText(ctx.selection.text);
    view.dispatch({
      changes: {
        from: ctx.selection.from,
        to: ctx.selection.to,
      },
    });
  },
};

// Edit: Copy
const copyCommand: Command = {
  id: 'editor.edit.copy',
  label: 'Copy',
  context: 'Editor',
  group: 'Edit',
  icon: 'copy',
  shortcut: 'Ctrl+C',
  when: (ctx) => !ctx.selection.empty,
  run: async (ctx) => {
    await writeText(ctx.selection.text);
  },
};

// Edit: Paste
const pasteCommand: Command = {
  id: 'editor.edit.paste',
  label: 'Paste',
  context: 'Editor',
  group: 'Edit',
  icon: 'paste',
  shortcut: 'Ctrl+V',
  run: async (ctx, view) => {
    const text = await readText();
    if (text) {
      view.dispatch({
        changes: {
          from: ctx.selection.from,
          to: ctx.selection.to,
          insert: text,
        },
      });
    }
  },
};

// Edit: Paste as plain text
const pastePlainCommand: Command = {
  id: 'editor.edit.pastePlain',
  label: 'Paste as plain text',
  context: 'Editor',
  group: 'Edit',
  icon: 'paste-plain',
  shortcut: 'Ctrl+Shift+V',
  run: async (ctx, view) => {
    const text = await readText();
    if (text) {
      view.dispatch({
        changes: {
          from: ctx.selection.from,
          to: ctx.selection.to,
          insert: text,
        },
      });
    }
  },
};

// Edit: Select all
const selectAllCommand: Command = {
  id: 'editor.edit.selectAll',
  label: 'Select all',
  context: 'Editor',
  group: 'Edit',
  icon: 'selection', // Might need an icon in mapper if not present, but it's optional
  shortcut: 'Ctrl+A',
  run: (ctx, view) => {
    view.dispatch({
      selection: { anchor: 0, head: ctx.documentLength },
    });
  },
};

export function registerEditingCommands() {
  // Register Format Submenu & Children
  commandRegistry.register(formatCommand);
  formatCommand.children?.forEach(cmd => commandRegistry.register(cmd));

  // Register Insert Submenu & Children
  commandRegistry.register(insertCommand);
  insertCommand.children?.forEach(cmd => commandRegistry.register(cmd));

  // Register Edit Commands
  commandRegistry.register(cutCommand);
  commandRegistry.register(copyCommand);
  commandRegistry.register(pasteCommand);
  commandRegistry.register(pastePlainCommand);
  commandRegistry.register(selectAllCommand);
}
