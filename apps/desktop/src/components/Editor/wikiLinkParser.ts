import { EditorView } from '@codemirror/view';

/**
 * Find wikilink ranges in document
 *
 * Note: We use regex for now because CodeMirror's Markdown language
 * doesn't recognize [[wikilinks]] syntax. In the future, we could
 * add a custom Markdown extension to the language parser.
 *
 * Optimization: We only scan the visible ranges to avoid stringifying
 * the entire document on every update.
 */
export function findWikiLinks(view: EditorView): Array<{ from: number; to: number }> {
  const wikilinks: Array<{ from: number; to: number }> = [];
  const regex = /(?<!\\)\[\[([^\]]+)\]\]/g;

  for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);
      let match;

      // Reset lastIndex for new string
      regex.lastIndex = 0;

      while ((match = regex.exec(text)) !== null) {
        wikilinks.push({
          from: from + match.index,
          to: from + match.index + match[0].length,
        });
      }
  }

  return wikilinks;
}
