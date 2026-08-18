import { defineConfig } from 'vite';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = import.meta.dirname;

/**
 * Every generated page is its own real HTML entry, so the site ships as static
 * documents a crawler can read without executing a single line of JavaScript.
 * The pages themselves are produced by `npm run gen` before the build runs.
 */
function htmlInputs(): Record<string, string> {
  const inputs: Record<string, string> = {};

  for (const name of ['index.html', 'start.html', 'assets.html']) {
    const file = path.join(root, name);
    if (existsSync(file)) inputs[name.replace(/\.html$/, '')] = file;
  }

  const componentsDir = path.join(root, 'components');
  if (existsSync(componentsDir)) {
    for (const name of readdirSync(componentsDir)) {
      if (name.endsWith('.html')) inputs[`components/${name.slice(0, -5)}`] = path.join(componentsDir, name);
    }
  }
  return inputs;
}

export default defineConfig({
  root,
  publicDir: 'public',
  appType: 'mpa',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: { input: htmlInputs() },
  },
  server: { port: 5173 },
});
