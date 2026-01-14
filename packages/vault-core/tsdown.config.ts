import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    main: 'src/main.ts',
    types: 'src/types.ts',
    pathSafety: 'src/pathSafety.ts',
    config: 'src/config.ts',
    'vault/types': 'src/vault/types.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
