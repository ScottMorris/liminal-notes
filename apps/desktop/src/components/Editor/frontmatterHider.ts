import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

class FrontmatterWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("div");
    span.className = "cm-frontmatter-hidden";
    span.style.height = "0px";
    span.style.overflow = "hidden";
    // We hide it completely.
    return span;
  }
}

function hideFrontmatter(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  // Frontmatter must start on first line
  const firstLine = doc.line(1);
  if (firstLine.text.trim() !== '---') {
      return Decoration.none;
  }

  let endLine = -1;
  // Scan for closing fence
  // Limit scan to first 100 lines to avoid perf issues on huge files if no closing fence
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
      // Replace the entire block including the closing fence and the newline after it if possible
      // But we can just replace up to endPos.
      // We use block widget to replace lines.
      builder.add(doc.line(1).from, endPos, Decoration.replace({
          widget: new FrontmatterWidget(),
          block: true,
          inclusiveStart: true,
      }));
  }

  return builder.finish();
}

export const frontmatterHider = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = hideFrontmatter(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = hideFrontmatter(update.view);
    }
  }
}, {
  decorations: v => v.decorations
});
