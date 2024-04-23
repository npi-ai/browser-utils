import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm', 'cjs'],
    platform: 'browser',
    clean: true,
    dts: true,
  },
  {
    entry: {
      index: 'src/index.iife.ts',
    },
    format: 'iife',
    platform: 'browser',
  },
]);
