import { Plugin } from 'esbuild';
import path from 'path';

export const tsconfigPathsPlugin: Plugin = {
  name: 'tsconfig-paths',
  setup(build) {
    build.onResolve({ filter: /^@shared\// }, args => {
      return {
        path: path.resolve(__dirname, '../shared', args.path.replace('@shared/', ''))
      };
    });
  }
};
