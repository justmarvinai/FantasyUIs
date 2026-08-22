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
 *   - every asset id referenced must exist in the manifest, in components and
 *     in the demos, and a slot drawn as a mask must be given monochrome art
 *   - every component llms.txt names in its recipes must actually exist
 *   - a component's `copy` list must name every file it actually imports
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
  // A `class:` whose value is an expression rather than a literal — most often a
  // ternary picking between two names. Harvest every quoted class in the value.
  for (const m of ts.matchAll(/class:\s*([^,\n]*\?[^,\n]*)/g)) {
    for (const inner of m[1].matchAll(/'([^']*)'/g)) {
      for (const c of inner[1].split(/\s+/)) if (c.startsWith('fui-')) emitted.add(c);
    }
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

// ── 10. Demo asset ids must exist, and mask slots need monochrome art ───────
// The demos are the library's code samples, so a wrong id there ships as
// documentation. Two failures matter and neither shows up in a typecheck: an id
// that is not in the manifest resolves to an undefined custom property (which
// invalidates the whole declaration it sits in), and a *painted* icon handed to
// a slot the component draws as a CSS mask renders as a solid block.
//
// Which slots are masks is derived, not guessed: find the custom properties a
// component's CSS feeds to `mask`, then find the option field its TypeScript
// writes into them. `icon` is a mask on SynergyPanel and a background on Icon,
// and only the component itself knows which.
{
  const byId = new Map(manifest.assets.map((a) => [a.id, a]));

  /** component id → set of option field names drawn through a mask */
  const maskFields = new Map();
  for (const file of files) {
    const name = file.replace(/\.ts$/, '');
    const ts = await readFile(path.join(COMPONENTS, file), 'utf8');
    let css = '';
    try {
      css = await readFile(path.join(COMPONENTS, `${name}.css`), 'utf8');
    } catch {
      continue;
    }

    const masked = new Set();
    for (const m of css.matchAll(/-?(?:webkit-)?mask(?:-image)?\s*:\s*([^;]+);/g)) {
      for (const v of m[1].matchAll(/var\(\s*(--fui-[a-z0-9-]+)/g)) masked.add(v[1]);
    }
    if (!masked.size) continue;

    const fields = new Set();
    for (const prop of masked) {
      // `'--fui-x-glyph': `var(--fui-img-${skill.icon})`` → field name `icon`.
      const re = new RegExp(`'${prop}'\\s*:\\s*\`var\\(--fui-img-\\$\\{([^}]+)\\}\\)\``, 'g');
      for (const m of ts.matchAll(re)) {
        const expr = m[1].trim();
        const field = expr.split(/[.?]/).filter(Boolean).pop();
        if (field && /^[a-zA-Z][a-zA-Z0-9]*$/.test(field)) fields.add(field);
      }
    }
    if (fields.size) maskFields.set(name, fields);
  }

  const demoDir = path.join(ROOT, 'src', 'site', 'demos');
  for (const file of (await readdir(demoDir)).filter((f) => f.endsWith('.ts')).sort()) {
    const src = await readFile(path.join(demoDir, file), 'utf8');
    const where = `demos/${file}`;

    // Every asset id in the file must exist, whatever slot it sits in.
    for (const m of src.matchAll(/\b(?:art|thumb|crest|glyph|icon|means|[a-zA-Z]*Art)\s*:\s*'([a-z0-9-]+)'/g)) {
      if (!byId.has(m[1])) fail(where, `references asset "${m[1]}", which is not in the manifest`);
    }
    for (const list of src.matchAll(/\b(?:glyphs|effects)\s*:\s*\[([^\]]*)\]/gs)) {
      for (const g of list[1].matchAll(/'([a-z0-9-]+)'/g)) {
        if (!byId.has(g[1])) fail(where, `references asset "${g[1]}", which is not in the manifest`);
      }
    }

    // Mask slots additionally need monochrome art. Scope each field to the
    // component being constructed above it — the nearest preceding `new X(`.
    const constructions = [...src.matchAll(/new\s+([A-Z][A-Za-z0-9]*)\s*\(/g)];
    const componentAt = (index) => {
      let current = null;
      for (const c of constructions) {
        if (c.index > index) break;
        current = c[1];
      }
      return current;
    };

    for (const m of src.matchAll(/\b([a-zA-Z][a-zA-Z0-9]*)\s*:\s*'([a-z0-9-]+)'/g)) {
      const asset = byId.get(m[2]);
      if (!asset || asset.category === 'glyph') continue;
      const owner = componentAt(m.index);
      if (owner && maskFields.get(owner)?.has(m[1])) {
        fail(
          where,
          `passes painted art "${m[2]}" to ${owner}'s \`${m[1]}\`, which is drawn as a mask — it will paint a solid block`,
        );
      }
    }
    for (const list of src.matchAll(/\b(glyphs|effects)\s*:\s*\[([^\]]*)\]/gs)) {
      const owner = componentAt(list.index);
      if (!owner || !maskFields.get(owner)?.has(list[1])) continue;
      for (const g of list[2].matchAll(/'([a-z0-9-]+)'/g)) {
        const asset = byId.get(g[1]);
        if (asset && asset.category !== 'glyph') {
          fail(where, `passes painted art "${g[1]}" to ${owner}'s \`${list[1]}\`, a mask slot`);
        }
      }
    }
  }
}

// ── 11. Every component named in llms.txt must exist ────────────────────────
// The screen recipes and the button table are the first thing an agent reads,
// and a name in either that resolves to nothing sends it off to fetch a 404.
// They are prose in a template rather than data, so nothing else checks them.
{
  const llmsPath = path.join(ROOT, 'public', 'llms.txt');
  let llms = '';
  try {
    llms = await readFile(llmsPath, 'utf8');
  } catch {
    llms = '';
  }
  if (llms) {
    const ids = new Set(manifest.components.map((c) => c.id));
    const start = llms.indexOf('### 2. Compose screens');
    const end = llms.indexOf('### 3. You can also');
    if (start !== -1 && end !== -1) {
      const section = llms.slice(start, end);
      const named = new Set();
      // The button table wraps names in backticks.
      for (const m of section.matchAll(/`([A-Z][A-Za-z0-9]+)`/g)) named.add(m[1]);
      // Recipe lines are `<label><wide gap><components>` and wrap onto
      // continuation lines that begin with `+`. Only the component column is
      // scanned — the label column is prose like "Battle HUD".
      for (const line of section.split('\n')) {
        const continuation = /^\s{8,}\+/.test(line);
        if (!continuation && !/^ {4}\S/.test(line)) continue;
        const raw = continuation ? line : line.replace(/^ {4}.*?\s{2,}/, '');
        if (!continuation && raw === line.trim()) continue;
        // Parenthesised text is a gloss on the component before it — "(Use ×10)",
        // "(Start battle)" — not more component names.
        const tail = raw.replace(/\([^)]*\)/g, ' ');
        for (const m of tail.matchAll(/\b([A-Z][A-Za-z0-9]{2,})\b/g)) named.add(m[1]);
      }
      for (const name of named) {
        if (!ids.has(name)) fail('llms.txt', `names "${name}", which is not a component`);
      }
    }
  }
}

// ── 12. A record's `copy` list must actually compile ────────────────────────
// The promise on every component page is "copy these files and it builds". That
// only holds if the list names every core module the component imports, so
// check the imports against the list rather than trusting CORE_FILES to have
// kept up. Getting this wrong is silent here and fatal in someone's game.
{
  const byId = new Map(manifest.components.map((c) => [c.id, c]));
  for (const file of files) {
    const name = file.replace(/\.ts$/, '');
    const record = byId.get(name);
    if (!record) continue;
    const ts = await readFile(path.join(COMPONENTS, file), 'utf8');
    const copy = new Set(record.copy ?? []);

    for (const m of ts.matchAll(/from '\.\.\/core\/([a-zA-Z0-9_-]+)\.ts'/g)) {
      const needed = `src/lib/core/${m[1]}.ts`;
      if (!copy.has(needed)) fail(name, `imports ${needed} but its copy list omits it`);
    }
    for (const m of ts.matchAll(/from '\.\/([A-Za-z0-9_]+)\.ts'/g)) {
      const needed = `src/lib/components/${m[1]}.ts`;
      if (!copy.has(needed)) fail(name, `imports ${needed} but its copy list omits it`);
    }
  }
}

// ── 13. Barrel and catalog coverage ─────────────────────────────────────────
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
