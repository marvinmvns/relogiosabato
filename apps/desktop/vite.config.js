import { defineConfig } from 'vite';

// base relativa: o Electron carrega dist/index.html via file://.
export default defineConfig({
  base: './',
  server: { fs: { allow: ['../..'] } },
  build: { outDir: 'dist', emptyOutDir: true },
});
