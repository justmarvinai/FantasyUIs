import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, commas } from '../core/dom.ts';

export interface SummonResultItem {
  id: string;
  name: string;
  /** Manifest asset id for the art. */
  art?: string;
  rarity?: Rarity;
  /** A duplicate — shown converted to shards. */
  duplicate?: boolean;
  /** What a duplicate converted into, e.g. `'+40 shards'`. */
  converted?: string;
  /** Brand new to the collection. */
  isNew?: boolean;
}

export interface SummonScreenOptions extends BaseOptions {
  /** Banner name. */
  banner: string;
  /** Manifest asset id for the backdrop. */
  art?: string;
  /** Featured unit's name, printed under the banner. */
  featured?: string;
  /** Cost of a single summon. */
  cost?: number;
  /** Glyph asset id for the currency. */
  currencyArt?: string;
  /** Currency on hand. */
  balance?: number;
  /** Pulls since the last top rarity. */
  pity?: number;
  /** Pulls until the top rarity is guaranteed. */
  pityCap?: number;
  /** Seconds until the banner closes. */
  endsIn?: number;
  /** Results to show. Passing any switches the screen to its reveal state. */
  results?: SummonResultItem[];
  /** Rate list shown behind the Details button. */
  rates?: { label: string; chance: number }[];
}

/**
 * The full-screen summon banner and its reveal: art, cost, pity, the two pull
 * buttons, and the grid the results land in.
 *
 *   const summon = new SummonScreen({
 *     banner: 'Emberfall', art: 'banner-flame', featured: 'Pyre Knight',
 *     cost: 160, balance: 3200, currencyArt: 'glyph-celestial-body',
 *     pity: 61, pityCap: 90, endsIn: 5 * 86400, rates: bannerRates,
 *   });
 *   summon.on<number>('summon:pull', (count) => gacha.pull(count).then((r) => summon.reveal(r)));
 *   summon.on('summon:done', () => summon.reset());
 *
 * `reveal()` flips the same component from banner to results rather than
 * swapping in a second screen, so the art, the pity counter and the balance the
 * player was just looking at stay put and only the middle changes. Results
 * stagger in on a per-tile delay set from the index, which is what makes a
 * ten-pull feel like ten pulls instead of one grid appearing.
 */
export class SummonScreen extends FuiComponent<SummonScreenOptions> {
  private stage: HTMLElement;
  private results: HTMLElement;
  private pityEl: HTMLElement | null = null;
  private balanceEl: HTMLElement | null = null;
  private buttons: HTMLButtonElement[] = [];
  private ratesBox: HTMLElement | null = null;

  constructor(opts: SummonScreenOptions) {
    const root = h('div', {
      class: 'fui fui-summonscreen',
      dataset: { phase: opts.results?.length ? 'reveal' : 'banner' },
      style: opts.art ? { '--fui-summon-art': `var(--fui-img-${opts.art})` } : undefined,
    });
    super(root, opts);

    const head = h('div', { class: 'fui-summonscreen__head' });
    head.appendChild(h('h2', { class: 'fui-summonscreen__banner', text: opts.banner }));
    if (opts.featured) {
      head.appendChild(h('span', { class: 'fui-summonscreen__featured', text: opts.featured }));
    }
    if (opts.endsIn != null) {
      head.appendChild(
        h('span', {
          class: 'fui-summonscreen__ends',
          text: `Ends in ${Math.max(0, Math.ceil(opts.endsIn / 86400))}d`,
        }),
      );
    }
    root.appendChild(head);

    this.stage = h('div', { class: 'fui-summonscreen__stage' });
    this.results = h('div', { class: 'fui-summonscreen__results' });
    this.stage.appendChild(this.results);
    root.appendChild(this.stage);

    const bar = h('div', { class: 'fui-summonscreen__bar' });
    if (opts.pityCap != null) {
      this.pityEl = h('span', { class: 'fui-summonscreen__pity fui-num' });
      bar.appendChild(this.pityEl);
    }
    if (opts.rates?.length) {
      const toggle = h('button', {
        class: 'fui-summonscreen__ratebtn',
        attrs: { type: 'button', 'aria-expanded': 'false' },
        text: 'Rates',
      });
      this.ratesBox = h('div', { class: 'fui-summonscreen__rates', dataset: { open: 'off' } });
      for (const rate of opts.rates) {
        const row = h('div', { class: 'fui-summonscreen__rate' });
        row.appendChild(h('span', { class: 'fui-summonscreen__ratelabel', text: rate.label }));
        row.appendChild(
          h('span', {
            class: 'fui-summonscreen__ratenum fui-num',
            text: `${(rate.chance * 100).toFixed(rate.chance < 0.01 ? 2 : 1)}%`,
          }),
        );
        this.ratesBox.appendChild(row);
      }
      toggle.addEventListener('click', () => {
        const open = this.ratesBox!.dataset.open === 'on';
        this.ratesBox!.dataset.open = open ? 'off' : 'on';
        toggle.setAttribute('aria-expanded', String(!open));
      });
      bar.appendChild(toggle);
    }
    if (opts.balance != null) {
      const purse = h('span', { class: 'fui-summonscreen__purse' });
      if (opts.currencyArt) {
        purse.appendChild(
          h('span', {
            class: 'fui-summonscreen__coin',
            style: { '--fui-summon-coin': `var(--fui-img-${opts.currencyArt})` },
          }),
        );
      }
      this.balanceEl = h('span', {
        class: 'fui-summonscreen__balance fui-num',
        text: commas(opts.balance),
      });
      purse.appendChild(this.balanceEl);
      bar.appendChild(purse);
    }
    root.appendChild(bar);
    if (this.ratesBox) root.appendChild(this.ratesBox);

    const actions = h('div', { class: 'fui-summonscreen__actions' });
    for (const count of [1, 10]) {
      const btn = h('button', {
        class: 'fui-summonscreen__pull',
        dataset: { count: String(count) },
        attrs: { type: 'button' },
      });
      btn.appendChild(h('span', { class: 'fui-summonscreen__pulllabel', text: `Summon ×${count}` }));
      if (opts.cost != null) {
        btn.appendChild(
          h('span', { class: 'fui-summonscreen__price fui-num', text: commas(opts.cost * count) }),
        );
      }
      btn.addEventListener('click', () => this.emit('summon:pull', count));
      this.buttons.push(btn);
      actions.appendChild(btn);
    }
    const done = h('button', {
      class: 'fui-summonscreen__done',
      attrs: { type: 'button' },
      text: 'Continue',
    });
    done.addEventListener('click', () => this.emit('summon:done'));
    actions.appendChild(done);
    root.appendChild(actions);

    this.paint();
    if (opts.results?.length) this.reveal(opts.results);
  }

  /** Show a set of results and switch the screen to its reveal state. */
  reveal(results: SummonResultItem[]): this {
    this.opts.results = results;
    this.el.dataset.phase = 'reveal';
    clear(this.results);
    results.forEach((item, i) => {
      const tile = h('div', {
        class: 'fui-summonscreen__tile',
        dataset: {
          ...(item.rarity ? { rarity: item.rarity } : {}),
          dupe: item.duplicate ? 'on' : 'off',
        },
        // A per-tile delay, straight off the index — the whole reason a ten-pull
        // reads as ten events rather than one grid.
        style: { '--fui-summon-delay': `${i * 90}ms` },
      });
      tile.appendChild(
        h('span', {
          class: 'fui-summonscreen__tileart',
          style: item.art ? { '--fui-summon-tile': `var(--fui-img-${item.art})` } : undefined,
        }),
      );
      tile.appendChild(h('span', { class: 'fui-summonscreen__tilename', text: item.name }));
      if (item.isNew) tile.appendChild(h('span', { class: 'fui-summonscreen__new', text: 'New' }));
      if (item.duplicate && item.converted) {
        tile.appendChild(h('span', { class: 'fui-summonscreen__dupe', text: item.converted }));
      }
      this.results.appendChild(tile);
    });
    this.emit('summon:reveal', results);
    return this;
  }

  /** Go back to the banner. */
  reset(): this {
    this.opts.results = [];
    this.el.dataset.phase = 'banner';
    clear(this.results);
    return this;
  }

  /** Update pity and the purse after a pull resolves. */
  setState(pity: number, balance = this.opts.balance): this {
    this.opts.pity = pity;
    this.opts.balance = balance;
    this.paint();
    return this;
  }

  private paint(): void {
    if (this.pityEl && this.opts.pityCap != null) {
      const left = Math.max(0, this.opts.pityCap - (this.opts.pity ?? 0));
      this.pityEl.textContent = `${left} to guaranteed`;
      this.pityEl.dataset.close = left <= 10 ? 'on' : 'off';
    }
    if (this.balanceEl && this.opts.balance != null) {
      this.balanceEl.textContent = commas(this.opts.balance);
    }
    for (const btn of this.buttons) {
      const count = Number(btn.dataset.count);
      btn.disabled =
        this.opts.cost != null &&
        this.opts.balance != null &&
        this.opts.cost * count > this.opts.balance;
    }
  }
}
