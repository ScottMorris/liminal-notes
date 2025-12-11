import { LiminalPlugin } from './types';
import { wordCountPlugin } from './builtin/wordCountPlugin';

export const builtInPlugins: LiminalPlugin[] = [
  wordCountPlugin,
  // Future plugins:
  // aiAssistantPlugin,
  // semanticLinksPlugin,
];
