import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { markdownDecorations } from '@liminal-notes/core-shared/editor/decorations';

function collectDecorationClasses(view: EditorView): string[] {
  const plugin = view.plugin(markdownDecorations);
  expect(plugin).not.toBeNull();

  const classes: string[] = [];
  plugin!.decorations.between(0, view.state.doc.length, (_from, _to, deco) => {
    if (typeof deco.spec.class === 'string') {
      classes.push(deco.spec.class);
    }
  });

  return classes;
}

describe('CodeMirror decorations integration', () => {
  it('applies strong and wikilink decorations', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const view = new EditorView({
      parent: container,
      state: EditorState.create({
        doc: '**bold text** and [[My Note]]',
        extensions: [markdown({ extensions: [GFM] }), markdownDecorations],
      }),
    });

    try {
      const classes = collectDecorationClasses(view);
      expect(classes).toContain('cm-strong');
      expect(classes).toContain('cm-wikilink');
    } finally {
      view.destroy();
      container.remove();
    }
  });
});
