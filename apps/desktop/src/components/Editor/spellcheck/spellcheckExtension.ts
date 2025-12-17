import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate, PluginValue } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { spellcheckCore } from '../../../features/spellcheck/spellcheckCore';

const misspellingMark = Decoration.mark({
  class: 'cm-misspelling',
  attributes: { 'data-spellcheck-ignore': 'true' }
});

class SpellcheckPlugin implements PluginValue {
  decorations: DecorationSet;
  pendingCheck: number | null = null;

  // We need access to settings (ignored words, enabled state).
  // Ideally, we pass these in via constructor or check a global store.
  // Since this is a ViewPlugin, we don't have React context easily.
  // We'll rely on a global state or assume `spellcheckCore` has the config (which we set from React).
  // For this pass, we will look at `spellcheckCore` (which we need to make stateful).
  // OR, we can pass a configuration Compartment.

  // Let's assume spellcheckCore holds the 'ignored words' state for now,
  // or we just fetch it from the latest settings if we can.
  // But wait, the Worker needs the ignored words.
  // We'll update spellcheckCore with settings from React, and here we just ask spellcheckCore to check.

  constructor(view: EditorView) {
    this.decorations = Decoration.none;
    this.scheduleCheck(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.scheduleCheck(update.view);
    }
  }

  scheduleCheck(view: EditorView) {
    if (this.pendingCheck) window.clearTimeout(this.pendingCheck);

    this.pendingCheck = window.setTimeout(() => {
      this.check(view);
    }, 500);
  }

  async check(view: EditorView) {
    if (!isSpellcheckEnabled) {
      this.decorations = Decoration.none;
      view.dispatch({ effects: [] });
      return;
    }

    const { from, to } = view.viewport;
    const doc = view.state.doc;
    const text = doc.sliceString(from, to);

    const ignoreRanges: {from: number, to: number}[] = [];

    syntaxTree(view.state).iterate({
      from, to,
      enter: (node) => {
        if (
          node.name.includes('Code') ||
          node.name.includes('URL') ||
          node.name.includes('Link') ||
          node.name.includes('Image') ||
          node.name.includes('Frontmatter') ||
          node.name === 'HorizontalRule'
        ) {
          ignoreRanges.push({from: node.from, to: node.to});
          return false;
        }
      }
    });

    const chars = text.split('');
    for (const range of ignoreRanges) {
      const start = Math.max(from, range.from) - from;
      const end = Math.min(to, range.to) - from;
      if (start < end) {
        for (let i = start; i < end; i++) {
          chars[i] = ' ';
        }
      }
    }
    const maskedText = chars.join('');

    // We need the ignored words list here.
    // The cleanest way is to have the React component update a static property on the class
    // or a module-level variable when settings change.
    // Let's export a `setIgnoredWords` in this file.

    try {
      const result = await spellcheckCore.check(maskedText, currentIgnoredWords);
      if (result.type === 'checked') {
        this.updateDecorations(view, result.misspellings, from);
      }
    } catch (e) {
      console.error("Spellcheck failed:", e);
    }
  }

  updateDecorations(view: EditorView, misspellings: any[], viewportFrom: number) {
      const builder = new RangeSetBuilder<Decoration>();
      misspellings.sort((a: any, b: any) => a.from - b.from);

      for (const m of misspellings) {
          const from = viewportFrom + m.from;
          const to = viewportFrom + m.to;
          // Verify bounds
          if (from < to && to <= view.state.doc.length) {
            builder.add(from, to, misspellingMark);
          }
      }

      this.decorations = builder.finish();

      // Force update
      view.dispatch({ effects: [] });
  }
}

let currentIgnoredWords: string[] = [];
let isSpellcheckEnabled = true;

export function setSpellcheckIgnoredWords(words: string[]) {
  currentIgnoredWords = words;
}

export function setSpellcheckEnabled(enabled: boolean) {
  isSpellcheckEnabled = enabled;
}

export const spellcheckExtension = ViewPlugin.fromClass(SpellcheckPlugin, {
  decorations: v => v.decorations
});
