import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base: the build works from any folder (Vercel root, sub-path, Framer iframe).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    assetsDir: 'build',
    cssMinify: true,
    assetsInlineLimit: 4096,
  },
  server: { port: 4173, host: true },
});
