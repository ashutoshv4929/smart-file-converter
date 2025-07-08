import esbuild from 'esbuild';
import { tsconfigPathsPlugin } from '../esbuild-plugin.js';

await esbuild.build({
  entryPoints: ['server/index.ts'],
  platform: 'node',
  packages: 'external',
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  plugins: [tsconfigPathsPlugin]
});
