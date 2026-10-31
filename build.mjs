// Builds jugar/JUGAR.html: one self-contained file (JS, CSS and fonts inlined)
// that opens with a double-click, offline, on Mac or Windows.
//   node build.mjs          one build
//   node build.mjs --watch  rebuild on every change in src/

import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync, watch } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'jugar', 'JUGAR.html');
const fontDir = join(root, 'node_modules', '@fontsource', 'bitter', 'files');

const FONTS = {
  __FONT_400__: 'bitter-latin-400-normal.woff2',
  __FONT_400I__: 'bitter-latin-400-italic.woff2',
  __FONT_700__: 'bitter-latin-700-normal.woff2',
  __FONT_700I__: 'bitter-latin-700-italic.woff2',
  __FONT_900__: 'bitter-latin-900-normal.woff2',
};

async function build() {
  const t0 = Date.now();
  const result = await esbuild.build({
    entryPoints: [join(root, 'src', 'main.js')],
    bundle: true,
    format: 'iife',
    minify: true,
    target: ['chrome100', 'safari15', 'edge100', 'firefox100'],
    legalComments: 'none',
    write: false,
  });
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

  let css = readFileSync(join(root, 'src', 'styles.css'), 'utf8');
  for (const [token, file] of Object.entries(FONTS)) {
    const b64 = readFileSync(join(fontDir, file)).toString('base64');
    css = css.replace(token, `data:font/woff2;base64,${b64}`);
  }

  const html = readFileSync(join(root, 'src', 'index.html'), 'utf8')
    .replace('/*__CSS__*/', () => css)
    .replace('/*__JS__*/', () => js);

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  const kb = Math.round(Buffer.byteLength(html) / 1024);
  console.log(`JUGAR.html listo (${kb} KB) en ${Date.now() - t0} ms`);
}

await build();

if (process.argv.includes('--watch')) {
  let timer = null;
  watch(join(root, 'src'), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch((e) => console.error(e.message)), 120);
  });
  console.log('Observando cambios en src/ ...');
}
