import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp, commas } from '../core/dom.ts';

export interface PaginationOptions extends BaseOptions {
  /** How many pages there are. */
  pages: number;
  /** Which page is showing, 1-based. */
  page?: number;
  /** How many page numbers to show either side of the current one. */
  siblings?: number;
  /** Draw first / last jump buttons as well as prev / next. */
  edges?: boolean;
  /** Numbers only, no arrows — for a tight sidebar. */
  compact?: boolean;
  /** Rows in the whole set. With `perPage` it prints "showing 21–40 of 312". */
  total?: number;
  /** Rows on one page, used for the summary line. */
  perPage?: number;
  /** Word for what is being paged, e.g. "champions". */
  noun?: string;
}

/** Page numbers with `null` standing in for a gap. */
function windowOf(page: number, pages: number, siblings: number): Array<number | null> {
  // Always show the first and last page: they are the two a player actually
  // aims for, and losing them to an ellipsis is the classic pagination bug.
  const out: Array<number | null> = [];
  const from = Math.max(2, page - siblings);
  const to = Math.min(pages - 1, page + siblings);
  out.push(1);
  if (from > 2) out.push(null);
  for (let i = from; i <= to; i++) out.push(i);
  if (to < pages - 1) out.push(null);
  if (pages > 1) out.push(pages);
  return out;
}

/**
 * Page controls for anything longer than one screen — a champion roster, a mail
 * inbox, an auction listing.
 *
 *   const pager = new Pagination({ pages: 12, page: 1, total: 312, perPage: 28, noun: 'champions' });
 *   pager.on<number>('page:change', (p) => list.load(p));
 *
 * The first and last page are always drawn, whatever the window does, because
 * "jump to the end" is the second most common thing anyone asks of a pager.
 * `setPages()` re-clamps the current page, so shrinking the set while sitting on
 * the last page moves you to the new last page rather than nowhere.
 */
export class Pagination extends FuiComponent<PaginationOptions> {
  private page: number;
  private numbers: HTMLElement;
  private summary: HTMLElement | null = null;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private firstBtn: HTMLButtonElement | null = null;
  private lastBtn: HTMLButtonElement | null = null;

  constructor(opts: PaginationOptions) {
    const root = h('div', {
      class: 'fui fui-pager',
      dataset: { compact: String(!!opts.compact) },
      attrs: { role: 'navigation', 'aria-label': 'Pagination' },
    });
    super(root, opts);
    this.page = clamp(opts.page ?? 1, 1, Math.max(1, opts.pages));

    const row = h('div', { class: 'fui-pager__row' });

    const step = (cls: string, label: string, to: () => number) => {
      const btn = h('button', {
        class: `fui-pager__step ${cls}`,
        attrs: { type: 'button', 'aria-label': label, title: label },
      });
      btn.addEventListener('click', () => this.go(to()));
      return btn;
    };

    if (opts.edges && !opts.compact) {
      this.firstBtn = step('fui-pager__step--first', 'First page', () => 1);
      row.appendChild(this.firstBtn);
    }
    this.prevBtn = step('fui-pager__step--prev', 'Previous page', () => this.page - 1);
    if (!opts.compact) row.appendChild(this.prevBtn);

    this.numbers = h('div', { class: 'fui-pager__numbers' });
    row.appendChild(this.numbers);

    this.nextBtn = step('fui-pager__step--next', 'Next page', () => this.page + 1);
    if (!opts.compact) row.appendChild(this.nextBtn);
    if (opts.edges && !opts.compact) {
      this.lastBtn = step('fui-pager__step--last', 'Last page', () => this.opts.pages);
      row.appendChild(this.lastBtn);
    }
    root.appendChild(row);

    if (opts.total != null && opts.perPage) {
      this.summary = h('p', { class: 'fui-pager__summary fui-num' });
      root.appendChild(this.summary);
    }
    this.paint();
  }

  /** The page currently showing. */
  get(): number {
    return this.page;
  }

  /** Move to a page. Out-of-range values are clamped, never ignored. */
  go(page: number, opts?: { silent?: boolean }): this {
    const next = clamp(Math.round(page), 1, Math.max(1, this.opts.pages));
    if (next === this.page) return this;
    this.page = next;
    this.paint();
    if (!opts?.silent) this.emit('page:change', next);
    return this;
  }

  next(): this {
    return this.go(this.page + 1);
  }

  prev(): this {
    return this.go(this.page - 1);
  }

  /** Resize the set. The current page is re-clamped into the new range. */
  setPages(pages: number, total?: number): this {
    this.opts.pages = Math.max(1, Math.round(pages));
    if (total != null) this.opts.total = total;
    const clamped = clamp(this.page, 1, this.opts.pages);
    const moved = clamped !== this.page;
    this.page = clamped;
    this.paint();
    if (moved) this.emit('page:change', this.page);
    return this;
  }

  private paint(): void {
    const { pages } = this.opts;
    clear(this.numbers);
    for (const n of windowOf(this.page, pages, this.opts.siblings ?? 1)) {
      if (n == null) {
        this.numbers.appendChild(h('span', { class: 'fui-pager__gap', text: '…' }));
        continue;
      }
      const btn = h('button', {
        class: 'fui-pager__num fui-num',
        text: String(n),
        attrs: {
          type: 'button',
          'aria-current': n === this.page ? 'page' : undefined,
        },
      });
      if (n === this.page) btn.classList.add('is-on');
      btn.addEventListener('click', () => this.go(n));
      this.numbers.appendChild(btn);
    }

    this.prevBtn.disabled = this.page <= 1;
    this.nextBtn.disabled = this.page >= pages;
    if (this.firstBtn) this.firstBtn.disabled = this.page <= 1;
    if (this.lastBtn) this.lastBtn.disabled = this.page >= pages;

    if (this.summary && this.opts.total != null && this.opts.perPage) {
      const from = (this.page - 1) * this.opts.perPage + 1;
      const to = Math.min(this.opts.total, this.page * this.opts.perPage);
      const noun = this.opts.noun ? ` ${this.opts.noun}` : '';
      this.summary.textContent =
        this.opts.total === 0
          ? `No${noun}`
          : `${commas(from)}–${commas(to)} of ${commas(this.opts.total)}${noun}`;
    }
  }
}
