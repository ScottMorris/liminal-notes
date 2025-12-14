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
 * Build decorations for the visible range
 */
function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  // Frontmatter Decoration
  const frontmatter = detectFrontmatter(view);
  if (frontmatter) {
    // Only add if visible
    if (frontmatter.to >= view.viewport.from && frontmatter.from <= view.viewport.to) {
        // Ensure we clip the range to what's valid (though decorations are usually robust)
        builder.add(
            frontmatter.from,
            frontmatter.to,
            Decoration.mark({
            class: 'cm-frontmatter',
            })
        );
    }
  }

  // Iterate through visible syntax tree
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        const { type, from, to } = node;

        // Bold: **text**
        if (type.name === 'StrongEmphasis') {
          builder.add(
            from,
            to,
            Decoration.mark({
              class: 'cm-strong',
              // Markers remain visible, but text gets weight
            })
          );
        }

        // Italic: _text_
        if (type.name === 'Emphasis') {
          builder.add(
            from,
            to,
            Decoration.mark({
              class: 'cm-emphasis',
            })
          );
        }

        // Inline code: `text`
        if (type.name === 'InlineCode') {
          builder.add(
            from,
            to,
            Decoration.mark({
              class: 'cm-inline-code',
            })
          );
        }

        // Headings: # H1, ## H2, etc.
        if (type.name.startsWith('ATXHeading')) {
          builder.add(
            from,
            to,
            Decoration.mark({
              class: `cm-heading cm-heading-${type.name.slice(-1)}`,
            })
          );
        }

        // Links: [text](url)
        // CodeMirror Markdown parses Link as [LinkMark, LinkText, LinkMark, URL, LinkMark] or similar structure depending on dialect
        // But usually 'Link' wraps the whole thing.
        if (type.name === 'Link') {
          builder.add(
            from,
            to,
            Decoration.mark({
              class: 'cm-link',
            })
          );
        }
      },
    });
  }

  // Add wikilinks using manual parser
  const wikilinks = findWikiLinks(view);
  for (const { from, to } of wikilinks) {
    // Only add decorations for visible wikilinks
    // RangeSetBuilder expects items to be added in increasing order of 'from'.
    // Since we are iterating separately, we have a problem: RangeSetBuilder must be built in order.
    //
    // To solve this, we cannot just append to 'builder' if we've already added items from syntaxTree that appear AFTER the wikilink.
    // However, syntaxTree iteration is ordered.
    // WikiLinks are also found in order.
    //
    // But mixing two sources into one RangeSetBuilder requires merging them first or using two separate builders/sets and combining them.
    // CodeMirror supports merging DecorationSets.
    //
    // So, let's change strategy:
    // 1. Build syntax decorations.
    // 2. Build wikilink decorations.
    // 3. Combine them.

    // Actually, to keep it simple and performant, we can just use one builder if we are careful,
    // but since we iterate syntaxTree (which yields nodes in order), injecting wikilinks "in between" is hard.
    //
    // Better approach: Return a DecorationSet that combines multiple RangeSets if needed, or better yet,
    // since we want to output a single DecorationSet, we can just create a separate set for wikilinks
    // and let CodeMirror handle multiple sets in the ViewPlugin?
    // No, ViewPlugin expects a single DecorationSet usually, but we can return `Decoration.set([set1, set2])`.
    //
    // Let's refactor `buildDecorations` to return an array of sets or just one merged set.
  }

  // Wait, RangeSetBuilder MUST be added to in order.
  // The syntaxTree iteration happens in order.
  // The wikiLinks are in order.
  // But they interleave.
  //
  // A cleaner way is to collect ALL decorations into an array first, sort them by `from`, and then build.

  return builder.finish();
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
                }
            }
        });
    }

    // 3. WikiLinks (Manual)
    const wikilinks = findWikiLinks(view);
    for (const { from, to } of wikilinks) {
        if (to >= view.viewport.from && from <= view.viewport.to) {
             decorations.push({ from, to, deco: Decoration.mark({ class: 'cm-wikilink' }) });
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
