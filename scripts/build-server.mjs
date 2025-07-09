import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedPath = path.join(__dirname, '../shared');

const externalDependencies = [
  'express',
  'libreoffice-convert',
  'dotenv',
  'cors'
];

try {
  await esbuild.build({
    entryPoints: ['../server/index.ts'],
    platform: 'node',
    external: externalDependencies,
    bundle: true,
    format: 'esm',
    mainFields: ['module', 'main'],
    outdir: path.join(__dirname, '../dist'),
    nodePaths: [path.join(__dirname, '../node_modules')],
    plugins: [{
      name: 'tsconfig-paths',
      setup(build) {
        build.onResolve({ filter: /^@shared\// }, args => ({
          path: path.join(sharedPath, args.path.replace('@shared/', ''))
        }));
      }
    }]
  });
  console.log('Server build completed successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
