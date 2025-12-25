import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    main: 'src/main.ts',
    types: 'src/types.ts',
    pathSafety: 'src/pathSafety.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
