/**
 * FantasyUIs — site generator
 * ---------------------------------------------------------------------------
 * Builds the whole documentation site as static HTML:
 *
 *   • one real page per component, with every demo PRE-RENDERED to markup so a
 *     crawler (or an AI agent) reads the finished DOM without running any JS
 *   • the gallery index, the asset browser and the getting-started page
 *   • machine-readable endpoints: /registry.json, /r/<id>.json, /llms.txt
 *
 * Demos are executed in Node against a linkedom document, which is why every
 * component resolves its Document through `core/dom.ts` instead of touching the
 * global one.
 *
 *   npm run gen
 */
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { parseHTML } from 'linkedom';
import { genLib } from './gen-lib.mjs';
import { SITE, ASSET_BASE } from '../catalog/site.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_COMPONENTS = path.join(ROOT, 'components');
const OUT_PUBLIC = path.join(ROOT, 'public');


// ── HTML helpers ───────────────────────────────────────────────────────────
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Escape, then turn `backticked` spans into real inline code. */
const inline = (str) =>
  esc(str).replace(/`([^`]+)`/g, '<code>$1</code>');

const KEYWORDS = new Set(
  ('const let var new return import from export default function if else for of in while do await async ' +
    'class extends implements interface type enum as satisfies void never unknown any true false null ' +
    'undefined this super try catch finally throw switch case break continue static readonly public ' +
    'private protected get set delete typeof instanceof yield')
    .split(' '),
);

/**
 * Single-pass tokeniser for the code blocks.
 *
 * Hand-written rather than a chain of regexes because sequential replacement
 * corrupts anything already highlighted: the number pass happily rewrites the
 * digits inside a span the string pass just emitted.
 */
function highlight(code) {
  // Strip control characters — parse5 rejects a stray NUL in the page.
  const src = String(code).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  const out = [];
  const push = (cls, text) =>
    out.push(cls ? `<span class="tok-${cls}">${esc(text)}</span>` : esc(text));

  let i = 0;
  const n = src.length;

  while (i < n) {
    const ch = src[i];

    if (ch === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i);
      const end = nl === -1 ? n : nl;
      push('comment', src.slice(i, end));
      i = end;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2);
      const end = close === -1 ? n : close + 2;
      push('comment', src.slice(i, end));
      i = end;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < n && src[j] !== ch) {
        if (src[j] === '\\') j++;
        j++;
      }
      push('str', src.slice(i, Math.min(j + 1, n)));
      i = j + 1;
      continue;
    }
    if (ch >= '0' && ch <= '9' && !/[A-Za-z0-9_$]/.test(src[i - 1] ?? '')) {
      let j = i;
      while (j < n && /[0-9a-fA-FxX._]/.test(src[j])) j++;
      push('num', src.slice(i, j));
      i = j;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      let k = j;
      while (k < n && src[k] === ' ') k++;

      if (KEYWORDS.has(word)) push('kw', word);
      else if (src[k] === ':' && src[k + 1] !== ':') push('key', word);
      else if (/^[A-Z]/.test(word)) push('type', word);
      else push(null, word);
      i = j;
      continue;
    }
    push(null, ch);
    i++;
  }
  return out.join('');
}

function codeBlock(code, lang = 'ts', label = '') {
  return `<div class="code" data-lang="${esc(lang)}">
  <div class="code__bar"><span>${esc(label || lang)}</span><button class="code__copy" type="button" data-copy>Copy</button></div>
  <pre class="code__pre"><code>${highlight(code)}</code></pre>
  <textarea class="code__raw" hidden>${esc(code)}</textarea>
</div>`;
}

// ── Source extraction ──────────────────────────────────────────────────────

/**
 * Strip an arrow function down to the code a reader actually cares about.
 *
 * The function comes from a module Vite transformed for SSR, so its imported
 * bindings arrive rewritten as `__vite_ssr_import_3__.Panel`. Those get undone
 * here — otherwise the snippet on the page is not the snippet you can paste.
 */
function extractCode(fn) {
  let src = fn
    .toString()
    .replace(/__vite_ssr_import_\d+__\./g, '')
    .trim();
  const arrow = src.indexOf('=>');
  if (arrow === -1) return src;
  let body = src.slice(arrow + 2).trim();

  if (body.startsWith('{')) {
    body = body.slice(1, body.lastIndexOf('}'));
  }
  const lines = body.replace(/^\n+|\s+$/g, '').split('\n');
  const indent = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length),
  );
  return lines.map((l) => l.slice(indent)).join('\n').trim();
}

/** Prepend the import line a reader needs, inferred from what the code uses. */
function withImports(code) {
  const used = new Set([...code.matchAll(/new ([A-Z][A-Za-z0-9]*)\(/g)].map((m) => m[1]));
  for (const helper of ['h', 'setAssetBase']) {
    if (new RegExp(`\\b${helper}\\(`).test(code)) used.add(helper);
  }
  const lines = [];
  if (used.size) lines.push(`import { ${[...used].join(', ')} } from 'fantasyuis';`, '');
  // row()/col() are flex wrappers belonging to this site, not the library.
  if (/\b(row|col)\(/.test(code)) {
    lines.push("// row() and col() are one-line flex wrappers used by these docs:", "//   const row = (...k) => h('div', { style: { display: 'flex', gap: '16px' } }, ...k);", '');
  }
  return lines.join('\n') + code;
}

/**
 * Pull the options interface out of a component's source so the props table is
 * always in step with the real type. Relies on the library's house style:
 * one `export interface <Name>Options extends BaseOptions { … }` per file, with
 * JSDoc above the fields worth documenting.
 */
function parseProps(src) {
  const start = src.match(/export interface \w*Options extends BaseOptions \{\n/);
  if (!start) return [];
  const body = src.slice(start.index + start[0].length);
  const end = body.indexOf('\n}');
  const fields = body.slice(0, end === -1 ? undefined : end).split('\n');

  const props = [];
  let doc = [];
  let buffer = '';

  for (const raw of fields) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('/**')) {
      doc = [line.replace(/^\/\*\*\s?/, '').replace(/\s?\*\/$/, '')].filter(Boolean);
      if (line.endsWith('*/')) continue;
      continue;
    }
    if (line.startsWith('*/')) continue;
    if (line.startsWith('*')) {
      doc.push(line.replace(/^\*\s?/, ''));
      continue;
    }

    buffer = buffer ? `${buffer} ${line}` : line;
    if (!buffer.endsWith(';')) continue;

    const m = buffer.match(/^([A-Za-z0-9_]+)(\?)?:\s*([\s\S]+);$/);
    if (m) {
      props.push({
        name: m[1],
        optional: !!m[2],
        type: m[3].replace(/\s+/g, ' ').trim(),
        doc: doc.join(' ').trim(),
      });
    }
    buffer = '';
    doc = [];
  }
  return props;
}

// ── Page shell ─────────────────────────────────────────────────────────────
function layout({ title, description, body, active = '', canonical = '', extraHead = '' }) {
  return `<!doctype html>
<html lang="en" data-theme="stone-vine">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
${canonical ? `<link rel="canonical" href="${esc(canonical)}" />` : ''}
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<link rel="icon" href="/fui/stone-vine/icon-sword.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Spectral:ital,wght@0,400;0,600;1,400&family=Alegreya+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
${extraHead}
<script type="module" src="/src/site/page.ts"></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <a class="brand" href="/">
    <span class="brand__mark" aria-hidden="true"></span>
    <span class="brand__text">Fantasy<em>UIs</em></span>
  </a>
  <nav class="topnav">
    <a href="/"${active === 'index' ? ' aria-current="page"' : ''}>Components</a>
    <a href="/assets.html"${active === 'assets' ? ' aria-current="page"' : ''}>Assets</a>
    <a href="/start.html"${active === 'start' ? ' aria-current="page"' : ''}>Get started</a>
    <a href="/llms.txt" class="topnav__ai">For AI agents</a>
  </nav>
  <div class="themeswitch" role="group" aria-label="Theme">
    <button type="button" data-theme-set="stone-vine" aria-pressed="true">Stone &amp; Vine</button>
    <button type="button" data-theme-set="dark-ember" aria-pressed="false">Dark Ember</button>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="sitefoot">
  <p>${esc(SITE.name)} — ${esc(SITE.tagline)}. Vanilla TypeScript + CSS, zero runtime dependencies.</p>
  <p class="sitefoot__links"><a href="/registry.json">registry.json</a> · <a href="/llms.txt">llms.txt</a> · <a href="/llms-full.txt">llms-full.txt</a> · <a href="/assets.html">asset browser</a></p>
</footer>
</body>
</html>`;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const lib = await genLib();

  // `core/assets.ts` is hand-written (it is part of the copy-paste surface), so
  // its default base cannot be generated from the site config. Check it instead
  // — a mismatch would ship snippets pointing at a domain that isn't ours.
  const assetsTs = await readFile(path.join(ROOT, 'src', 'lib', 'core', 'assets.ts'), 'utf8');
  const declared = assetsTs.match(/CDN_BASE = '([^']+)'/)?.[1];
  if (declared !== ASSET_BASE) {
    console.warn(
      `  ! CDN_BASE in src/lib/core/assets.ts is "${declared}" but catalog/site.mjs says "${ASSET_BASE}" — update assets.ts.`,
    );
  }

  // Fresh output every run so deleted components never linger.
  if (existsSync(OUT_COMPONENTS)) await rm(OUT_COMPONENTS, { recursive: true });
  await mkdir(OUT_COMPONENTS, { recursive: true });
  await mkdir(path.join(OUT_PUBLIC, 'r'), { recursive: true });

  // Node-side DOM. Components read their Document from core/dom.ts, so pointing
  // that at linkedom is all it takes to render them server-side.
  const { document, window } = parseHTML(
    '<!doctype html><html><head></head><body></body></html>',
  );
  globalThis.window = window;
  globalThis.document = document;
  globalThis.CustomEvent = window.CustomEvent;
  globalThis.Event = window.Event;
  globalThis.Node = window.Node;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  // Demos legitimately start intervals (buff timers, loading bars). Track them
  // so the generator can shut them down instead of hanging on exit.
  const live = new Set();
  const realInterval = globalThis.setInterval;
  const realTimeout = globalThis.setTimeout;
  globalThis.setInterval = (...a) => {
    const id = realInterval(...a);
    live.add(['i', id]);
    return id;
  };
  globalThis.setTimeout = (...a) => {
    const id = realTimeout(...a);
    live.add(['t', id]);
    return id;
  };
  const drainTimers = () => {
    for (const [kind, id] of live) kind === 'i' ? clearInterval(id) : clearTimeout(id);
    live.clear();
  };

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'warn',
  });

  const dom = await vite.ssrLoadModule('/src/lib/core/dom.ts');
  dom.setDocument(document);
  const { CATALOG, GROUP_LABELS, GROUP_ORDER } = await vite.ssrLoadModule('/src/site/catalog.ts');
  const { ASSETS, PACKS } = await vite.ssrLoadModule('/src/data/assets.generated.ts');

  /**
   * Which other components a component pulls in, transitively.
   *
   * This is the piece that makes "copy the file into your game" actually work:
   * ChampionCard imports StarRating and AffinityBadge, so handing someone only
   * ChampionCard.ts hands them a file that will not compile. Everything below
   * is derived from the real import statements rather than maintained by hand.
   */
  const componentDir = path.join(ROOT, 'src', 'lib', 'components');
  const directDeps = new Map();
  for (const entry of CATALOG) {
    const file = path.join(componentDir, `${entry.id}.ts`);
    const src = existsSync(file) ? await readFile(file, 'utf8') : '';
    const deps = new Set();
    for (const m of src.matchAll(/from '\.\/([A-Za-z0-9_]+)\.ts'/g)) deps.add(m[1]);
    directDeps.set(entry.id, deps);
  }
  const depCache = new Map();
  const resolveDeps = (id, seen = new Set()) => {
    if (depCache.has(id)) return depCache.get(id);
    const out = new Set();
    for (const dep of directDeps.get(id) ?? []) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      out.add(dep);
      for (const nested of resolveDeps(dep, seen)) out.add(nested);
    }
    const sorted = [...out].sort();
    depCache.set(id, sorted);
    return sorted;
  };
  /** The core files every component needs, whatever else it imports. */
  const CORE_FILES = ['src/lib/core/component.ts', 'src/lib/core/dom.ts'];

  const THEME_PACKS = PACKS.filter((p) => p.kind === 'theme');
  const ART_PACKS = PACKS.filter((p) => p.kind !== 'theme');

  const registry = [];

  // ── Component pages ──────────────────────────────────────────────────────
  for (const entry of CATALOG) {
    const tsPath = path.join(ROOT, 'src', 'lib', 'components', `${entry.id}.ts`);
    const cssPath = path.join(ROOT, 'src', 'lib', 'components', `${entry.id}.css`);
    const tsSrc = existsSync(tsPath) ? await readFile(tsPath, 'utf8') : '';
    const cssSrc = existsSync(cssPath) ? await readFile(cssPath, 'utf8') : '';
    const props = parseProps(tsSrc);
    const deps = resolveDeps(entry.id);
    const copyList = [
      ...CORE_FILES,
      ...(tsSrc.includes('core/assets.ts') ? ['src/lib/core/assets.ts'] : []),
      ...deps.flatMap((d) => [`src/lib/components/${d}.ts`, `src/lib/components/${d}.css`]),
      `src/lib/components/${entry.id}.ts`,
      `src/lib/components/${entry.id}.css`,
    ];

    const demoBlocks = [];
    const snippets = [];

    for (const [i, demo] of entry.demos.entries()) {
      let markup = '';
      try {
        const node = demo.build();
        markup = node.outerHTML ?? '';
      } catch (err) {
        console.warn(`  ! ${entry.id} demo "${demo.title}" failed to pre-render: ${err.message}`);
      }
      drainTimers();

      const code = demo.code ?? withImports(extractCode(demo.build));
      snippets.push(code);

      demoBlocks.push(`<section class="demo" id="demo-${i}">
  <div class="demo__head">
    <h3>${esc(demo.title)}</h3>
    ${demo.note ? `<p class="demo__note">${inline(demo.note)}</p>` : ''}
  </div>
  <div class="demo__stage fui" data-stage="${esc(demo.stage ?? 'plain')}" data-demo="${esc(entry.id)}" data-demo-index="${i}">${markup}</div>
  ${codeBlock(code, 'ts', `${entry.id} — ${demo.title}`)}
</section>`);
    }

    const propRows = props.length
      ? `<table class="props">
<thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
${props
  .map(
    (p) =>
      `<tr><td><code>${esc(p.name)}</code>${p.optional ? '' : ' <span class="req">required</span>'}</td><td><code class="type">${esc(p.type)}</code></td><td>${esc(p.doc)}</td></tr>`,
  )
  .join('\n')}
</tbody></table>`
      : '<p class="muted">This component takes no options beyond the shared base options.</p>';

    const related = (entry.related ?? [])
      .filter((id) => CATALOG.some((c) => c.id === id))
      .map((id) => `<a class="chip" href="/components/${id}.html">${esc(id)}</a>`)
      .join('');

    const body = `<article class="page">
  <nav class="crumbs"><a href="/">Components</a> <span>/</span> <span>${esc(GROUP_LABELS[entry.group])}</span> <span>/</span> <strong>${esc(entry.name)}</strong></nav>
  <header class="page__head">
    <h1>${esc(entry.name)}</h1>
    <p class="lede">${esc(entry.blurb)}</p>
    ${entry.description ? `<p class="page__desc">${esc(entry.description)}</p>` : ''}
    <div class="taglist">${entry.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
  </header>

  <section class="block">
    <h2>Install</h2>
    <p class="muted">Link one stylesheet, then copy this component's two source files (below) into your project. Artwork streams from this domain, so there is nothing to download to see it working.</p>
    ${codeBlock(
      `<!-- index.html — every token, both themes, all component styles, art included -->\n<link rel="stylesheet" href="${SITE.origin}/dist/fantasyuis.css" />`,
      'html',
      '1. Stylesheet',
    )}
    ${codeBlock(
      `// main.ts — after copying ${entry.id}.ts and core/ into src/ui/\nimport { ${entry.name} } from './ui/${entry.id}';\n\n// Shipping for real? Copy public/fui/ into your project and repoint the art:\n// import { setAssetBase } from './ui/core/assets';\n// setAssetBase('/fui');`,
      'ts',
      '2. Usage',
    )}
    <p class="muted">Prefer to script it? <code>curl ${SITE.origin}/r/${entry.id}.json</code> returns this component's full TypeScript and CSS source as JSON.</p>
  </section>

  <section class="block">
    <h2>Examples</h2>
    ${demoBlocks.join('\n')}
  </section>

  <section class="block">
    <h2>Options</h2>
    ${propRows}
  </section>

  <section class="block">
    <h2>Source</h2>
    <p class="muted">${
      deps.length
        ? `This component composes ${deps
            .map((d) => `<a href="/components/${esc(d)}.html"><code>${esc(d)}</code></a>`)
            .join(', ')}, so copy those too. Everything below has no other dependency.`
        : 'Both files are dependency-free. Drop them into <code>src/ui/</code> and they work as-is.'
    }</p>
    ${codeBlock(copyList.join('\n'), 'text', 'Files to copy')}
    <details class="src"><summary><code>${esc(entry.id)}.ts</code></summary>${codeBlock(tsSrc, 'ts', `${entry.id}.ts`)}</details>
    <details class="src"><summary><code>${esc(entry.id)}.css</code></summary>${codeBlock(cssSrc, 'css', `${entry.id}.css`)}</details>
  </section>

  ${related ? `<section class="block"><h2>Pairs with</h2><div class="chips">${related}</div></section>` : ''}
</article>`;

    await writeFile(
      path.join(OUT_COMPONENTS, `${entry.id}.html`),
      layout({
        title: `${entry.name} — ${SITE.name}`,
        description: entry.blurb,
        canonical: `${SITE.origin}/components/${entry.id}.html`,
        body,
      }),
      'utf8',
    );

    const record = {
      id: entry.id,
      name: entry.name,
      group: entry.group,
      groupLabel: GROUP_LABELS[entry.group],
      blurb: entry.blurb,
      description: entry.description ?? '',
      tags: entry.tags,
      related: entry.related ?? [],
      url: `${SITE.origin}/components/${entry.id}.html`,
      files: {
        ts: `src/lib/components/${entry.id}.ts`,
        css: `src/lib/components/${entry.id}.css`,
      },
      // Other components this one composes. Copy these too, or it will not
      // compile — resolved transitively from the actual imports.
      dependencies: deps,
      // The complete file list to copy into a game, in dependency order.
      copy: copyList,
      props,
      examples: entry.demos.map((d, i) => ({ title: d.title, note: d.note ?? '', code: snippets[i] })),
    };
    registry.push(record);

    await writeFile(
      path.join(OUT_PUBLIC, 'r', `${entry.id}.json`),
      JSON.stringify({ ...record, source: { ts: tsSrc, css: cssSrc } }, null, 2),
      'utf8',
    );
  }

  await vite.close();
  drainTimers();

  // ── Gallery index ────────────────────────────────────────────────────────
  const groups = GROUP_ORDER.map((g) => ({
    id: g,
    label: GROUP_LABELS[g],
    items: CATALOG.filter((c) => c.group === g),
  })).filter((g) => g.items.length);

  const indexBody = `<section class="hero">
  <div class="hero__inner">
    <p class="hero__eyebrow">${esc(CATALOG.length)} components · ${esc(ASSETS.length)} art assets · ${esc(THEME_PACKS.length)} themes · ${esc(ART_PACKS.length)} art collections</p>
    <h1>Fantasy<em>UIs</em></h1>
    <p class="hero__lede">${esc(SITE.tagline)}. Vanilla TypeScript and CSS, zero dependencies — drops into any Vite project, React or not, or straight over a Phaser canvas.</p>
    <div class="hero__actions">
      <a class="btn btn--primary" href="/start.html">Get started</a>
      <a class="btn" href="/assets.html">Browse the art</a>
      <a class="btn" href="/llms.txt">llms.txt</a>
      <a class="btn" href="/llms-full.txt">llms-full.txt</a>
    </div>
  </div>
</section>

<div class="searchbar">
  <input id="search" type="search" placeholder="Search components — try “inventory”, “health bar”, “dialogue”…" autocomplete="off" />
  <p class="searchbar__count" id="searchcount"></p>
</div>

${groups
  .map(
    (g) => `<section class="group" data-group="${esc(g.id)}">
  <h2 class="group__title">${esc(g.label)}</h2>
  <div class="grid">
${g.items
  .map(
    (c) => `    <a class="card" href="/components/${c.id}.html" data-name="${esc(c.name.toLowerCase())}" data-tags="${esc([c.id, ...c.tags, c.blurb].join(' ').toLowerCase())}">
      <h3>${esc(c.name)}</h3>
      <p>${esc(c.blurb)}</p>
      <div class="card__tags">${c.tags.slice(0, 4).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
    </a>`,
  )
  .join('\n')}
  </div>
</section>`,
  )
  .join('\n')}`;

  await writeFile(
    path.join(ROOT, 'index.html'),
    layout({
      title: `${SITE.name} — ${SITE.tagline}`,
      description: `${CATALOG.length} ready-to-use fantasy and RPG game UI components for Vite + TypeScript, built from ${ASSETS.length} hand-painted art assets. Panels, inventories, health bars, dialogue boxes, skill trees, HUDs and full screens.`,
      canonical: SITE.origin + '/',
      active: 'index',
      body: indexBody,
    }),
    'utf8',
  );

  // ── Asset browser ────────────────────────────────────────────────────────
  const byPack = PACKS.map((p) => ({
    pack: p,
    assets: ASSETS.filter((a) => a.pack === p.id),
  }));

  const assetsBody = `<article class="page">
  <header class="page__head">
    <h1>Asset browser</h1>
    <p class="lede">Every piece of source art, web-optimised and served from this domain. Reference an asset in CSS with <code>var(--fui-img-&lt;id&gt;)</code>, or download the PNG and self-host it.</p>
  </header>

  <div class="searchbar">
    <input id="assetsearch" type="search" placeholder="Search assets — “frame”, “potion”, “bar”…" autocomplete="off" />
    <p class="searchbar__count" id="assetcount"></p>
  </div>

${byPack
  .map(
    ({ pack, assets }) => `<section class="group">
  <h2 class="group__title">${esc(pack.name)} <span class="muted">— ${esc(assets.length)} assets</span><span class="pack-kind">${esc(pack.kind === 'theme' ? 'theme' : pack.kind === 'frames' ? 'frame collection' : 'icon collection')}</span></h2>
  <p class="muted group__blurb">${esc(pack.blurb)}</p>
  <div class="assetgrid${assets.length > 60 ? ' assetgrid--dense' : ''}">
${assets
  .map(
    (a) => `    <figure class="asset" data-search="${esc([a.id, a.name, a.category, ...a.tags].join(' ').toLowerCase())}">
      <div class="asset__art"><img src="/fui/${esc(a.thumb)}" alt="${esc(a.name)}" width="${a.width}" height="${a.height}" loading="lazy" /></div>
      <figcaption>
        <strong>${esc(a.name)}</strong>
        <code>${esc(a.id)}</code>
        <span class="asset__meta">${a.width}×${a.height} · ${(a.bytes / 1024).toFixed(0)} KB${a.slice ? ` · 9-slice ${a.slice.join(' ')}` : ''}</span>
        <a class="asset__dl" href="/fui/${esc(a.file)}" download>Download PNG</a>
      </figcaption>
    </figure>`,
  )
  .join('\n')}
  </div>
</section>`,
  )
  .join('\n')}
</article>`;

  await writeFile(
    path.join(ROOT, 'assets.html'),
    layout({
      title: `Asset browser — ${SITE.name}`,
      description: `All ${ASSETS.length} fantasy RPG UI art assets in the FantasyUIs library: panels, frames, buttons, slots, bars, banners, icons and silhouettes, with 9-slice data and direct PNG downloads.`,
      canonical: `${SITE.origin}/assets.html`,
      active: 'assets',
      body: assetsBody,
    }),
    'utf8',
  );

  // ── Getting started ──────────────────────────────────────────────────────
  const startBody = `<article class="page prose">
  <header class="page__head">
    <h1>Get started</h1>
    <p class="lede">FantasyUIs is plain TypeScript and CSS. There is no framework, no build plugin and no runtime dependency — every component is a class that hands you a DOM element.</p>
  </header>

  <section class="block">
    <h2>1. Add the stylesheet</h2>
    <p>One import wires up the design tokens, both themes and every component's styles. Art resolves against the hosted CDN, so nothing needs copying to see pixels on screen.</p>
    ${codeBlock(`<!-- index.html -->\n<link rel="stylesheet" href="${SITE.origin}/dist/fantasyuis.css" />`, 'html', 'Hosted art')}
    <p>Or, if you copied <code>public/fui/</code> into your own project, point the variables at it instead and drop the CDN entirely:</p>
    ${codeBlock(`import { setAssetBase } from './ui/core/assets';\n\nsetAssetBase('/fui');`, 'ts', 'Self-hosted art')}
  </section>

  <section class="block">
    <h2>2. Build some UI</h2>
    ${codeBlock(
      `import { Panel, Button, StatBar, InventoryGrid } from './ui';\n\nconst panel = new Panel({\n  title: 'Inventory',\n  width: 460,\n  closable: true,\n  mount: document.body,\n});\n\nconst bag = new InventoryGrid({ cols: 6, size: 24 });\nbag.add({ icon: 'icon-potion', name: 'Healing Draught', qty: 5, rarity: 'uncommon' });\npanel.add(bag.el);\n\nconst hp = new StatBar({ kind: 'health', value: 72, max: 100, label: 'Health' });\nhp.set(48); // animates, and leaves a damage trail\n\npanel.on('panel:close', () => panel.destroy());`,
      'ts',
      'main.ts',
    )}
  </section>

  <section class="block">
    <h2>3. Switch themes</h2>
    <p>Both art packs implement the same semantic slots, so one attribute re-skins an entire subtree. No component code changes.</p>
    ${codeBlock(`<div data-fui-theme="dark-ember">\n  <!-- everything in here uses the Dark Ember art -->\n</div>`, 'html', 'Theming')}
    <p>Scale the whole UI with a single custom property:</p>
    ${codeBlock(`:root {\n  --fui-ui-scale: 0.5;  /* raise for chunkier framing, lower for a denser HUD */\n}`, 'css', 'Scaling')}
  </section>

  <section class="block">
    <h2>Using this library with an AI coding agent</h2>
    <p>The site is built to be read by machines as well as people. Every page is static HTML with the demo markup already rendered, so nothing needs JavaScript to be understood.</p>
    <ul>
      <li><a href="/llms.txt"><code>/llms.txt</code></a> — the whole library written for an LLM: how to work with it, then every component, its purpose and its options.</li>
      <li><a href="/llms-full.txt"><code>/llms-full.txt</code></a> — the same index with every component's complete working example inlined, so an agent can adapt one without a second request.</li>
      <li><a href="/registry.json"><code>/registry.json</code></a> — machine-readable index of every component and asset.</li>
      <li><code>/r/&lt;Component&gt;.json</code> — one component's full record including its complete TypeScript and CSS source. <a href="/r/Panel.json">Example: /r/Panel.json</a></li>
    </ul>
    <p>Most components are self-contained, but not all: <code>ChampionCard</code> composes <code>StarRating</code> and <code>AffinityBadge</code>. Every record carries a <code>dependencies</code> list and a <code>copy</code> list — the complete, ordered set of files that component needs — so copying is a mechanical step rather than a guess. Imports between components are plain relative paths, so a flat <code>src/ui/</code> folder compiles with no rewriting.</p>
    <p>Point your agent at the site root and it can discover, read and copy any component without a single manual step:</p>
    ${codeBlock(`Use the UI library at ${SITE.origin}.\nRead ${SITE.origin}/llms.txt first \u2014 it explains the method:\nstart from a component's shipped example and change the data, not the structure.\nFetch ${SITE.origin}/r/<Component>.json for one component's example and source,\nor ${SITE.origin}/llms-full.txt for every example in one document.\nWhen vendoring, copy every path in a record's "copy" field \u2014 components compose\neach other, so dependencies have to come along too.`, 'text', 'Prompt')}
  </section>

  <section class="block">
    <h2>Framework notes</h2>
    <p>Components are DOM-native, so they slot into anything:</p>
    ${codeBlock(
      `// React\nfunction Health({ value }: { value: number }) {\n  const host = useRef<HTMLDivElement>(null);\n  const bar = useRef<StatBar>();\n  useEffect(() => {\n    bar.current = new StatBar({ kind: 'health', value, mount: host.current! });\n    return () => bar.current?.destroy();\n  }, []);\n  useEffect(() => bar.current?.set(value), [value]);\n  return <div ref={host} />;\n}\n\n// Svelte\n// <div use:action={(node) => new StatBar({ kind: 'health', mount: node })} />\n\n// Phaser / PixiJS — mount the HUD as a DOM layer over the canvas\nconst hud = new HUD({ mount: document.body });\nhud.add('bottom-center', actionBar.el);`,
      'tsx',
      'Adapters',
    )}
  </section>
</article>`;

  await writeFile(
    path.join(ROOT, 'start.html'),
    layout({
      title: `Get started — ${SITE.name}`,
      description:
        'Install FantasyUIs in a Vite + TypeScript project: add the stylesheet, build UI with plain classes, switch themes with one attribute, and let AI agents read the machine-readable registry.',
      canonical: `${SITE.origin}/start.html`,
      active: 'start',
      body: startBody,
    }),
    'utf8',
  );

  // ── Single-file stylesheet bundle ────────────────────────────────────────
  // One <link> gives a game every token, both themes, every component's CSS and
  // the hosted artwork. It is the shortest possible path from zero to pixels.
  const stylesDir = path.join(ROOT, 'src', 'lib', 'styles');
  const cssParts = [
    await readFile(path.join(OUT_PUBLIC, 'dist', 'fantasyuis.assets.css'), 'utf8'),
    await readFile(path.join(stylesDir, 'base.css'), 'utf8'),
    await readFile(path.join(stylesDir, 'theme-stone-vine.css'), 'utf8'),
    await readFile(path.join(stylesDir, 'theme-dark-ember.css'), 'utf8'),
  ];
  for (const name of lib.styles) {
    cssParts.push(await readFile(path.join(ROOT, 'src', 'lib', 'components', `${name}.css`), 'utf8'));
  }
  await writeFile(
    path.join(OUT_PUBLIC, 'dist', 'fantasyuis.css'),
    `/* FantasyUIs ${'\u2014'} complete stylesheet.\n   Artwork resolves to ${SITE.origin}/fui/.\n   Generated by scripts/generate.mjs ${'\u2014'} do not edit. */\n\n` +
      cssParts.join('\n\n'),
    'utf8',
  );

  // ── Machine-readable endpoints ───────────────────────────────────────────
  const registryDoc = {
    name: SITE.name,
    tagline: SITE.tagline,
    origin: SITE.origin,
    generated: null,
    stack: 'Vanilla TypeScript + CSS, zero runtime dependencies. Works in any Vite project.',
    assetBase: `${SITE.origin}/fui`,
    stylesheet: `${SITE.origin}/dist/fantasyuis.css`,
    assetVariablesOnly: `${SITE.origin}/dist/fantasyuis.assets.css`,
    themes: PACKS.filter((p) => p.kind === 'theme').map((p) => ({
      id: p.id,
      name: p.name,
      blurb: p.blurb,
      assets: p.count,
    })),
    artPacks: PACKS.filter((p) => p.kind !== 'theme').map((p) => ({
      kind: p.kind,
      id: p.id,
      name: p.name,
      blurb: p.blurb,
      assets: p.count,
    })),
    counts: {
      components: CATALOG.length,
      assets: ASSETS.length,
      themes: THEME_PACKS.length,
      artPacks: ART_PACKS.length,
    },
    endpoints: {
      llms: `${SITE.origin}/llms.txt`,
      llmsFull: `${SITE.origin}/llms-full.txt`,
      registry: `${SITE.origin}/registry.json`,
      component: `${SITE.origin}/r/{ComponentId}.json`,
      assetFile: `${SITE.origin}/fui/{pack}/{assetId}.png`,
    },
    components: registry,
    assets: ASSETS.map((a) => ({
      ...a,
      url: `${SITE.origin}/fui/${a.file}`,
      cssVar: `--fui-img-${a.id}`,
    })),
  };
  await writeFile(
    path.join(OUT_PUBLIC, 'registry.json'),
    JSON.stringify(registryDoc, null, 2),
    'utf8',
  );

  // ── llms.txt ─────────────────────────────────────────────────────────────
  // Written for an agent that has been handed nothing but this URL. The order is
  // deliberate: what this is, the fastest path to working UI, then the two ways
  // to build with it (adapt an example; compose from raw art), then the index.
  const exampleFor = (id) => {
    const rec = registry.find((r) => r.id === id);
    return rec?.examples?.[0]?.code ?? '';
  };
  const indent = (text, pad = '    ') =>
    text
      .split('\n')
      .map((line) => (line.trim() ? pad + line : line))
      .join('\n');

  const llms = `# ${SITE.name}

> ${SITE.tagline}. ${CATALOG.length} components built from ${ASSETS.length} art assets, in ${THEME_PACKS.length} swappable themes plus ${ART_PACKS.length} art collections (icons, glyphs and tintable ornament frames). Vanilla TypeScript + CSS, zero runtime dependencies, framework-agnostic.

You are almost certainly here because someone asked you to build a fantasy or RPG
game UI. Read this file, then go straight to **Working method** below. Do not
design a component library from scratch — one already exists, every piece of it
ships with a working example, and adapting an example is both faster and better
than starting from an empty file.

## The 60-second version

One stylesheet, then plain classes that build DOM:

    <link rel="stylesheet" href="${SITE.origin}/dist/fantasyuis.css" />

    import { Panel, StatBar } from 'fantasyuis';

    const panel = new Panel({ title: 'Inventory', width: 460, mount: document.body });
    panel.add(new StatBar({ kind: 'health', value: 72, max: 100, label: 'Health' }).el);

- Every component is a class. Construct it, read \`.el\`, put \`.el\` where you want it.
- Every component emits events: \`thing.on('ns:verb', (detail) => ...)\`.
- Every component takes \`{ mount }\`, \`{ class }\`, \`{ style }\` and \`{ theme }\`.
- Call \`.destroy()\` when you tear a screen down; timers and observers stop with it.
- Artwork resolves through CSS variables (\`var(--fui-img-<assetId>)\`) off the hosted
  CDN, so a copied snippet renders immediately with no asset setup at all.
- Two themes, swapped with one attribute: \`<div data-fui-theme="dark-ember">\`.
- The whole UI scales from one variable: \`--fui-ui-scale\` (default 0.5).

## Working method

### 1. Start from an example, not from scratch

Every one of the ${CATALOG.length} components in the index below has at least one
complete, runnable example, and those examples are the intended starting point.
They are not illustrative fragments — the site extracts them from the code it
actually ran, so what you read is what renders.

Fetch one and adapt it:

    GET ${SITE.origin}/r/<ComponentId>.json

That record contains:

- \`examples[]\` — \`{ title, note, code }\`. **This is what you copy.** The code is
  idiomatic usage with realistic data already filled in.
- \`props[]\` — every option, its type, and what it does.
- \`source.ts\` / \`source.css\` — the component's full source, if you want to fork it.
- \`copy[]\` — the exact, ordered file list to vendor it into a project.
- \`dependencies[]\` — the other components it composes.

**Adapting an example means changing the data, not the structure.** Swap the
names, numbers, art ids and event handlers for the ones your game actually has;
keep the shape. The examples encode decisions that are easy to get wrong —
which state gets which colour, what is disabled when, what the empty case looks
like — and those decisions survive a rename.

A worked adaptation. This is the shipped \`ShieldBar\` example, verbatim:

${indent(exampleFor('ShieldBar'))}

In a game that already has a unit object it becomes:

    import { ShieldBar } from 'fantasyuis';

    const bar = new ShieldBar({
      value: boss.hp, max: boss.maxHp, shield: boss.barrier,
      kind: 'health', label: boss.name, height: 22,
      mount: '#boss-hud',
    });
    boss.on('damage', () => bar.set(boss.hp, boss.barrier));
    bar.on('shield:break', () => sfx.play('barrier-shatter'));

Same structure, your data, wired to your events. Note two mechanical
differences, which apply to every example in this library:

- Examples end with \`return x.el;\` because they are demo builders. In real code,
  drop that line and pass \`{ mount: '#selector' }\` or append \`x.el\` yourself.
- Some examples wrap several components in a \`row(...)\` / \`col(...)\` /
  \`scene(...)\` helper. Those are one-line flex wrappers belonging to the docs,
  not to the library — use your own layout instead.

### 2. Compose screens out of several components

Nothing here expects to be alone. A battle HUD is a \`HUD\` with \`PartyFrame\`,
\`BossHealthBar\`, \`ActionBar\`, \`BuffBar\` and \`FloatingText\` inside it; a shop is a
\`Panel\` full of \`ItemCard\`s over a \`CurrencyBar\`. Each component's record lists
\`related\` ids — the ones it is normally seen with. Follow those to assemble a
screen instead of inventing a layout.

### 3. You can also build entirely new components from the raw art

The ${CATALOG.length} components are a starting set, not a ceiling. All
${ASSETS.length} assets are addressable on their own, and the same three-layer
indirection the library uses is available to anything you write:

    /* every asset publishes these, generated, for you to use directly */
    --fui-img-<id>      /* url() of the artwork                       */
    --fui-slice-<id>    /* unitless 9-slice numbers, for border-image  */
    --fui-bw-<id>       /* matching border-widths, already scaled      */

So a component this library does not have — a siege-map overlay, a card
crafting bench, a fishing minigame gauge — is a normal thing to build:

    .my-forge__frame {
      border-image: var(--fui-img-panel-stone) var(--fui-slice-panel-stone) fill stretch;
      border-width: var(--fui-bw-panel-stone);
    }

Better still, bind to the *semantic* slots instead of a specific asset, and your
new component inherits both themes for free and any future one automatically:

    .my-forge__frame {
      border-image: var(--fui-panel-frame-src) var(--fui-panel-frame-sl) fill stretch;
      border-width: var(--fui-panel-frame-bw);
    }

Read any component's \`source.css\` to see the full list of slots in use. If you
write something new, extend \`FuiComponent\`, expose \`.el\`, emit \`ns:verb\` events
and register teardown with \`this.onDestroy(fn)\` — then it drops into the same
screens as everything else.

### 4. Recolouring is a mask, not a new file

Two of the art collections are monochrome on purpose so one file serves every
colour and state:

- **Line glyphs** — SVG with the fill rewritten to \`currentColor\`. The \`Glyph\`
  component masks them, so \`glyph-crossed-swords\` is grey in a disabled row and
  gold on a legendary card without a second asset.
- **Ornate frames** — white silhouettes 9-sliced as a \`mask-border\`. \`TintFrame\`
  paints any colour or gradient underneath, so 32 shapes × 4 centre treatments
  (\`hollow\`, \`scrim\`, \`solid\`, \`soft\`) cover every rarity and faction colour from
  one small set of PNGs. Ids run \`deco-frame-01\` … \`deco-frame-32\` with
  \`-scrim\` / \`-solid\` / \`-soft\` suffixes, plus \`deco-divider-01\` … \`-06\`.

Painted icons are full-colour art and will mask to a solid block — use them as
backgrounds, not masks.

## Endpoints

- \`${SITE.origin}/llms.txt\` — this file: the guide and the full index.
- \`${SITE.origin}/llms-full.txt\` — the same index **with every component's
  complete example inlined**. Large. Fetch it when you want to work offline from
  one document instead of making ${CATALOG.length} requests.
- \`${SITE.origin}/r/<ComponentId>.json\` — one component: examples, props, full source.
- \`${SITE.origin}/registry.json\` — everything, machine-readable, in one document.
- \`${SITE.origin}/components/<ComponentId>.html\` — the human page, pre-rendered
  (readable without running JavaScript).
- \`${SITE.origin}/dist/fantasyuis.css\` — the complete stylesheet.
- \`${SITE.origin}/fui/<pack>/<assetId>.png\` — the raw art.

## Vendoring components into a project

If the game should not depend on a CDN, copy the files. Each record's \`copy\`
field is the complete, ordered list — take all of it. Most components are
self-contained, but some are not: \`ChampionCard\` imports \`StarRating\` and
\`AffinityBadge\`, so copying only \`ChampionCard.ts\` gives you a file that will not
compile. Every component also needs \`src/lib/core/component.ts\` and
\`src/lib/core/dom.ts\`, which are already in the list.

Components import each other with explicit \`./Name.ts\` paths, so a flat folder
works with no rewriting:

    src/ui/
      core/component.ts  core/dom.ts
      StarRating.ts      StarRating.css
      AffinityBadge.ts   AffinityBadge.css
      ChampionCard.ts    ChampionCard.css

Then point the art at your own copy once:

    import { setAssetBase } from './ui/core/assets.ts';
    setAssetBase('/fui');

## Themes

${PACKS.filter((p) => p.kind === 'theme')
  .map((p) => `- **${p.name}** (\`${p.id}\`) — ${p.blurb} ${p.count} assets.`)
  .join('\n')}

Both implement the same semantic slots, so every component works in both and a
third theme costs zero component changes.

## Art collections

Art libraries rather than themes — reference any asset by id from any theme, in
any component that takes an \`art\` or \`glyph\` option.

${ART_PACKS.map((p) => `- **${p.name}** (\`${p.id}\`, ${p.kind}) — ${p.blurb} ${p.count} assets.`).join('\n')}

## Components

${GROUP_ORDER.filter((g) => CATALOG.some((c) => c.group === g))
  .map(
    (g) => `### ${GROUP_LABELS[g]}\n\n${CATALOG.filter((c) => c.group === g)
      .map((c) => {
        const rec = registry.find((r) => r.id === c.id);
        const keyProps = rec.props
          .slice(0, 8)
          .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
          .join('; ');
        const needs = rec.dependencies.length
          ? `\n  - also copy: ${rec.dependencies.join(', ')}`
          : '';
        const pairs = rec.related.length ? `\n  - pairs with: ${rec.related.join(', ')}` : '';
        return `- **${c.name}** — ${c.blurb}\n  - keywords: ${c.tags.join(', ')}\n  - options: ${keyProps || 'none beyond base options'}${needs}${pairs}\n  - example + source: ${SITE.origin}/r/${c.id}.json`;
      })
      .join('\n')}`,
  )
  .join('\n\n')}

## Assets

${PACKS.map(
  (p) =>
    `### ${p.name}\n\n${ASSETS.filter((a) => a.pack === p.id)
      .map(
        (a) =>
          `- \`${a.id}\` — ${a.name} (${a.category}, ${a.width}×${a.height}${a.slice ? `, 9-slice ${a.slice.join(' ')}` : ''}). CSS: \`var(--fui-img-${a.id})\`. Tags: ${a.tags.join(', ')}.`,
      )
      .join('\n')}`,
).join('\n\n')}
`;

  // ── llms-full.txt ────────────────────────────────────────────────────────
  // The llmstxt.org convention: the same index with the bodies inlined. Here the
  // body that matters is the example, because adapting an example is the whole
  // recommended workflow — an agent that fetches this file never has to make a
  // second request to start writing code.
  const llmsFull = `# ${SITE.name} — every component, with its example

> ${SITE.tagline}. ${CATALOG.length} components, ${ASSETS.length} assets, ${THEME_PACKS.length} themes.
> This is the long form of ${SITE.origin}/llms.txt: the same index, with each
> component's complete working example inlined so you can adapt it without a
> second request. Read ${SITE.origin}/llms.txt first for the method, the setup
> and the asset variables; this file is the reference body.

**How to use this file.** Find the component that matches what you are building,
copy its example, and change the data — the names, numbers, art ids and event
handlers — for the ones your game actually has. Keep the structure. If nothing
here matches, build a new component from the raw assets; llms.txt explains how.

Every example below assumes:

    <link rel="stylesheet" href="${SITE.origin}/dist/fantasyuis.css" />

${GROUP_ORDER.filter((g) => CATALOG.some((c) => c.group === g))
  .map(
    (g) => `## ${GROUP_LABELS[g]}\n\n${CATALOG.filter((c) => c.group === g)
      .map((c) => {
        const rec = registry.find((r) => r.id === c.id);
        const props = rec.props.length
          ? rec.props
              .map((p) => `- \`${p.name}${p.optional ? '?' : ''}: ${p.type}\` — ${p.doc || '—'}`)
              .join('\n')
          : '- none beyond the base options.';
        const needs = rec.dependencies.length
          ? `\n\nAlso copy: ${rec.dependencies.map((d) => `\`${d}\``).join(', ')}.`
          : '';
        const pairs = rec.related.length
          ? `\n\nPairs with: ${rec.related.map((d) => `\`${d}\``).join(', ')}.`
          : '';
        const examples = rec.examples
          .map(
            (ex) =>
              `**${ex.title}**${ex.note ? ` — ${ex.note}` : ''}\n\n${indent(ex.code)}`,
          )
          .join('\n\n');
        return `### ${c.name}

${c.blurb}

${c.description || ''}

Keywords: ${c.tags.join(', ')}.${needs}${pairs}

Options:

${props}

${examples}

Full source: ${SITE.origin}/r/${c.id}.json`;
      })
      .join('\n\n---\n\n')}`,
  )
  .join('\n\n')}
`;
  await writeFile(path.join(OUT_PUBLIC, 'llms-full.txt'), llmsFull, 'utf8');
  await writeFile(path.join(OUT_PUBLIC, 'llms.txt'), llms, 'utf8');

  await writeFile(
    path.join(OUT_PUBLIC, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE.origin}/sitemap.xml\n`,
    'utf8',
  );

  const urls = [
    `${SITE.origin}/`,
    `${SITE.origin}/start.html`,
    `${SITE.origin}/assets.html`,
    `${SITE.origin}/llms.txt`,
    `${SITE.origin}/llms-full.txt`,
    ...CATALOG.map((c) => `${SITE.origin}/components/${c.id}.html`),
  ];
  await writeFile(
    path.join(OUT_PUBLIC, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join('\n')}\n</urlset>\n`,
    'utf8',
  );

  console.log(
    `✓ generated ${CATALOG.length} component pages, ${lib.components.length} exports, ${ASSETS.length} assets indexed`,
  );
  console.log(
    '  index.html, start.html, assets.html, registry.json, llms.txt, llms-full.txt, sitemap.xml',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
