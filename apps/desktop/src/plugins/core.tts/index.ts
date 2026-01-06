import { LiminalPlugin, PluginContext } from '../types';

export const ttsPlugin: LiminalPlugin = {
  meta: {
    id: 'core.tts',
    name: 'Read Aloud (TTS)',
    description: 'Offline text-to-speech with playback controls and highlighting.',
    version: '0.1.0',
    enabledByDefault: false,
  },
  onActivate: (ctx: PluginContext) => {
    ctx.log('TTS plugin activated');
  },
  onDeactivate: (ctx: PluginContext) => {
    ctx.log('TTS plugin deactivated');
  },
};
