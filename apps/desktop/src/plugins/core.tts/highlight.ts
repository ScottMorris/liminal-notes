import { StateField, StateEffect } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';

export const setTtsHighlight = StateEffect.define<{ from: number; to: number } | null>();

export const ttsHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    value = value.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setTtsHighlight)) {
        if (effect.value === null) {
            return Decoration.none;
        }
        const { from, to } = effect.value;
        if (from >= to) return Decoration.none;

        // Ensure bounds
        const max = tr.state.doc.length;
        const safeFrom = Math.min(Math.max(0, from), max);
        const safeTo = Math.min(Math.max(0, to), max);

        if (safeFrom >= safeTo) return Decoration.none;

        const decoration = Decoration.mark({
          class: 'tts-highlight',
          attributes: { style: 'background-color: var(--ln-tts-highlight, rgba(255, 255, 0, 0.3));' }
        });

        return Decoration.set([decoration.range(safeFrom, safeTo)]);
      }
    }
    return value;
  },
  provide: f => EditorView.decorations.from(f)
});
