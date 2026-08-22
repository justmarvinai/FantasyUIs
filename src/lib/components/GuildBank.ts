import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, clamp, commas } from '../core/dom.ts';

export interface BankItem {
  id: string;
  name: string;
  /** Manifest asset id for the item art. */
  art?: string;
  rarity?: Rarity;
  /** How many are in the vault. */
  qty?: number;
  /** Which tab it sits in. */
  tab?: string;
  /** This member's rank cannot take it. */
  locked?: boolean;
}

export interface BankEntry {
  /** Who moved it. */
  who: string;
  /** What moved. */
  what: string;
  /** Deposits and withdrawals read differently. */
  kind: 'in' | 'out';
  /** When, already formatted — `'2h ago'`. */
  when?: string;
}

export interface GuildBankOptions extends BaseOptions {
  /** Everything in the vault. */
  items: BankItem[];
  /** Tab names, in order. Omit for a single undivided vault. */
  tabs?: string[];
  /** Tab shown first. */
  tab?: string;
  /** Recent movements, newest first. */
  log?: BankEntry[];
  /** Withdrawals this member has already made this period. */
  used?: number;
  /** Withdrawals this member's rank is allowed per period. */
  allowance?: number;
  /** Name of the member's rank, printed beside the allowance. */
  rank?: string;
  /** Vault name. */
  title?: string;
}

/**
 * The guild vault: shared stash, per-rank withdrawal allowance, and the log that
 * stops it being emptied quietly.
 *
 *   const bank = new GuildBank({
 *     title: 'Ashfall Vault', tabs: ['Consumables', 'Materials', 'Relics'],
 *     items: vaultItems, used: 2, allowance: 5, rank: 'Veteran', log: recentMoves,
 *   });
 *   bank.on<BankItem>('bank:withdraw', (item) => guild.take(item.id));
 *   bank.on('bank:deposit', () => openDepositDialog());
 *
 * The allowance is the component's whole reason to exist, so it is a bar at the
 * top rather than a message on failure: a member should see "2 of 5 left" before
 * choosing what to take, not after being refused. When the allowance runs out
 * every tile disables at once and the reason is printed once, in one place,
 * instead of five identical error toasts.
 */
export class GuildBank extends FuiComponent<GuildBankOptions> {
  private grid: HTMLElement;
  private tabRow: HTMLElement | null = null;
  private allowEl: HTMLElement | null = null;
  private logList: HTMLElement | null = null;

  constructor(opts: GuildBankOptions) {
    const root = h('div', { class: 'fui fui-guildbank' });
    super(root, opts);
    this.opts.tab = opts.tab ?? opts.tabs?.[0];

    const head = h('div', { class: 'fui-guildbank__head' });
    head.appendChild(h('h3', { class: 'fui-guildbank__title', text: opts.title ?? 'Guild vault' }));
    const deposit = h('button', {
      class: 'fui-guildbank__deposit',
      attrs: { type: 'button' },
      text: 'Deposit',
    });
    deposit.addEventListener('click', () => this.emit('bank:deposit'));
    head.appendChild(deposit);
    root.appendChild(head);

    if (opts.allowance != null) {
      const allow = h('div', { class: 'fui-guildbank__allowance' });
      this.allowEl = h('span', { class: 'fui-guildbank__allowtext fui-num' });
      const bar = h('span', { class: 'fui-guildbank__allowbar' });
      bar.appendChild(h('span', { class: 'fui-guildbank__allowfill' }));
      allow.append(this.allowEl, bar);
      root.appendChild(allow);
    }

    if (opts.tabs?.length) {
      this.tabRow = h('div', { class: 'fui-guildbank__tabs', attrs: { role: 'tablist' } });
      for (const name of opts.tabs) {
        const tab = h('button', {
          class: 'fui-guildbank__tab',
          dataset: { tab: name },
          attrs: { type: 'button', role: 'tab' },
          text: name,
        });
        tab.addEventListener('click', () => this.setTab(name));
        this.tabRow.appendChild(tab);
      }
      root.appendChild(this.tabRow);
    }

    this.grid = h('div', { class: 'fui-guildbank__grid' });
    root.appendChild(this.grid);

    if (opts.log?.length) {
      const logBox = h('div', { class: 'fui-guildbank__log' });
      logBox.appendChild(h('h4', { class: 'fui-guildbank__logtitle', text: 'Recent movements' }));
      this.logList = h('ul', { class: 'fui-guildbank__loglist' });
      logBox.appendChild(this.logList);
      root.appendChild(logBox);
      this.paintLog();
    }

    this.build();
  }

  /** Show a different tab. */
  setTab(tab: string): this {
    this.opts.tab = tab;
    this.build();
    this.emit('bank:tab', tab);
    return this;
  }

  /** Take an item, spending one of the member's allowance. */
  withdraw(id: string): boolean {
    const item = this.opts.items.find((i) => i.id === id);
    if (!item || item.locked || this.spent()) return false;
    item.qty = Math.max(0, (item.qty ?? 1) - 1);
    if (this.opts.allowance != null) this.opts.used = (this.opts.used ?? 0) + 1;
    this.build();
    this.emit('bank:withdraw', item);
    return true;
  }

  /** Push a movement onto the log. */
  addEntry(entry: BankEntry): this {
    this.opts.log = [entry, ...(this.opts.log ?? [])].slice(0, 20);
    this.paintLog();
    return this;
  }

  private spent(): boolean {
    return this.opts.allowance != null && (this.opts.used ?? 0) >= this.opts.allowance;
  }

  private build(): void {
    if (this.tabRow) {
      for (const tab of Array.from(this.tabRow.children) as HTMLElement[]) {
        const on = tab.dataset.tab === this.opts.tab;
        tab.dataset.state = on ? 'on' : 'off';
        tab.setAttribute('aria-selected', String(on));
      }
    }

    if (this.allowEl && this.opts.allowance != null) {
      const used = this.opts.used ?? 0;
      const left = Math.max(0, this.opts.allowance - used);
      this.allowEl.textContent = `${left} of ${this.opts.allowance} withdrawals left${
        this.opts.rank ? ` · ${this.opts.rank}` : ''
      }`;
      this.el.style.setProperty(
        '--fui-bank-allow',
        String(clamp(left / this.opts.allowance, 0, 1)),
      );
      this.el.dataset.spent = this.spent() ? 'on' : 'off';
    }

    clear(this.grid);
    const items = this.opts.items.filter((i) => !this.opts.tab || (i.tab ?? this.opts.tabs?.[0]) === this.opts.tab);
    if (!items.length) {
      this.grid.appendChild(h('p', { class: 'fui-guildbank__empty', text: 'This tab is empty.' }));
      return;
    }
    for (const item of items) {
      const gone = (item.qty ?? 1) <= 0;
      const tile = h('button', {
        class: 'fui-guildbank__slot',
        dataset: {
          ...(item.rarity ? { rarity: item.rarity } : {}),
          state: gone ? 'empty' : item.locked ? 'locked' : this.spent() ? 'capped' : 'open',
        },
        attrs: {
          type: 'button',
          disabled: gone || !!item.locked || this.spent(),
          title: item.locked ? `${item.name} — your rank cannot withdraw this` : item.name,
        },
      });
      tile.appendChild(
        h('span', {
          class: 'fui-guildbank__art',
          style: item.art ? { '--fui-bank-art': `var(--fui-img-${item.art})` } : undefined,
        }),
      );
      if ((item.qty ?? 1) > 1) {
        tile.appendChild(h('span', { class: 'fui-guildbank__qty fui-num', text: commas(item.qty ?? 1) }));
      }
      if (item.locked) tile.appendChild(h('span', { class: 'fui-guildbank__lock' }));
      tile.appendChild(h('span', { class: 'fui-guildbank__name', text: item.name }));
      tile.addEventListener('click', () => this.withdraw(item.id));
      this.grid.appendChild(tile);
    }
  }

  private paintLog(): void {
    if (!this.logList) return;
    clear(this.logList);
    for (const entry of this.opts.log ?? []) {
      const li = h('li', { class: 'fui-guildbank__entry', dataset: { kind: entry.kind } });
      li.appendChild(h('span', { class: 'fui-guildbank__who', text: entry.who }));
      li.appendChild(h('span', { class: 'fui-guildbank__what', text: entry.what }));
      if (entry.when) li.appendChild(h('span', { class: 'fui-guildbank__when', text: entry.when }));
      this.logList.appendChild(li);
    }
  }
}
