import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

import { resolve } from 'path';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        editor: resolve(__dirname, 'editor.html'),
      },
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    // rollupOptions merged above
  },
});
