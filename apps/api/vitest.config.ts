import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
  },
  // SWC emits decorator metadata, which Nest's DI needs (esbuild doesn't).
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
