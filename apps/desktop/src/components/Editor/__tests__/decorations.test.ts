import { describe, it, expect } from 'vitest';
import { detectFrontmatter } from '../decorations';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';

describe('frontmatter detection', () => {
  it('detects frontmatter block', () => {
    const content = `---
title: Test
tags: [one, two]
---

Content here`;

    const state = EditorState.create({ doc: content });
    const view = new EditorView({ state });
    const result = detectFrontmatter(view);

    expect(result).not.toBeNull();
    expect(result!.from).toBe(0);
    // 3 dashes + newline + title line + tags line + 3 dashes = ...
    // Let's rely on truthy check and range bounds sanity
    expect(result!.to).toBeGreaterThan(0);
    expect(state.doc.sliceString(result!.from, result!.to)).toContain('title: Test');
    // Vitest (Chai) uses .match for regex or we can assert manually
    expect(state.doc.sliceString(result!.from, result!.to).endsWith('---')).toBe(true);
  });

  it('returns null when no frontmatter', () => {
    const content = '# Just a heading\n\nNo frontmatter';
    const state = EditorState.create({ doc: content });
    const view = new EditorView({ state });

    expect(detectFrontmatter(view)).toBeNull();
  });

  it('handles empty frontmatter', () => {
      const content = `---
---
`;
    const state = EditorState.create({ doc: content });
    const view = new EditorView({ state });
    const result = detectFrontmatter(view);
    expect(result).not.toBeNull();
    expect(result!.to).toBe(7); // ---\n--- is 3+1+3 = 7 chars
  });
});
