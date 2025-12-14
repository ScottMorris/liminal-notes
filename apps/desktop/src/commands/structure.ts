import type { Command } from './types';
import { commandRegistry } from './CommandRegistry';
import { EditorView } from '@codemirror/view';

/**
 * Get current line info
 */
function getCurrentLine(view: EditorView, pos: number) {
  const line = view.state.doc.lineAt(pos);
  return {
    from: line.from,
    to: line.to,
    text: line.text,
  };
}

/**
 * Convert current line/selection to heading
 */
function toHeading(view: EditorView, level: number) {
  const { from } = view.state.selection.main;
  const line = getCurrentLine(view, from);

  // Remove existing heading markers
  const text = line.text.replace(/^#{1,6}\s*/, '');

  // Add new heading markers
  const prefix = '#'.repeat(level) + ' ';

  view.dispatch({
    changes: {
      from: line.from,
      to: line.to,
      insert: prefix + text,
    },
  });
}

/**
 * Toggle list marker on current line
 */
function toggleList(view: EditorView, marker: string) {
  const { from } = view.state.selection.main;
  const line = getCurrentLine(view, from);

  // Check if already has this marker
  const hasMarker = line.text.trimStart().startsWith(marker);

  if (hasMarker) {
    // Remove marker
    const text = line.text.replace(/^(\s*)([-*+]|\d+\.)\s*/, '$1');
    view.dispatch({
      changes: {
        from: line.from,
        to: line.to,
        insert: text,
      },
    });
  } else {
    // Add marker
    const indentMatch = line.text.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    const text = line.text.trimStart();

    view.dispatch({
      changes: {
        from: line.from,
        to: line.to,
        insert: `${indent}${marker} ${text}`,
      },
    });
  }
}

/**
 * Toggle quote on current line
 */
function toggleQuote(view: EditorView) {
  const { from } = view.state.selection.main;
  const line = getCurrentLine(view, from);

  if (line.text.trimStart().startsWith('> ')) {
    // Remove quote
    const text = line.text.replace(/^(\s*)>\s*/, '$1');
    view.dispatch({
      changes: {
        from: line.from,
        to: line.to,
        insert: text,
      },
    });
  } else {
    // Add quote
    view.dispatch({
      changes: {
        from: line.from,
        to: line.to,
        insert: `> ${line.text}`,
      },
    });
  }
}

/**
 * Remove all formatting from line
 */
function toBody(view: EditorView) {
  const { from } = view.state.selection.main;
  const line = getCurrentLine(view, from);

  // Remove headings, lists, quotes
  const text = line.text
    .replace(/^#{1,6}\s*/, '')
    .replace(/^(\s*)([-*+]|\d+\.)\s*/, '$1')
    .replace(/^(\s*)>\s*/, '$1')
    .replace(/^(\s*)- \[[ x]\]\s*/, '$1');

  view.dispatch({
    changes: {
      from: line.from,
      to: line.to,
      insert: text,
    },
  });
}

// Structure: Paragraph submenu parent
const paragraphCommand: Command = {
  id: 'editor.structure.paragraph',
  label: 'Paragraph',
  group: 'Structure',
  icon: 'paragraph',
  run: () => {}, // No-op, this just holds submenu
  children: [
    // Bullet list
    {
      id: 'editor.structure.bulletList',
      label: 'Bullet list',
      group: 'Structure',
      icon: 'list',
      run: (ctx, view) => toggleList(view, '-'),
    },
    // Numbered list
    {
      id: 'editor.structure.numberedList',
      label: 'Numbered list',
      group: 'Structure',
      icon: 'list-ordered',
      run: (ctx, view) => toggleList(view, '1.'),
    },
    // Task list
    {
      id: 'editor.structure.taskList',
      label: 'Task list',
      group: 'Structure',
      icon: 'list-task',
      run: (ctx, view) => toggleList(view, '- [ ]'),
    },
    // Heading 1
    {
      id: 'editor.structure.heading1',
      label: 'Heading 1',
      group: 'Structure',
      shortcut: 'Ctrl+1',
      run: (ctx, view) => toHeading(view, 1),
    },
    // Heading 2
    {
      id: 'editor.structure.heading2',
      label: 'Heading 2',
      group: 'Structure',
      shortcut: 'Ctrl+2',
      run: (ctx, view) => toHeading(view, 2),
    },
    // Heading 3
    {
      id: 'editor.structure.heading3',
      label: 'Heading 3',
      group: 'Structure',
      shortcut: 'Ctrl+3',
      run: (ctx, view) => toHeading(view, 3),
    },
    // Heading 4
    {
      id: 'editor.structure.heading4',
      label: 'Heading 4',
      group: 'Structure',
      shortcut: 'Ctrl+4',
      run: (ctx, view) => toHeading(view, 4),
    },
    // Heading 5
    {
      id: 'editor.structure.heading5',
      label: 'Heading 5',
      group: 'Structure',
      shortcut: 'Ctrl+5',
      run: (ctx, view) => toHeading(view, 5),
    },
    // Heading 6
    {
      id: 'editor.structure.heading6',
      label: 'Heading 6',
      group: 'Structure',
      shortcut: 'Ctrl+6',
      run: (ctx, view) => toHeading(view, 6),
    },
    // Body (remove formatting)
    {
      id: 'editor.structure.body',
      label: 'Body',
      group: 'Structure',
      shortcut: 'Ctrl+0',
      icon: 'clear',
      run: (ctx, view) => toBody(view),
    },
    // Quote
    {
      id: 'editor.structure.quote',
      label: 'Quote',
      group: 'Structure',
      icon: 'quote',
      run: (ctx, view) => toggleQuote(view),
    },
  ],
};

export function registerStructureCommands() {
  commandRegistry.register(paragraphCommand);
}
