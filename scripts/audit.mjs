/**
 * FantasyUIs — library audit
 * ---------------------------------------------------------------------------
 * Static checks that hold across every component at once. These are the rules
 * the architecture depends on and that a typechecker cannot see:
 *
 *   - a class referenced in TypeScript must be styled, and vice versa
 *   - every timer, observer and rAF loop must be released on destroy()
 *   - components must never reach for the global `document` (SSR depends on it)
 *   - an optional mask slot must never fall back to `none` (that paints a block)
 *   - every option field needs a doc comment, because the site's props table
 *     is generated from them
 *   - every asset id referenced must exist in the manifest
 *
 *   npm run audit
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const COMPONENTS = path.join(ROOT, 'src', 'lib', 'components');

const problems = [];
const notes = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);
const note = (file, msg) => notes.push(`${file}: ${msg}`);

/** Strip comments and string literals so scans do not match prose. */
function code(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const files = (await readdir(COMPONENTS)).filter((f) => f.endsWith('.ts')).sort();
const manifest = JSON.parse(await readFile(path.join(ROOT, 'public', 'registry.json'), 'utf8'));
const assetIds = new Set(manifest.assets.map((a) => a.id));

let checked = 0;

for (const file of files) {
  const name = file.replace(/\.ts$/, '');
  const ts = await readFile(path.join(COMPONENTS, file), 'utf8');
  const cssPath = path.join(COMPONENTS, `${name}.css`);
  let css = '';
  try {
    css = await readFile(cssPath, 'utf8');
  } catch {
    fail(name, 'has no matching .css file');
  }
  const body = code(ts);
  checked++;

  // ── 1. Class names must line up in both directions ────────────────────────
  // A class emitted by the component but never styled is a missing rule; a
  // class styled but never emitted is dead CSS or a typo.
  const emitted = new Set();
  for (const m of ts.matchAll(/class:\s*`([^`]+)`/g)) {
    // A template literal's `${…}` holes often contain their own class strings
    // (`${scroll ? ' fui-scroll' : ''}`), so harvest those first, then drop the
    // expressions before splitting what is left on whitespace.
    for (const inner of m[1].matchAll(/'([^']*)'/g)) {
      for (const c of inner[1].split(/\s+/)) if (c.startsWith('fui-')) emitted.add(c);
    }
    for (const c of m[1].replace(/\$\{[^}]*\}/g, ' ').split(/\s+/)) {
      if (c.startsWith('fui-')) emitted.add(c);
    }
  }
  for (const m of ts.matchAll(/class:\s*'([^']+)'/g)) {
    for (const c of m[1].split(/\s+/)) if (c.startsWith('fui-')) emitted.add(c);
  }
  for (const m of ts.matchAll(/classList\.(?:add|toggle)\('([^']+)'/g)) {
    if (m[1].startsWith('fui-')) emitted.add(m[1]);
  }
  // SVG elements are built with createElementNS and take their class through
  // setAttribute, so they never pass through h()'s `class:` prop.
  for (const m of ts.matchAll(/setAttribute\('class',\s*'([^']+)'/g)) {
    for (const c of m[1].split(/\s+/)) if (c.startsWith('fui-')) emitted.add(c);
  }
  for (const m of ts.matchAll(/querySelector(?:All)?\('\.([a-z0-9-]+)'/g)) {
    if (m[1].startsWith('fui-')) emitted.add(m[1]);
  }

  const styled = new Set();
  for (const m of css.matchAll(/\.(fui-[a-z0-9-]+(?:__[a-z0-9-]+)?(?:--[a-z0-9-]+)?)/g)) {
    styled.add(m[1]);
  }

  // Shared utilities live in base.css, not in the component's own sheet.
  const SHARED = new Set(['fui', 'fui-title', 'fui-label', 'fui-body', 'fui-num',
    'fui-engrave', 'fui-scroll', 'fui-9', 'fui-9-round', 'fui-9-overlay']);

  // An emitted class with no rule is usually a deliberate styling hook for
  // consumers rather than a mistake, so this is informational — but it is also
  // how a misspelt class name surfaces, which is why it is reported at all.
  for (const c of emitted) {
    if (SHARED.has(c) || styled.has(c)) continue;
    // `fui-x__act--${action}` leaves the stub `fui-x__act--` once the hole is
    // stripped; the real modifiers are spelled out in the stylesheet.
    if (c.endsWith('-') && [...styled].some((s) => s.startsWith(c))) continue;
    note(name, `emits class "${c}" that nothing styles (hook, or a typo)`);
  }
  for (const c of styled) {
    if (SHARED.has(c) || emitted.has(c)) continue;
    // A modifier is often applied via classList on a root built elsewhere.
    if (/--/.test(c) && emitted.has(c.split('--')[0])) continue;
    note(name, `styles "${c}" but the component never emits it`);
  }

  // ── 2. Everything that keeps running must be released ─────────────────────
  const hasTeardown = /onDestroy\(/.test(body);
  // A bare `requestAnimationFrame(fn)` fires once on the next frame and needs
  // no teardown; only a stored handle implies a loop that must be cancelled.
  for (const [pattern, label] of [
    [/setInterval\(/, 'setInterval'],
    [/=\s*requestAnimationFrame\(/, 'requestAnimationFrame loop'],
    [/new ResizeObserver\(/, 'ResizeObserver'],
    [/new MutationObserver\(/, 'MutationObserver'],
    [/new IntersectionObserver\(/, 'IntersectionObserver'],
  ]) {
    if (pattern.test(body) && !hasTeardown) {
      fail(name, `starts a ${label} but registers no onDestroy() teardown`);
    }
  }
  // A setTimeout that only fires once is fine; a stored handle is not.
  if (/this\.\w*[Tt]imer\s*=\s*setTimeout/.test(body) && !hasTeardown) {
    fail(name, 'stores a setTimeout handle but registers no onDestroy() teardown');
  }

  // ── 3. Never touch the global document ────────────────────────────────────
  if (/(^|[^.\w])document\./.test(body)) {
    fail(name, 'reaches for the global `document`; use doc() from core/dom.ts');
  }
  if (/(^|[^.\w])window\./.test(body)) {
    fail(name, 'reaches for the global `window`; it is undefined during SSR');
  }

  // ── 4. `mask: none` paints a solid block ──────────────────────────────────
  if (/mask:\s*var\(--[a-z-]+,\s*none\)/.test(css)) {
    fail(name, 'falls back to `mask: none`, which paints a solid block; use var(--fui-mask-none)');
  }

  // ── 5. Options fields need doc comments, they become the props table ──────
  const iface = ts.match(
    new RegExp(`export interface ${name}Options extends BaseOptions \\{([\\s\\S]*?)\\n\\}`),
  );
  if (!iface) {
    note(name, `has no "export interface ${name}Options extends BaseOptions"; no props table will be generated`);
  } else {
    const lines = iface[1].split('\n');
    let documented = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('/*') || line.startsWith('*') || line.startsWith('//')) {
        documented = line.endsWith('*/') || line.startsWith('*') || line.startsWith('/**');
        if (line.endsWith('*/')) documented = true;
        continue;
      }
      const field = line.match(/^([a-zA-Z_$][\w$]*)\??:/);
      if (!field) continue;
      if (!documented) note(name, `option "${field[1]}" has no doc comment (it will show a blank description)`);
      documented = false;
    }
  }

  // ── 6. Asset ids must exist ───────────────────────────────────────────────
  for (const m of ts.matchAll(/--fui-img-([a-z0-9-]+)\)/g)) {
    const id = m[1];
    if (id.includes('$') || id === 'deco-frame') continue;
    if (!assetIds.has(id)) fail(name, `references asset id "${id}", which is not in the manifest`);
  }

  // ── 7. Events must be namespaced ──────────────────────────────────────────
  for (const m of ts.matchAll(/this\.emit(?:<[^>]*>)?\('([^']+)'/g)) {
    if (!m[1].includes(':')) fail(name, `emits "${m[1]}" without a "ns:verb" namespace`);
  }

  // ── 8. Components expose .el via FuiComponent ─────────────────────────────
  if (!/extends FuiComponent/.test(ts)) {
    note(name, 'does not extend FuiComponent');
  }

  // The file name is the component's identity: the catalog id, the props-table
  // lookup, the /r/<id>.json copy bundle and the site's URL are all derived
  // from it, so a class that disagrees with its file breaks all four at once.
  const cls = ts.match(/export class ([A-Za-z0-9_]+)/);
  if (cls && cls[1] !== name) {
    fail(name, `exports class "${cls[1]}"; the class and its file must share a name`);
  }
}

// ── 9. Every "Pairs with" chip must lead somewhere ──────────────────────────
// A `related` id that matches no component renders as a chip linking to a 404,
// which is invisible in a typecheck and in the browser until someone clicks it.
{
  const ids = new Set(manifest.components.map((c) => c.id));
  for (const c of manifest.components) {
    for (const rel of c.related ?? []) {
      if (!ids.has(rel)) fail(c.id, `lists related component "${rel}", which does not exist`);
    }
    if (c.related?.includes(c.id)) fail(c.id, 'lists itself as a related component');
    if (c.name !== c.id) fail(c.id, `is catalogued under the display name "${c.name}"`);
  }
}

// ── 9. Barrel and catalog coverage ──────────────────────────────────────────
const barrel = await readFile(path.join(ROOT, 'src', 'lib', 'index.ts'), 'utf8');
const stylesheet = await readFile(path.join(ROOT, 'src', 'lib', 'styles', 'index.css'), 'utf8');
const registryIds = new Set(manifest.components.map((c) => c.id));

for (const file of files) {
  const name = file.replace(/\.ts$/, '');
  if (!barrel.includes(`components/${name}.ts`)) fail(name, 'missing from src/lib/index.ts');
  if (!stylesheet.includes(`components/${name}.css`)) fail(name, 'missing from styles/index.css');
  if (!registryIds.has(name)) fail(name, 'has no catalog entry, so it is absent from the site and registry.json');
}

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`audited ${checked} components`);
if (notes.length) {
  console.log(`\n${notes.length} note(s):`);
  for (const n of notes) console.log(`  · ${n}`);
}
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ✗ ${p}`);
  process.exitCode = 1;
} else {
  console.log('\n✓ no problems');
}
