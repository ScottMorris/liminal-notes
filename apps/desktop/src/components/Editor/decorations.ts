import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import matter from 'gray-matter';
import { findWikiLinks } from './wikiLinkParser';

/**
 * Detect YAML frontmatter block using gray-matter
 * Returns the range of the frontmatter in the document
 */
export function detectFrontmatter(view: EditorView): { from: number; to: number } | null {
  const content = view.state.doc.toString();

  try {
    const parsed = matter(content);

    // gray-matter doesn't directly give us the position,
    // but we can determine it from the content structure
    // Check if matter is a string (even empty string) to confirm it was parsed as frontmatter
    if (typeof parsed.matter === 'string' && content.startsWith('---')) {
      // Find the closing --- delimiter
      const lines = content.split('\n');
      let endLine = 0;

      for (let i = 1; i < lines.length; i++) {
        // gray-matter supports --- and ... as closing delimiters
        if (lines[i].trim() === '---' || lines[i].trim() === '...') {
          endLine = i;
          break;
        }
      }

      if (endLine > 0) {
        // Calculate character positions
        // We need to account for newlines, so we join the lines back up
        const frontmatterText = lines.slice(0, endLine + 1).join('\n');
        const from = 0;
        const to = frontmatterText.length;

        return { from, to };
      }
    }
  } catch (error) {
    // If parsing fails, no frontmatter
    console.debug('No frontmatter detected', error);
  }

  return null;
}

/**
 * We need to handle the interleaving of decorations from different sources (Syntax Tree vs Manual Regex).
 * Since RangeSetBuilder requires ordered addition, we will collect all decoration requests into a buffer,
 * sort them, and then build the set.
 */
function buildCombinedDecorations(view: EditorView): DecorationSet {
    const decorations: Array<{from: number, to: number, deco: Decoration}> = [];

    // 1. Frontmatter
    const frontmatter = detectFrontmatter(view);
    if (frontmatter) {
         if (frontmatter.to >= view.viewport.from && frontmatter.from <= view.viewport.to) {
            decorations.push({
                from: frontmatter.from,
                to: frontmatter.to,
                deco: Decoration.mark({ class: 'cm-frontmatter' })
            });
         }
    }

    // 2. Syntax Tree (Standard Markdown)
    for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
            from,
            to,
            enter(node) {
                const { type, from, to } = node;

                if (type.name === 'StrongEmphasis') {
                    decorations.push({ from, to, deco: Decoration.mark({ class: 'cm-strong' }) });
                } else if (type.name === 'Emphasis') {
                     decorations.push({ from, to, deco: Decoration.mark({ class: 'cm-emphasis' }) });
                } else if (type.name === 'InlineCode') {
                     decorations.push({ from, to, deco: Decoration.mark({ class: 'cm-inline-code' }) });
                } else if (type.name.startsWith('ATXHeading')) {
                     decorations.push({ from, to, deco: Decoration.mark({ class: `cm-heading cm-heading-${type.name.slice(-1)}` }) });
                } else if (type.name === 'Link') {
                     decorations.push({ from, to, deco: Decoration.mark({ class: 'cm-link' }) });
                } else if (type.name === 'Strikethrough') {
                     decorations.push({ from, to, deco: Decoration.mark({ class: 'cm-strikethrough' }) });
                } else if (type.name === 'Blockquote') {
                    // Blockquotes are block level, we might want to decorate the whole line or content
                    // Usually they wrap content.
                    decorations.push({ from, to, deco: Decoration.mark({ class: 'cm-blockquote' }) });
                } else if (type.name === 'HorizontalRule') {
                    decorations.push({ from, to, deco: Decoration.mark({ class: 'cm-hr' }) });
                }
            }
        });
    }

    // 3. WikiLinks (Manual)
    const wikilinks = findWikiLinks(view);
    for (const { from, to, target } of wikilinks) {
        if (to >= view.viewport.from && from <= view.viewport.to) {
             decorations.push({
                 from,
                 to,
                 deco: Decoration.mark({
                     class: 'cm-wikilink',
                     attributes: { 'data-wikilink-target': target }
                 })
            });
        }
    }

    // Sort decorations by 'from' index
    decorations.sort((a, b) => a.from - b.from || a.to - b.to);

    // Build the set
    const builder = new RangeSetBuilder<Decoration>();
    for (const { from, to, deco } of decorations) {
        builder.add(from, to, deco);
    }

    return builder.finish();
}

/**
 * View plugin to manage decorations
 */
export const markdownDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildCombinedDecorations(view);
    }

    update(update: ViewUpdate) {
      // Rebuild decorations on doc change or viewport change
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildCombinedDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
