import { getTsconfig } from '../../dts';
import type { IBundlessLoader, IJSTransformer, ILoaderOutput } from '../types';

const transformers: Record<string, IJSTransformer> = {};

export interface ITransformerItem {
  id: string;
  transformer: string;
}

/**
 * add javascript transformer
 * @param item
 */
export function addTransformer(item: ITransformerItem) {
  const mod = require(item.transformer);
  const transformer: IJSTransformer = mod.default || mod;

  transformers[item.id] = transformer;
}

/**
 * builtin javascript loader
 */
const jsLoader: IBundlessLoader = function (content) {
  const transformer = transformers[this.config.transformer!];
  const outputOpts: ILoaderOutput['options'] = {};

  // specify output ext for non-js file
  if (/\.(jsx|tsx?)$/.test(this.resource)) {
    outputOpts.ext = '.js';
  }

  // mark for output declaration file
  if (
    /\.tsx?$/.test(this.resource) &&
    getTsconfig(this.context!)?.options.declaration
  ) {
    outputOpts.declaration = true;
  }

  this.setOutputOptions(outputOpts);

  const ret = transformer.call(
    {
      config: this.config,
      pkg: this.pkg,
      paths: {
        cwd: this.cwd,
        fileAbsPath: this.resource,
      },
    },
    content!.toString(),
  );

  // handle async transformer
  if (ret instanceof Promise) {
    const cb = this.async();

    ret.then(
      (r) => cb(null, r),
      (e) => cb(e),
    );
  } else {
    return ret;
  }
};

export default jsLoader;
