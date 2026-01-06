import { LiminalPlugin } from './types';
import { wordCountPlugin } from './builtin/wordCountPlugin';
import { aiAssistantPlugin } from './builtin/aiAssistantPlugin';
import { ttsPlugin } from './core.tts';

export const builtInPlugins: LiminalPlugin[] = [
  wordCountPlugin,
  aiAssistantPlugin,
  ttsPlugin,
];
