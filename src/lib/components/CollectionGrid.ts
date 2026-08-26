import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';
import { PlayingCard, type PlayingCardOptions } from './PlayingCard.ts';

export interface CollectionCard extends PlayingCardOptions {
  id: string;
  /** Copies owned. */
  owned?: number;
  /** Copies allowed — 1 for a legendary, 2 otherwise. */
  limit?: number;
  /** Copies already in the deck being built, so a maxed card greys out. */
  inDeck?: number;
  /** Dust to craft one. */
  craftCost?: number;
}

export interface CollectionGridOptions extends BaseOptions {
  /** The page of cards. */
  cards: CollectionCard[];
  /** Card width in pixels. */
  size?: number;
  /** Cards per row. Omit to fill the container. */
  columns?: number;
  /** Show cards you do not own, greyed with their craft cost. */
  showUnowned?: boolean;
  /** Dust on hand, so unaffordable crafts say so. */
  dust?: number;
  /** Line shown when the page is empty. */
  emptyText?: string;
}

/**
 * The collection browser: a page of cards with the copies you own, the copies
 * already in the deck you are building, and the dust price of the ones you do
 * not have.
 *
 *   const grid = new CollectionGrid({ cards: page, size: 150, dust: 2400, showUnowned: true });
 *   grid.on<CollectionCard>('collection:add', (card) => deck.add(card));
 *   grid.on<CollectionCard>('collection:craft', (card) => crafting.open(card));
 *
 * A card already maxed in the deck is greyed *in place* rather than filtered
 * out, because the collection is browsed by looking, and a card vanishing as you
 * add its second copy reflows the page under the cursor. The copy pip carries
 * the whole state — `1/2`, `2/2`, or a dust price — so one glance per card
 * answers "can I add this".
 *
 * Unowned cards keep their art at full detail behind the grey, since the
 * collection is also the shop window.
 */
export class CollectionGrid extends FuiComponent<CollectionGridOptions> {
  private grid: HTMLElement;

  constructor(opts: CollectionGridOptions) {
    const root = h('div', {
      class: 'fui fui-collection',
      style: {
        '--fui-coll-size': `${opts.size ?? 150}px`,
        ...(opts.columns ? { '--fui-coll-cols': String(opts.columns) } : {}),
      },
    });
    super(root, opts);

    this.grid = h('div', {
      class: 'fui-collection__grid',
      dataset: { fixed: opts.columns ? 'on' : 'off' },
      attrs: { role: 'list' },
    });
    root.appendChild(this.grid);

    this.build();
  }

  /** Replace the page. */
  setCards(cards: CollectionCard[]): this {
    this.opts.cards = cards;
    this.build();
    return this;
  }

  /** Update how many copies of a card are in the deck being built. */
  setInDeck(id: string, inDeck: number): this {
    const card = this.opts.cards.find((c) => c.id === id);
    if (card) {
      card.inDeck = inDeck;
      this.build();
    }
    return this;
  }

  /** Update dust on hand, so unaffordable crafts re-decide. */
  setDust(dust: number): this {
    this.opts.dust = dust;
    this.build();
    return this;
  }

  private build(): void {
    clear(this.grid);
    const shown = this.opts.showUnowned
      ? this.opts.cards
      : this.opts.cards.filter((c) => (c.owned ?? 0) > 0);

    for (const card of shown) {
      const limit = card.limit ?? 2;
      const owned = card.owned ?? 0;
      const inDeck = card.inDeck ?? 0;
      const usable = Math.min(owned, limit);
      const maxed = inDeck >= usable && usable > 0;
      const poor = owned === 0 && this.opts.dust != null && (card.craftCost ?? 0) > this.opts.dust;

      const cell = h('div', {
        class: 'fui-collection__cell',
        dataset: {
          owned: owned > 0 ? 'on' : 'off',
          maxed: maxed ? 'on' : 'off',
          poor: poor ? 'on' : 'off',
        },
        attrs: { role: 'listitem' },
      });

      const built = new PlayingCard({
        ...card,
        width: this.opts.size ?? 150,
        playable: owned > 0 && !maxed,
      });
      built.on('card:play', () => {
        if (owned === 0) this.emit('collection:craft', card);
        else if (!maxed) this.emit('collection:add', card);
        else this.emit('collection:maxed', card);
      });
      cell.appendChild(built.el);

      // One pip carries the whole state, so a glance per card answers
      // "can I add this".
      cell.appendChild(
        h('span', {
          class: 'fui-collection__pip fui-num',
          dataset: { kind: owned === 0 ? 'craft' : maxed ? 'maxed' : 'own' },
          // Copies in the deck out of copies you could put there — never
          // `inDeck || owned`, which prints the same "2 / 2" for a card already
          // maxed in the deck and one you own two of and have not used.
          text: owned === 0 ? `${card.craftCost ?? '?'} ✦` : `${inDeck} / ${usable}`,
        }),
      );

      this.grid.appendChild(cell);
    }

    if (!shown.length) {
      this.grid.appendChild(
        h('p', {
          class: 'fui-collection__empty',
          text: this.opts.emptyText ?? 'No cards match those filters.',
        }),
      );
    }
  }
}
