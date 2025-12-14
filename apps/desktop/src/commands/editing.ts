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

// Format: Bold
const boldCommand: Command = {
  id: 'editor.format.bold',
  label: 'Bold',
  group: 'Format',
  icon: 'bold',
  shortcut: 'Ctrl+B',
  run: (ctx, view) => {
    wrapSelection(view, '**');
  },
};

// Format: Italic
const italicCommand: Command = {
  id: 'editor.format.italic',
  label: 'Italic',
  group: 'Format',
  icon: 'italic',
  shortcut: 'Ctrl+I',
  run: (ctx, view) => {
    wrapSelection(view, '_');
  },
};

// Format: Code
const codeCommand: Command = {
  id: 'editor.format.code',
  label: 'Code',
  group: 'Format',
  icon: 'code',
  shortcut: 'Ctrl+E',
  run: (ctx, view) => {
    wrapSelection(view, '`');
  },
};

// Edit: Cut
const cutCommand: Command = {
  id: 'editor.edit.cut',
  label: 'Cut',
  group: 'Edit',
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
  group: 'Edit',
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
  group: 'Edit',
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
  group: 'Edit',
  run: async (ctx, view) => {
    // Same as paste for now; could strip formatting in future
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
  group: 'Edit',
  shortcut: 'Ctrl+A',
  run: (ctx, view) => {
    view.dispatch({
      selection: { anchor: 0, head: ctx.documentLength },
    });
  },
};

// Register all editing commands
export function registerEditingCommands() {
  commandRegistry.register(boldCommand);
  commandRegistry.register(italicCommand);
  commandRegistry.register(codeCommand);
  commandRegistry.register(cutCommand);
  commandRegistry.register(copyCommand);
  commandRegistry.register(pasteCommand);
  commandRegistry.register(pastePlainCommand);
  commandRegistry.register(selectAllCommand);
}
