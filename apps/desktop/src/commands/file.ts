import type { Command } from './types';
import { commandRegistry } from './CommandRegistry';

const saveCommand: Command = {
  id: 'editor.file.save',
  label: 'Save',
  context: 'Global',
  group: 'File',
  icon: 'save',
  shortcut: 'Ctrl+S',
  run: async (ctx, view) => {
    const content = view.state.doc.toString();
    try {
      await ctx.operations.saveNote(content);
      ctx.operations.notify('Note saved', 'success');
    } catch (error) {
      console.error('Save failed:', error);
      ctx.operations.notify('Failed to save note', 'error');
    }
  },
};

export function registerFileCommands() {
  commandRegistry.register(saveCommand);
}
