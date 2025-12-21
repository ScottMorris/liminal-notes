import { describe, it, expect } from 'vitest';
import { parseWikilinks } from '../src/wikilinks';

describe('parseWikilinks', () => {
  it('finds a simple wikilink', () => {
    const text = 'This is a [[link]] to somewhere.';
    const matches = parseWikilinks(text);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({
      from: 10,
      to: 18,
      targetRaw: 'link',
    });
  });

  it('finds multiple wikilinks', () => {
    const text = '[[Link1]] and [[Link2]]';
    const matches = parseWikilinks(text);
    expect(matches).toHaveLength(2);
    expect(matches[0].targetRaw).toBe('Link1');
    expect(matches[1].targetRaw).toBe('Link2');
  });

  it('handles spaces in links', () => {
    const text = '[[Link with spaces]]';
    const matches = parseWikilinks(text);
    expect(matches[0].targetRaw).toBe('Link with spaces');
  });

  it('ignores escaped links', () => {
    const text = 'This is not a \\[[link]]';
    const matches = parseWikilinks(text);
    expect(matches).toHaveLength(0);
  });
});
