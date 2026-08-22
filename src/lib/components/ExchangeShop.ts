import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, commas, duration } from '../core/dom.ts';

export interface ExchangeOffer {
  id: string;
  name: string;
  /** Manifest asset id for the item art. */
  art?: string;
  rarity?: Rarity;
  /** How many of the item one purchase gives. */
  amount?: number;
  /** Price in the shop's token. */
  cost: number;
  /** Purchases allowed this cycle. Omit for unlimited. */
  limit?: number;
  /** Purchases already made this cycle. */
  bought?: number;
  /** Short tag printed on the tile, e.g. `'New'`. */
  tag?: string;
}

export interface ExchangeShopOptions extends BaseOptions {
  /** Everything on sale. */
  offers: ExchangeOffer[];
  /** Name of the token this shop trades in. */
  token?: string;
  /** Glyph asset id for the token. */
  tokenArt?: string;
  /** How many tokens the player holds. */
  balance?: number;
  /** Seconds until the stock resets. */
  resetsIn?: number;
  /** Heading. */
  title?: string;
  /** Tile width in pixels. */
  size?: number;
}

/**
 * The token shop every event ends at: spend the currency the event paid out,
 * against per-cycle stock limits and a reset clock.
 *
 *   const shop = new ExchangeShop({
 *     title: 'Ember Exchange', token: 'Ember Marks', tokenArt: 'glyph-magic-flame',
 *     balance: 1840, resetsIn: 3 * 24 * 3600, offers: eventOffers,
 *   });
 *   shop.on<ExchangeOffer>('shop:buy', (offer) => economy.exchange(offer));
 *
 * The two things that make a token shop legible are stock and affordability, so
 * both live on the tile: "3 / 5 left" under the price, and a tile that visibly
 * dims the moment the balance drops below the cost. `buy()` decrements local
 * stock optimistically and re-paints, which keeps a ten-tap spending spree
 * responsive; call `setStock()` from the server's reply to correct it.
 */
export class ExchangeShop extends FuiComponent<ExchangeShopOptions> {
  private grid: HTMLElement;
  private balanceEl: HTMLElement | null = null;
  private clockEl: HTMLElement | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(opts: ExchangeShopOptions) {
    const root = h('div', {
      class: 'fui fui-exchange',
      style: { '--fui-exchange-size': `${opts.size ?? 116}px` },
    });
    super(root, opts);

    const head = h('div', { class: 'fui-exchange__head' });
    head.appendChild(h('h3', { class: 'fui-exchange__title', text: opts.title ?? 'Exchange' }));
    if (opts.resetsIn != null) {
      this.clockEl = h('span', { class: 'fui-exchange__clock fui-num' });
      head.appendChild(this.clockEl);
    }
    if (opts.balance != null) {
      const purse = h('span', { class: 'fui-exchange__purse' });
      if (opts.tokenArt) {
        purse.appendChild(
          h('span', {
            class: 'fui-exchange__coin',
            style: { '--fui-exchange-coin': `var(--fui-img-${opts.tokenArt})` },
          }),
        );
      }
      this.balanceEl = h('span', { class: 'fui-exchange__balance fui-num', text: commas(opts.balance) });
      purse.appendChild(this.balanceEl);
      if (opts.token) purse.setAttribute('title', opts.token);
      head.appendChild(purse);
    }
    root.appendChild(head);

    this.grid = h('div', { class: 'fui-exchange__grid' });
    root.appendChild(this.grid);

    this.build();

    if (opts.resetsIn != null) {
      this.paintClock();
      this.ticker = setInterval(() => {
        this.opts.resetsIn = Math.max(0, (this.opts.resetsIn ?? 0) - 1);
        this.paintClock();
      }, 1000);
      this.onDestroy(() => {
        if (this.ticker) clearInterval(this.ticker);
      });
    }
  }

  /** Spend on an offer. Returns false when it is sold out or unaffordable. */
  buy(id: string): boolean {
    const offer = this.opts.offers.find((o) => o.id === id);
    if (!offer) return false;
    const bought = offer.bought ?? 0;
    if (offer.limit != null && bought >= offer.limit) return false;
    if (this.opts.balance != null && offer.cost > this.opts.balance) return false;

    offer.bought = bought + 1;
    if (this.opts.balance != null) this.setBalance(this.opts.balance - offer.cost);
    this.build();
    this.emit('shop:buy', offer);
    return true;
  }

  /** Correct an offer's purchase count from the server. */
  setStock(id: string, bought: number): this {
    const offer = this.opts.offers.find((o) => o.id === id);
    if (offer) {
      offer.bought = bought;
      this.build();
    }
    return this;
  }

  /** Update the purse. */
  setBalance(balance: number): this {
    this.opts.balance = balance;
    if (this.balanceEl) this.balanceEl.textContent = commas(balance);
    this.build();
    return this;
  }

  private build(): void {
    clear(this.grid);
    for (const offer of this.opts.offers) {
      const bought = offer.bought ?? 0;
      const out = offer.limit != null && bought >= offer.limit;
      const poor = this.opts.balance != null && offer.cost > this.opts.balance;

      const tile = h('button', {
        class: 'fui-exchange__tile',
        dataset: {
          ...(offer.rarity ? { rarity: offer.rarity } : {}),
          state: out ? 'sold' : poor ? 'poor' : 'open',
        },
        attrs: { type: 'button', disabled: out || poor },
      });

      const art = h('span', {
        class: 'fui-exchange__art',
        style: offer.art ? { '--fui-exchange-art': `var(--fui-img-${offer.art})` } : undefined,
      });
      if (offer.amount != null && offer.amount > 1) {
        art.appendChild(h('span', { class: 'fui-exchange__count fui-num', text: `×${commas(offer.amount)}` }));
      }
      if (offer.tag) art.appendChild(h('span', { class: 'fui-exchange__tag', text: offer.tag }));
      tile.appendChild(art);

      tile.appendChild(h('span', { class: 'fui-exchange__name', text: offer.name }));
      tile.appendChild(h('span', { class: 'fui-exchange__cost fui-num', text: commas(offer.cost) }));
      tile.appendChild(
        h('span', {
          class: 'fui-exchange__stock',
          text: offer.limit == null ? 'Unlimited' : `${offer.limit - bought} / ${offer.limit} left`,
        }),
      );
      if (out) tile.appendChild(h('span', { class: 'fui-exchange__sold', text: 'Sold out' }));

      tile.addEventListener('click', () => this.buy(offer.id));
      this.grid.appendChild(tile);
    }
  }

  private paintClock(): void {
    if (!this.clockEl) return;
    const left = this.opts.resetsIn ?? 0;
    this.clockEl.textContent = left > 0 ? `Resets in ${duration(left)}` : 'Restocking…';
    this.clockEl.dataset.low = left > 0 && left < 3600 ? 'on' : 'off';
  }
}
