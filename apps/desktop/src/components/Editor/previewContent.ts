import { parseFrontmatter } from '@liminal-notes/core-shared/frontmatter';

export function buildPreviewContent(text: string, showFrontmatter: boolean): string {
  const source = showFrontmatter ? text : parseFrontmatter(text).content;
  return source.replace(/\[\[([^\]]+)\]\]/g, (_match, target) => `[${target}](wikilink:${target})`);
}
