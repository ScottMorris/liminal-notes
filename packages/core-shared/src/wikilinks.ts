import { WikiLinkMatch } from './types';

/**
 * Finds all wikilinks in the provided text.
 * Ignores escaped brackets (e.g. \[[link]]).
 *
 * @param text The text to scan.
 * @returns An array of wikilink matches.
 */
export function parseWikilinks(text: string): WikiLinkMatch[] {
  const wikilinks: WikiLinkMatch[] = [];
  const regex = /(?<!\\)\[\[([^\]]+)\]\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    wikilinks.push({
      from: match.index,
      to: match.index + match[0].length,
      targetRaw: match[1],
    });
  }

  return wikilinks;
}
