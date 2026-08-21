import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear, commas, duration } from '../core/dom.ts';

export interface Listing {
  id: string;
  name: string;
  /** Manifest asset id for the item art. */
  art?: string;
  rarity?: Rarity;
  /** Stack size. */
  qty?: number;
  /** Item level, tier or any short qualifier under the name. */
  note?: string;
  /** Current highest bid. Omit for a buyout-only listing. */
  bid?: number;
  /** Instant purchase price. Omit for an auction with no buyout. */
  buyout?: number;
  /** Seconds until the listing closes. */
  endsIn?: number;
  /** Who put it up. */
  seller?: string;
  /** The local player is the top bidder. */
  winning?: boolean;
  /** The local player listed it, so it cannot be bid on. */
  yours?: boolean;
}

export interface AuctionHouseOptions extends BaseOptions {
  /** Everything currently up for sale. */
  listings: Listing[];
  /** Heading over the table. */
  title?: string;
  /** Currency glyph asset id shown beside prices. */
  currencyGlyph?: string;
  /** Column the table opens on. */
  sort?: 'price' | 'ending' | 'name' | 'rarity';
  /** What the player can spend, used to grey out what they cannot afford. */
  funds?: number;
  /** Cap the height in pixels (or any CSS length) and scroll inside. */
  maxHeight?: number | string;
  /** Cut the seller and time columns for a narrow panel. */
  compact?: boolean;
  /** Line shown when no listing matches the search. */
  emptyText?: string;
}

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

/**
 * The player market: what is for sale, what it costs, and how long is left.
 * `ShopPanel` sells the game's own stock at fixed prices; this is the one where
 * the prices come from other players and the clock matters.
 *
 *   const ah = new AuctionHouse({
 *     title: 'Auction house', sort: 'ending', funds: 480_000, currencyGlyph: 'icon-coins',
 *     listings: [
 *       { id: 'l1', name: 'Runeblade', art: 'weapon-runeblade', rarity: 'epic',
 *         bid: 82_000, buyout: 240_000, endsIn: 5400, seller: 'Rhogar' },
 *     ],
 *   });
 *   ah.on<string>('auction:bid', (id) => openBidDialog(id));
 *
 * Buyout goes dead when the player cannot afford it and says so on the button,
 * and a listing the player is already winning is marked rather than merely
 * sorted differently — the two states a market UI has to get right, because
 * both cost real money to discover the hard way.
 */
export class AuctionHouse extends FuiComponent<AuctionHouseOptions> {
  private body: HTMLElement;
  private sortBy: NonNullable<AuctionHouseOptions['sort']>;
  private headings: HTMLElement;
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(opts: AuctionHouseOptions) {
    const root = h('div', {
      class: 'fui fui-auction',
      dataset: { compact: String(!!opts.compact) },
    });
    super(root, opts);
    this.sortBy = opts.sort ?? 'ending';

    const head = h('div', { class: 'fui-auction__head' });
    if (opts.title) {
      head.appendChild(h('span', { class: 'fui-auction__title fui-title', text: opts.title }));
    }
    if (opts.funds != null) {
      const funds = h('span', { class: 'fui-auction__funds' });
      if (opts.currencyGlyph) {
        funds.appendChild(
          h('span', {
            class: 'fui-auction__coin',
            style: { '--fui-glyph-src': `var(--fui-img-${opts.currencyGlyph})` },
          }),
        );
      }
      funds.appendChild(h('span', { class: 'fui-num', text: commas(opts.funds) }));
      head.appendChild(funds);
    }
    root.appendChild(head);

    this.headings = h('div', { class: 'fui-auction__cols' });
    root.appendChild(this.headings);
    this.paintHeadings();

    this.body = h('div', {
      class: 'fui-auction__body fui-scroll',
      style:
        opts.maxHeight != null
          ? { maxHeight: typeof opts.maxHeight === 'number' ? `${opts.maxHeight}px` : opts.maxHeight }
          : {},
    });
    root.appendChild(this.body);

    // Listings expire while the player is looking at them, so the clock has to
    // run rather than showing the time the panel happened to open.
    if (opts.listings.some((l) => l.endsIn != null)) {
      this.ticker = setInterval(() => this.tick(), 1000);
      this.onDestroy(() => this.stop());
    }
    this.paint();
  }

  /** Replace the listings. */
  setListings(listings: Listing[]): this {
    this.opts.listings = listings;
    this.paint();
    return this;
  }

  /** Re-sort the table. */
  setSort(sort: NonNullable<AuctionHouseOptions['sort']>): this {
    this.sortBy = sort;
    this.paintHeadings();
    this.paint();
    this.emit('auction:sort', sort);
    return this;
  }

  /** Update the player's spendable funds and re-evaluate every buyout. */
  setFunds(funds: number): this {
    this.opts.funds = funds;
    this.paint();
    return this;
  }

  /** Stop the countdown. Called on destroy. */
  stop(): this {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    return this;
  }

  /** The cheapest way to own a given listing right now. */
  priceOf(listing: Listing): number {
    return listing.buyout ?? listing.bid ?? 0;
  }

  private sorted(): Listing[] {
    const rows = [...this.opts.listings];
    switch (this.sortBy) {
      case 'price':
        return rows.sort((a, b) => this.priceOf(a) - this.priceOf(b));
      case 'name':
        return rows.sort((a, b) => a.name.localeCompare(b.name));
      case 'rarity':
        return rows.sort(
          (a, b) =>
            RARITY_ORDER.indexOf(b.rarity ?? 'common') - RARITY_ORDER.indexOf(a.rarity ?? 'common'),
        );
      default:
        // A listing with no clock never expires, so it sorts last rather than
        // first — otherwise "ending soonest" opens on the ones that never end.
        return rows.sort((a, b) => (a.endsIn ?? Infinity) - (b.endsIn ?? Infinity));
    }
  }

  private paintHeadings(): void {
    clear(this.headings);
    const cols: Array<[string, NonNullable<AuctionHouseOptions['sort']> | null]> = [
      ['Item', 'name'],
      ['Rarity', 'rarity'],
      ['Price', 'price'],
      ['Ends', 'ending'],
      ['', null],
    ];
    for (const [label, key] of cols) {
      if (!label) {
        this.headings.appendChild(h('span'));
        continue;
      }
      const btn = h('button', {
        class: 'fui-auction__col',
        text: label,
        attrs: { type: 'button', 'aria-sort': this.sortBy === key ? 'ascending' : 'none' },
      });
      if (this.sortBy === key) btn.classList.add('is-on');
      if (key) btn.addEventListener('click', () => this.setSort(key));
      this.headings.appendChild(btn);
    }
  }

  private tick(): void {
    for (const l of this.opts.listings) {
      if (l.endsIn != null && l.endsIn > 0) l.endsIn -= 1;
    }
    for (const row of this.body.querySelectorAll<HTMLElement>('[data-id]')) {
      const l = this.opts.listings.find((x) => x.id === row.dataset.id);
      const cell = row.querySelector('.fui-auction__ends');
      if (!l || !cell || l.endsIn == null) continue;
      cell.textContent = l.endsIn > 0 ? duration(l.endsIn) : 'Closed';
      row.dataset.soon = String(l.endsIn > 0 && l.endsIn < 300);
      if (l.endsIn <= 0) row.dataset.state = 'closed';
    }
  }

  private paint(): void {
    clear(this.body);
    const rows = this.sorted();

    if (rows.length === 0) {
      this.body.appendChild(
        h('p', {
          class: 'fui-auction__empty',
          text: this.opts.emptyText ?? 'Nothing is up for sale. Try a wider search.',
        }),
      );
      return;
    }

    for (const l of rows) {
      const closed = l.endsIn != null && l.endsIn <= 0;
      const price = this.priceOf(l);
      const affordable = this.opts.funds == null || price <= this.opts.funds;

      const row = h('div', {
        class: 'fui-auction__row',
        dataset: {
          id: l.id,
          rarity: l.rarity ?? 'common',
          state: closed ? 'closed' : l.yours ? 'yours' : 'open',
          soon: String(l.endsIn != null && l.endsIn > 0 && l.endsIn < 300),
        },
      });
      if (l.winning) row.classList.add('is-winning');

      const item = h('div', { class: 'fui-auction__item' });
      const art = h('span', { class: 'fui-auction__art' });
      if (l.art) art.style.backgroundImage = `var(--fui-img-${l.art})`;
      if (l.qty != null && l.qty > 1) {
        art.appendChild(h('span', { class: 'fui-auction__qty fui-num', text: `×${l.qty}` }));
      }
      item.appendChild(art);
      const names = h('div', { class: 'fui-auction__names' });
      names.appendChild(h('span', { class: 'fui-auction__name', text: l.name }));
      const sub = [l.note, !this.opts.compact && l.seller ? `by ${l.seller}` : null]
        .filter(Boolean)
        .join(' · ');
      if (sub) names.appendChild(h('span', { class: 'fui-auction__note', text: sub }));
      item.appendChild(names);
      row.appendChild(item);

      row.appendChild(
        h('span', { class: 'fui-auction__rarity', text: l.rarity ?? 'common' }),
      );

      const prices = h('div', { class: 'fui-auction__prices' });
      if (l.bid != null) {
        prices.appendChild(
          h('span', { class: 'fui-auction__bid fui-num', text: `Bid ${commas(l.bid)}` }),
        );
      }
      if (l.buyout != null) {
        prices.appendChild(
          h('span', { class: 'fui-auction__buyout fui-num', text: commas(l.buyout) }),
        );
      }
      row.appendChild(prices);

      row.appendChild(
        h('span', {
          class: 'fui-auction__ends fui-num',
          text: l.endsIn == null ? '—' : closed ? 'Closed' : duration(l.endsIn),
        }),
      );

      const actions = h('div', { class: 'fui-auction__actions' });
      if (l.yours) {
        const cancel = h('button', {
          class: 'fui-auction__act fui-auction__act--cancel',
          text: 'Cancel',
          attrs: { type: 'button', disabled: closed || undefined },
        });
        cancel.addEventListener('click', () => this.emit('auction:cancel', l.id));
        actions.appendChild(cancel);
      } else {
        if (l.bid != null) {
          const bid = h('button', {
            class: 'fui-auction__act fui-auction__act--bid',
            text: l.winning ? 'Winning' : 'Bid',
            attrs: { type: 'button', disabled: closed || l.winning || undefined },
          });
          bid.addEventListener('click', () => this.emit('auction:bid', l.id));
          actions.appendChild(bid);
        }
        if (l.buyout != null) {
          const buy = h('button', {
            class: 'fui-auction__act fui-auction__act--buy',
            // The reason a button is dead belongs on the button.
            text: closed ? 'Closed' : affordable ? 'Buy' : 'Short',
            attrs: {
              type: 'button',
              disabled: closed || !affordable || undefined,
              title: affordable ? 'Buy out' : `Needs ${commas(price - (this.opts.funds ?? 0))} more`,
            },
          });
          buy.addEventListener('click', () => this.emit('auction:buy', l.id));
          actions.appendChild(buy);
        }
      }
      row.appendChild(actions);
      this.body.appendChild(row);
    }
  }
}
