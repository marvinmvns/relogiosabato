import { defineConfig } from 'vite';

// Web Bluetooth só funciona em https ou localhost. O núcleo e os docs ficam em ../../.
export default defineConfig({
  base: './',
  server: { fs: { allow: ['../..'] } },
  build: { outDir: 'dist', emptyOutDir: true },
});
