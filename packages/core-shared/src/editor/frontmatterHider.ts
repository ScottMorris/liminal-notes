import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { StateField, Text, RangeSetBuilder } from '@codemirror/state';

class FrontmatterWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("div");
    span.className = "cm-frontmatter-hidden";
    span.style.height = "0px";
    span.style.overflow = "hidden";
    return span;
  }
}

function hideFrontmatter(doc: Text) {
  const builder = new RangeSetBuilder<Decoration>();

  if (doc.lines === 0) return Decoration.none;

  const firstLine = doc.line(1);
  // gray-matter defaults to strict '---' fences, so we match that.
  if (firstLine.text.trim() !== '---') {
      return Decoration.none;
  }

  let endLine = -1;
  const scanLimit = Math.min(doc.lines, 100);

  for (let i = 2; i <= scanLimit; i++) {
      const line = doc.line(i);
      if (line.text.trim() === '---') {
          endLine = i;
          break;
      }
  }

  if (endLine !== -1) {
      const endPos = doc.line(endLine).to;
      builder.add(doc.line(1).from, endPos, Decoration.replace({
          widget: new FrontmatterWidget(),
          block: true,
          inclusiveStart: true,
      }));
  }

  return builder.finish();
}

export const frontmatterHider = StateField.define<DecorationSet>({
  create(state) {
    return hideFrontmatter(state.doc);
  },
  update(decorations, transaction) {
    if (transaction.docChanged) {
      return hideFrontmatter(transaction.newDoc);
    }
    return decorations.map(transaction.changes);
  },
  provide: f => EditorView.decorations.from(f)
});
