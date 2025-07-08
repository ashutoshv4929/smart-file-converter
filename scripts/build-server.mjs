import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedPath = path.join(__dirname, '../shared');

await esbuild.build({
  entryPoints: ['../server/index.ts'],
  platform: 'node',
  packages: 'external',
  bundle: true,
  format: 'esm',
  outdir: '../dist',
  plugins: [{
    name: 'tsconfig-paths',
    setup(build) {
      build.onResolve({ filter: /^@shared\// }, args => ({
        path: path.join(sharedPath, args.path.replace('@shared/', ''))
      }));
    }
  }]
});
