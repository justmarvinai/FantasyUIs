import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, commas } from '../core/dom.ts';

export interface LedgerEntry {
  id?: string;
  /** What happened — "Sold Runeblade", "Clan boss reward", "Summon ×10". */
  label: string;
  /** Positive is income, negative is spend. */
  amount: number;
  /** When, as text the game already formats — "2h ago", "Tue 14:20". */
  when?: string;
  /** Where it came from or went — "Auction house", "Summon". */
  source?: string;
  /** Glyph asset id for the row. */
  glyph?: string;
  /** Currency this row is in, when the ledger mixes several. */
  currency?: string;
}

export interface LedgerOptions extends BaseOptions {
  /** Newest first — the order a ledger is read. */
  entries: LedgerEntry[];
  /** Heading over the book. */
  title?: string;
  /** What the player holds now. The running balance counts back from this. */
  balance?: number;
  /** Currency name, e.g. "gold". */
  currency?: string;
  /** Glyph asset id for the currency. */
  glyph?: string;
  /** Show the running balance after each row. */
  running?: boolean;
  /** Show the income / spend / net summary. */
  summary?: boolean;
  /** Cap the height in pixels (or any CSS length) and scroll inside. */
  maxHeight?: number | string;
  /** Line shown when there are no entries. */
  emptyText?: string;
}

/**
 * The account book: what came in, what went out, and what is left. A currency
 * history, a clan bank log, a "where did my gems go" page.
 *
 *   new Ledger({
 *     title: 'Gold', currency: 'gold', glyph: 'icon-coins',
 *     balance: 482_000, running: true, summary: true, maxHeight: 260,
 *     entries: [
 *       { label: 'Sold Runeblade', amount: 240_000, when: '2h ago', source: 'Auction house' },
 *       { label: 'Summon ×10', amount: -300_000, when: '5h ago', source: 'Emberwake banner' },
 *     ],
 *   });
 *
 * The running balance is computed *backwards* from the current one, which is
 * the only way to get it right: a game knows what the player holds now, not
 * what they held before the first row in a paged history. Income and spend are
 * summed separately rather than netted, because "I earned 4M and spent 4.2M" is
 * a different story from "I lost 200k".
 */
export class Ledger extends FuiComponent<LedgerOptions> {
  private list: HTMLElement;
  private summaryEl: HTMLElement | null = null;

  constructor(opts: LedgerOptions) {
    const root = h('div', { class: 'fui fui-ledger' });
    super(root, opts);

    const head = h('div', { class: 'fui-ledger__head' });
    if (opts.title) {
      head.appendChild(h('span', { class: 'fui-ledger__title fui-title', text: opts.title }));
    }
    if (opts.balance != null) {
      const bal = h('span', { class: 'fui-ledger__balance' });
      if (opts.glyph) {
        bal.appendChild(
          h('span', {
            class: 'fui-ledger__coin',
            style: { '--fui-glyph-src': `var(--fui-img-${opts.glyph})` },
          }),
        );
      }
      bal.appendChild(h('span', { class: 'fui-num', text: commas(opts.balance) }));
      head.appendChild(bal);
    }
    if (head.childNodes.length) root.appendChild(head);

    if (opts.summary ?? true) {
      this.summaryEl = h('div', { class: 'fui-ledger__summary' });
      root.appendChild(this.summaryEl);
    }

    this.list = h('div', {
      class: 'fui-ledger__list fui-scroll',
      style:
        opts.maxHeight != null
          ? { maxHeight: typeof opts.maxHeight === 'number' ? `${opts.maxHeight}px` : opts.maxHeight }
          : {},
    });
    root.appendChild(this.list);
    this.render();
  }

  /** Everything that came in. */
  income(): number {
    return this.opts.entries.filter((e) => e.amount > 0).reduce((n, e) => n + e.amount, 0);
  }

  /** Everything that went out, as a positive number. */
  spend(): number {
    return -this.opts.entries.filter((e) => e.amount < 0).reduce((n, e) => n + e.amount, 0);
  }

  /** Income minus spend. */
  net(): number {
    return this.income() - this.spend();
  }

  /** Add a row to the top and move the balance with it. */
  add(entry: LedgerEntry): this {
    this.opts.entries = [entry, ...this.opts.entries];
    if (this.opts.balance != null) this.opts.balance += entry.amount;
    this.render();
    this.emit('ledger:add', entry);
    return this;
  }

  /** Replace the history. */
  setEntries(entries: LedgerEntry[], balance?: number): this {
    this.opts.entries = entries;
    if (balance != null) this.opts.balance = balance;
    this.render();
    return this;
  }

  private render(): void {
    clear(this.list);
    const bal = this.el.querySelector('.fui-ledger__balance .fui-num');
    if (bal && this.opts.balance != null) bal.textContent = commas(this.opts.balance);

    if (this.summaryEl) {
      clear(this.summaryEl);
      // Income and spend are shown separately, never netted: "earned 4M, spent
      // 4.2M" is a different story from "lost 200k".
      for (const [label, value, sign] of [
        ['In', this.income(), 'up'],
        ['Out', this.spend(), 'down'],
        ['Net', this.net(), this.net() >= 0 ? 'up' : 'down'],
      ] as Array<[string, number, string]>) {
        const cell = h('div', { class: 'fui-ledger__stat', dataset: { sign } });
        cell.appendChild(h('span', { class: 'fui-ledger__stat-label', text: label }));
        cell.appendChild(
          h('span', {
            class: 'fui-ledger__stat-value fui-num',
            text: `${label === 'Net' && value >= 0 ? '+' : label === 'Out' ? '−' : label === 'In' ? '+' : '−'}${commas(Math.abs(value))}`,
          }),
        );
        this.summaryEl.appendChild(cell);
      }
    }

    if (this.opts.entries.length === 0) {
      this.list.appendChild(
        h('p', {
          class: 'fui-ledger__empty',
          text: this.opts.emptyText ?? 'Nothing has moved yet.',
        }),
      );
      return;
    }

    // The running balance is counted backwards from what the player holds now,
    // because that is the only figure a game reliably knows.
    let running = this.opts.balance ?? 0;
    for (const entry of this.opts.entries) {
      const row = h('div', {
        class: 'fui-ledger__row',
        dataset: { sign: entry.amount >= 0 ? 'up' : 'down' },
      });

      const mark = h('span', { class: 'fui-ledger__mark' });
      if (entry.glyph) {
        mark.classList.add('is-glyph');
        mark.style.setProperty('--fui-glyph-src', `var(--fui-img-${entry.glyph})`);
      }
      row.appendChild(mark);

      const text = h('div', { class: 'fui-ledger__text' });
      text.appendChild(h('span', { class: 'fui-ledger__label', text: entry.label }));
      const meta = [entry.source, entry.when].filter(Boolean).join('  ·  ');
      if (meta) text.appendChild(h('span', { class: 'fui-ledger__meta', text: meta }));
      row.appendChild(text);

      const amounts = h('div', { class: 'fui-ledger__amounts' });
      amounts.appendChild(
        h('span', {
          class: 'fui-ledger__amount fui-num',
          text: `${entry.amount >= 0 ? '+' : '−'}${commas(Math.abs(entry.amount))}${entry.currency ? ` ${entry.currency}` : ''}`,
        }),
      );
      if (this.opts.running && this.opts.balance != null) {
        amounts.appendChild(
          h('span', { class: 'fui-ledger__running fui-num', text: commas(running) }),
        );
      }
      row.appendChild(amounts);
      this.list.appendChild(row);
      running -= entry.amount;
    }
  }
}
