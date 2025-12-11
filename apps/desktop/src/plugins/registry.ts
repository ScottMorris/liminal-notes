import { LiminalPlugin } from './types';
import { wordCountPlugin } from './builtin/wordCountPlugin';
import { aiAssistantPlugin } from './builtin/aiAssistantPlugin';

export const builtInPlugins: LiminalPlugin[] = [
  wordCountPlugin,
  aiAssistantPlugin,
];
