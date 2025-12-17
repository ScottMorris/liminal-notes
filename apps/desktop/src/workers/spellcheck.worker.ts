/// <reference lib="webworker" />
import nspell from 'nspell';
// Import dictionary files as raw buffers/strings
// @ts-ignore
import aff from '../assets/dictionaries/en-CA.aff?raw';
// @ts-ignore
import dic from '../assets/dictionaries/en-CA.dic?raw';

// Types for messages
export type SpellcheckRequest = {
  type: 'check';
  id: string;
  text: string;
  ignoredWords: string[]; // Already ignored words (e.g. personal dictionary + session ignores)
};

export type SpellcheckResponse = {
  type: 'checked';
  id: string;
  misspellings: {
    from: number;
    to: number;
    word: string;
    suggestions: string[];
  }[];
};

export type SuggestRequest = {
  type: 'suggest';
  id: string;
  word: string;
};

export type SuggestResponse = {
  type: 'suggestions';
  id: string;
  word: string;
  suggestions: string[];
};

export type AddWordMessage = {
  type: 'add';
  word: string;
};

type WorkerMessage = SpellcheckRequest | SuggestRequest | AddWordMessage;

// Initialize nspell
let spell: ReturnType<typeof nspell>;

// Load dictionary
try {
  spell = nspell({ aff, dic });
} catch (e) {
  console.error('Failed to load dictionary:', e);
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  if (!spell) {
    // Dictionary not loaded yet, retry shortly or ignore?
    // In a real app we might queue or signal ready.
    // For now we assume fast load.
    console.warn('Spellchecker not ready yet');
    return;
  }

  const msg = e.data;

  if (msg.type === 'check') {
    const { id, text, ignoredWords } = msg;
    const misspellings: SpellcheckResponse['misspellings'] = [];

    // We expect the main thread to handle tokenization of code blocks etc.
    // and only send us relevant text ranges or just text.
    // However, the plan says we send text ranges.
    // BUT the simplest worker implementation often just takes a chunk of text.
    // Let's assume we receive a chunk of text that IS spellcheckable (or we just check everything and the UI filters).
    // Actually, checking everything in a large doc is slow.
    // The "Proposed Approach" says: Main thread sends { docVersion, visibleTextRanges, ... }
    // But `check` message above handles one text string.
    // We will stick to the plan: The extension will send text segments.

    // Word boundary regex: allow letters and apostrophes inside words (for contractions)
    // Matches: word, doesn't, o'clock
    // Does not match leading/trailing apostrophes if they are quotes, but this simple regex might catch them if not careful.
    // \p{L}+(?:['’]\p{L}+)* ensures apostrophe is followed by more letters.
    const wordRegex = /\p{L}+(?:['’]\p{L}+)*/gu;
    let match;

    // Add temporary ignored words to nspell instance?
    // nspell has `add`, but that persists for the instance.
    // We want session-based or per-check ignores.
    // Ideally we just check if it's in `ignoredWords` before asking nspell.
    const ignoredSet = new Set(ignoredWords.map(w => w.toLowerCase()));

    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[0];
      const lower = word.toLowerCase();

      // Skip if ignored
      if (ignoredSet.has(lower)) continue;

      // Skip numbers/mixed (regex \p{L} ensures only letters, but might split "word123" into "word")
      // If we want to skip words with numbers, we should adjust regex or check original context.
      // For now, \p{L} is good for natural language.

      // Check spelling
      const isCorrect = spell.correct(word);
      if (!isCorrect) {
        // Get suggestions only if needed?
        // Getting suggestions for ALL visible misspellings might be expensive.
        // We can just flag it, and fetch suggestions on demand (right click).
        misspellings.push({
          from: match.index,
          to: match.index + word.length,
          word: word,
          suggestions: [] // We fetch on demand to save CPU
        });
      }
    }

    self.postMessage({
      type: 'checked',
      id,
      misspellings
    } as SpellcheckResponse);
  } else if (msg.type === 'suggest') {
    const { id, word } = msg;
    const suggestions = spell.suggest(word);
    self.postMessage({
      type: 'suggestions',
      id,
      word,
      suggestions
    } as SuggestResponse);
  } else if (msg.type === 'add') {
    spell.add(msg.word);
  }
};
