/**
 * Site runtime.
 *
 * Every demo is already in the page as static markup — this script replaces it
 * with a live instance so the examples are actually interactive. If JS never
 * runs, the pre-rendered markup is what a reader (or a crawler) sees, which is
 * the point.
 */
import '../lib/styles/index.css';
import './site.css';
import { CATALOG_BY_ID } from './catalog.ts';

const THEME_KEY = 'fui-theme';

// ── Theme ──────────────────────────────────────────────────────────────────
function applyTheme(theme: string): void {
  document.documentElement.dataset.fuiTheme = theme;
  document.documentElement.dataset.theme = theme;
  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-theme-set]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.themeSet === theme));
  }
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode — the choice just won't persist */
  }
}

function initTheme(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {
    /* ignore */
  }
  applyTheme(saved ?? 'stone-vine');
  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-theme-set]')) {
    btn.addEventListener('click', () => applyTheme(btn.dataset.themeSet!));
  }
}

// ── Live demos ─────────────────────────────────────────────────────────────
function hydrateDemos(): void {
  for (const stage of document.querySelectorAll<HTMLElement>('[data-demo]')) {
    const entry = CATALOG_BY_ID.get(stage.dataset.demo!);
    const demo = entry?.demos[Number(stage.dataset.demoIndex ?? 0)];
    if (!demo) continue;
    try {
      const node = demo.build();
      stage.replaceChildren(node);
      stage.dataset.live = 'true';
    } catch (err) {
      console.error(`[fui] demo ${stage.dataset.demo} failed to hydrate`, err);
    }
  }
}

// ── Copy buttons ───────────────────────────────────────────────────────────
function initCopy(): void {
  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    btn.addEventListener('click', async () => {
      const raw = btn.closest('.code')?.querySelector<HTMLTextAreaElement>('.code__raw');
      if (!raw) return;
      try {
        await navigator.clipboard.writeText(raw.value);
        const original = btn.textContent;
        btn.textContent = 'Copied';
        btn.classList.add('is-done');
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove('is-done');
        }, 1400);
      } catch {
        // Fall back to selecting the text so the reader can copy manually.
        raw.hidden = false;
        raw.select();
      }
    });
  }
}

// ── Search ─────────────────────────────────────────────────────────────────
function initSearch(
  inputId: string,
  countId: string,
  itemSelector: string,
  attr: string,
  noun: string,
): void {
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  const count = document.getElementById(countId);
  if (!input) return;

  const items = Array.from(document.querySelectorAll<HTMLElement>(itemSelector));
  const groups = Array.from(document.querySelectorAll<HTMLElement>('.group'));

  const run = () => {
    const q = input.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    let shown = 0;

    for (const item of items) {
      const hay = item.dataset[attr] ?? item.textContent?.toLowerCase() ?? '';
      const match = terms.every((t) => hay.includes(t));
      item.hidden = !match;
      if (match) shown++;
    }
    // Hide a whole section once every card in it is filtered out.
    for (const group of groups) {
      const any = Array.from(group.querySelectorAll<HTMLElement>(itemSelector)).some((i) => !i.hidden);
      group.hidden = !any;
    }
    if (count) {
      count.textContent = q
        ? `${shown} ${noun}${shown === 1 ? '' : 's'} match “${input.value.trim()}”`
        : `${items.length} ${noun}s`;
    }
  };

  input.addEventListener('input', run);
  run();
}

// ── Boot ───────────────────────────────────────────────────────────────────
initTheme();
hydrateDemos();
initCopy();
initSearch('search', 'searchcount', '.card', 'tags', 'component');
initSearch('assetsearch', 'assetcount', '.asset', 'search', 'asset');
