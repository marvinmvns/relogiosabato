import { defineConfig } from 'vite';

// O núcleo compartilhado fica em ../../core.
export default defineConfig({
  server: { fs: { allow: ['../..'] } },
  build: { outDir: 'dist', emptyOutDir: true },
});
