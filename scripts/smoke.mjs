/**
 * FantasyUIs — browser smoke test
 * ---------------------------------------------------------------------------
 * Loads every generated page in a real browser and reports anything that broke.
 * `npm run audit` checks the source; this checks what the browser actually did
 * with it — a demo that throws on hydration, a component that renders nothing,
 * a stylesheet that 404s.
 *
 *   npm run dev      # in one shell
 *   npm run smoke    # in another (pass a port as the first argument)
 *
 * Pages are loaded to `load`, not `domcontentloaded`: navigating away early
 * aborts in-flight image requests, and an aborted request is indistinguishable
 * from a failed one in `requestfailed`. Waiting costs a few seconds and removes
 * an entire class of false positive.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = process.argv[2] ?? '5173';
const BASE = `http://localhost:${PORT}`;
const CONCURRENCY = 4;
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const reg = JSON.parse(await readFile(path.join(ROOT, 'public', 'registry.json'), 'utf8'));
const targets = [
  ...reg.components.map((c) => `/components/${c.id}.html`),
  '/',
  '/assets.html',
  '/start.html',
];

let browser;
try {
  browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox'] });
} catch {
  browser = await chromium.launch({ args: ['--no-sandbox'] });
}

const problems = [];
const external = new Set();
let done = 0;

/** Is this URL served by the site under test, rather than a third party? */
const isLocal = (url) => url.startsWith(BASE);

async function worker(queue) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let current = '';
  const ignore = (t) => t.includes('favicon');

  page.on('pageerror', (e) => {
    if (!ignore(e.message)) problems.push(`${current} — uncaught error: ${e.message}`);
  });
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() !== 'error' || ignore(t)) return;
    // A blocked third-party CDN says nothing about the library. The Google
    // Fonts link is optional by design — every family falls back to a serif
    // stack — so an offline or firewalled run should not fail on it.
    if (t.includes('Failed to load resource') && !t.includes(BASE)) return;
    problems.push(`${current} — console error: ${t.slice(0, 160)}`);
  });
  // Only a real HTTP failure counts. `requestfailed` also fires for aborts.
  page.on('response', (r) => {
    const url = r.url();
    if (r.status() < 400 || ignore(url)) return;
    if (isLocal(url)) problems.push(`${current} — HTTP ${r.status()}: ${url}`);
    else external.add(new URL(url).host);
  });
  page.on('requestfailed', (r) => {
    if (!isLocal(r.url())) external.add(new URL(r.url()).host);
  });

  for (;;) {
    const target = queue.shift();
    if (!target) break;
    current = target;
    try {
      await page.goto(BASE + target, { waitUntil: 'load', timeout: 45000 });
      if (target.startsWith('/components/')) {
        const rendered = await page.evaluate(
          () => document.querySelectorAll('.demo__stage .fui').length,
        );
        if (rendered === 0) problems.push(`${target} — no component rendered in any demo`);
      }
    } catch (err) {
      problems.push(`${target} — ${err.message.split('\n')[0]}`);
    }
    done++;
    if (done % 25 === 0) console.log(`  ... ${done}/${targets.length}`);
  }
  await page.close();
}

const queue = [...targets];
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
await browser.close();

const unique = [...new Set(problems)];
console.log(`\nsmoke-tested ${targets.length} pages`);
if (external.size) {
  console.log(
    `  (unreachable third-party hosts, not counted: ${[...external].join(', ')} —` +
      ' the web fonts are optional and fall back to serif stacks)',
  );
}
if (unique.length === 0) {
  console.log('✓ no errors');
} else {
  console.log(`\n✗ ${unique.length} problem(s):`);
  for (const p of unique) console.log(`  ${p}`);
  process.exitCode = 1;
}
