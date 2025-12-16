import type { Command } from './types';
import { commandRegistry } from './CommandRegistry';
import { EditorView } from '@codemirror/view';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';

/**
 * Wrap selection with markers (e.g., **bold**)
 */
function wrapSelection(view: EditorView, before: string, after: string = before) {
  const { from, to } = view.state.selection.main;
  const selectedText = view.state.sliceDoc(from, to);

  // Check if selection is already wrapped (user selected **text**)
  if (selectedText.startsWith(before) && selectedText.endsWith(after) && selectedText.length >= before.length + after.length) {
    view.dispatch({
      changes: {
        from,
        to,
        insert: selectedText.slice(before.length, selectedText.length - after.length),
      },
      selection: {
        anchor: from,
        head: to - before.length - after.length,
      }
    });
    return;
  }

  // Check if surrounding text is wrapped (user selected 'text' inside **text**)
  const beforeRange = view.state.sliceDoc(from - before.length, from);
  const afterRange = view.state.sliceDoc(to, to + after.length);

  if (beforeRange === before && afterRange === after) {
      view.dispatch({
          changes: {
              from: from - before.length,
              to: to + after.length,
              insert: selectedText
          }
          // Preserve selection on the text
      });
      return;
  }

  if (selectedText) {
    // Wrap existing selection
    view.dispatch({
      changes: {
        from,
        to,
        insert: `${before}${selectedText}${after}`,
      },
      selection: {
        anchor: from + before.length,
        head: to + before.length,
      },
    });
  } else {
    // Insert markers and position cursor between them
    view.dispatch({
      changes: { from, insert: `${before}${after}` },
      selection: { anchor: from + before.length },
    });
  }
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
