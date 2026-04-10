import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/extension.ts'],
  outDir: './dist',
  format: 'cjs',
  sourcemap: true,
  minify: true,
  dts: false,
  outExtensions: ({ format }) => ({
    js: format === 'cjs' ? '.js' : '.mjs',
    dts: format === 'cjs' ? '.d.ts' : '.d.mts',
  }),
  platform: 'node',
  deps: {
    onlyBundle: false,
    neverBundle: ['vscode'],
  },
});
