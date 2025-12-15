import type { Command } from './types';
import { commandRegistry } from './CommandRegistry';

// Global: Search / Quick Open
// Note: This is handled by a global event listener in App.tsx.
// We register it here for documentation and Help Menu visibility.
const searchCommand: Command = {
  id: 'global.search',
  label: 'Search / Quick Open',
  group: 'Global',
  icon: 'search',
  shortcut: 'Ctrl+Shift+F',
  run: () => {
    console.log('Search command executed. (Handled by global listener in App.tsx)');
  },
};

// Global: New Note
// Note: Handled by App.tsx
const newNoteCommand: Command = {
  id: 'global.newNote',
  label: 'New Note',
  group: 'Global',
  icon: 'file-add',
  shortcut: 'Ctrl+N',
  run: () => {
    console.log('New Note command executed. (Handled by global listener in App.tsx)');
  },
};

// Global: Rename
// Note: Handled by App.tsx, context sensitive
const renameCommand: Command = {
  id: 'global.rename',
  label: 'Rename File',
  group: 'Global',
  icon: 'edit',
  shortcut: 'F2',
  run: () => {
    console.log('Rename command executed. (Handled by global listener in App.tsx)');
  },
};

export function registerGlobalCommands() {
  commandRegistry.register(searchCommand);
  commandRegistry.register(newNoteCommand);
  commandRegistry.register(renameCommand);
}
