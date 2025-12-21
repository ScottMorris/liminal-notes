import { describe, it, expect } from 'vitest';
import { parseFrontmatter, updateFrontmatter } from '../src/frontmatter';

describe('frontmatter', () => {
  it('parses frontmatter correctly', () => {
    const text = '---\ntitle: Hello\n---\nContent';
    const result = parseFrontmatter(text);
    expect(result.data.title).toBe('Hello');
    expect(result.content.trim()).toBe('Content');
  });

  it('updates frontmatter correctly', () => {
    const text = '---\ntitle: Old\n---\nContent';
    const updated = updateFrontmatter(text, (data) => {
      data.title = 'New';
    });
    expect(updated).toContain('title: New');
    expect(updated).toContain('Content');
  });

  it('handles empty frontmatter', () => {
    const text = 'Just content';
    const result = parseFrontmatter(text);
    expect(result.data).toEqual({});
    expect(result.content).toBe('Just content');
  });
});
