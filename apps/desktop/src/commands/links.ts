import type { Command } from './types';
import { commandRegistry } from './CommandRegistry';

// Links: Add internal link (wikilink)
const addInternalLinkCommand: Command = {
  id: 'editor.links.addInternal',
  label: 'Add link (internal)',
  group: 'Links',
  icon: 'link',
  run: (ctx, view) => {
    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);

    if (selectedText) {
      // Wrap selection
      view.dispatch({
        changes: {
          from,
          to,
          insert: `[[${selectedText}]]`,
        },
        selection: { anchor: from + 2, head: to + 2 },
      });
    } else {
      // Insert empty wikilink
      view.dispatch({
        changes: { from, insert: '[[]]' },
        selection: { anchor: from + 2 },
      });
    }
  },
};

// Links: Add external link
const addExternalLinkCommand: Command = {
  id: 'editor.links.addExternal',
  label: 'Add external link',
  group: 'Links',
  icon: 'external-link',
  run: (ctx, view) => {
    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);

    if (selectedText) {
      // Wrap selection
      view.dispatch({
        changes: {
          from,
          to,
          insert: `[${selectedText}]()`,
        },
        selection: { anchor: from + selectedText.length + 3 },
      });
    } else {
      // Insert empty markdown link
      view.dispatch({
        changes: { from, insert: '[]()' },
        selection: { anchor: from + 1 },
      });
    }
  },
};

export function registerLinkCommands() {
  commandRegistry.register(addInternalLinkCommand);
  commandRegistry.register(addExternalLinkCommand);
}
