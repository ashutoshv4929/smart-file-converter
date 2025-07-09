const esbuild = require('esbuild');
const path = require('path');

const sharedPath = path.join(__dirname, '../shared');

const externalDependencies = [
  'express',
  'libreoffice-convert',
  'dotenv',
  'cors'
];

esbuild.build({
  entryPoints: [path.join(__dirname, '../server/index.ts')],
  platform: 'node',
  external: externalDependencies,
  bundle: true,
  format: 'cjs',
  outfile: path.join(__dirname, '../dist/index.js'),
  plugins: [{
    name: 'tsconfig-paths',
    setup(build) {
      build.onResolve({ filter: /^@shared\// }, args => ({
        path: path.join(sharedPath, args.path.replace('@shared/', ''))
      }));
    }
  }]
}).catch(() => process.exit(1));
