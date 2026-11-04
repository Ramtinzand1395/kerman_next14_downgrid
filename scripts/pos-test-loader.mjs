// Node-only resolver matching Next's @ alias and extensionless TypeScript imports.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = new URL('../', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) specifier = new URL(specifier.slice(2), root).href;
    if ((specifier.startsWith('file:') || specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(specifier, context.parentURL ?? root);
      if (existsSync(fileURLToPath(url) + '.ts')) specifier = pathToFileURL(fileURLToPath(url) + '.ts').href;
    }
    return nextResolve(specifier, context);
  },
});
