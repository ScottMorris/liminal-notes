import type { Command } from './types';
import { commandRegistry } from './CommandRegistry';

const globalCommands: Command[] = [
  {
    id: 'global.search',
    label: 'Search / Quick Open',
    context: 'Global',
    group: 'Navigation',
    icon: 'search',
    shortcut: 'Ctrl+Shift+F',
    run: async () => {
        console.log('Global command executed: Search');
    },
  },
  {
    id: 'global.newNote',
    label: 'New Note',
    context: 'Global',
    group: 'File',
    icon: 'plus',
    shortcut: 'Ctrl+N',
    run: async () => {
        console.log('Global command executed: New Note');
    },
  },
  {
    id: 'global.rename',
    label: 'Rename File',
    context: 'Global',
    group: 'File',
    icon: 'pencil',
    shortcut: 'F2',
    run: async () => {
        console.log('Global command executed: Rename');
    },
  },
];

export function registerGlobalCommands() {
  globalCommands.forEach(cmd => commandRegistry.register(cmd));
}
