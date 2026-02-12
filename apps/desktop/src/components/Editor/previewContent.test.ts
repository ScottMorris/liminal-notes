import { describe, expect, it } from 'vitest';
import { buildPreviewContent } from './previewContent';

describe('buildPreviewContent', () => {
  it('strips YAML front matter by default', () => {
    const input = [
      '---',
      'title: Test',
      'tags:',
      '  - one',
      '---',
      '',
      '# Heading',
      'Body text'
    ].join('\n');

    const output = buildPreviewContent(input, false);
    expect(output).toContain('# Heading');
    expect(output).toContain('Body text');
    expect(output).not.toContain('title: Test');
    expect(output).not.toContain('tags:');
  });

  it('keeps YAML front matter when showFrontmatter is enabled', () => {
    const input = ['---', 'title: Test', '---', '', 'Body'].join('\n');
    const output = buildPreviewContent(input, true);
    expect(output).toContain('title: Test');
    expect(output).toContain('Body');
  });

  it('converts wikilinks after front matter handling', () => {
    const input = ['---', 'title: Test', '---', '', 'Link to [[Note A]]'].join('\n');
    const output = buildPreviewContent(input, false);
    expect(output).toContain('[Note A](wikilink:Note A)');
  });
});
