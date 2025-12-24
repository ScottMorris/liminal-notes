import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    types: 'src/types.ts',
    wikilinks: 'src/wikilinks.ts',
    frontmatter: 'src/frontmatter.ts',
    'mobile/editorProtocol': 'src/mobile/editorProtocol.ts',
    'theme/index': 'src/theme/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
