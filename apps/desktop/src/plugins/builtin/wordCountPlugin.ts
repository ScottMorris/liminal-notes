import { LiminalPlugin, PluginContext, PluginStatusItem } from '../types';

// Helper to count words
function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export const wordCountPlugin: LiminalPlugin = {
  meta: {
    id: 'word-count',
    name: 'Word Count',
    description: 'Shows the word and character count for the current note.',
    enabledByDefault: true,
  },

  onActivate(ctx: PluginContext) {
    ctx.log('[word-count] Activated');
  },

  onDeactivate(ctx: PluginContext) {
    ctx.log('[word-count] Deactivated');
  },

  onNoteContentChanged(ctx: PluginContext, note) {
    // Just logging for verification, the actual update happens when the host
    // re-renders status items by calling getStatusItems
    // ctx.log(`[word-count] Content changed for ${note.path}`);
  },

  getStatusItems(ctx: PluginContext): PluginStatusItem[] {
    const note = ctx.getCurrentNote();
    if (!note) {
      return [];
    }

    const text = note.content || '';
    const words = countWords(text);
    const chars = text.length;

    return [
      {
        id: 'words',
        label: 'Words',
        value: words.toString(),
      },
      {
        id: 'chars',
        label: 'Characters',
        value: chars.toString(),
      },
    ];
  },
};
