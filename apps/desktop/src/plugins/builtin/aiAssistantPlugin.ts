import { LiminalPlugin, PluginContext } from '../types';

export const aiAssistantPlugin: LiminalPlugin = {
  meta: {
    id: 'ai-assistant',
    name: 'AI Assistant',
    description: 'Jules-like local assistant for summaries, tags, and related notes.',
    enabledByDefault: false,
    version: '0.1.0',
    author: 'Liminal Notes',
  },
  onActivate: (ctx: PluginContext) => {
    ctx.log('AI Assistant activated');
  },
  onDeactivate: (ctx: PluginContext) => {
    ctx.log('AI Assistant deactivated');
  },
};
