import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    types: 'src/types.ts',
    wikilinks: 'src/wikilinks.ts',
    frontmatter: 'src/frontmatter.ts',
    'mobile/editorProtocol': 'src/mobile/editorProtocol.ts',
    'theme/index': 'src/theme/index.ts',
    'indexing/types': 'src/indexing/types.ts',
    'indexing/resolution': 'src/indexing/resolution.ts',
    'editor/decorations': 'src/editor/decorations.ts',
    'editor/commands': 'src/editor/commands.ts',
    'editor/frontmatterHider': 'src/editor/frontmatterHider.ts',
    'editor/wikiLinkParser': 'src/editor/wikiLinkParser.ts',
    'tags': 'src/tags.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
