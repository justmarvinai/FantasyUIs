import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface DeckEntry {
  id: string;
  name: string;
  cost: number;
  /** How many copies. */
  count?: number;
  rarity?: Rarity;
  /** Manifest asset id for the row's art strip. */
  art?: string;
  /** Legendary and similar: only one copy allowed. */
  unique?: boolean;
  /** Not yet crafted — the row prints its dust cost instead of a count. */
  missing?: boolean;
  /** Dust to craft it, when missing. */
  craftCost?: number;
}

export interface DeckListOptions extends BaseOptions {
  /** Deck name. */
  name?: string;
  /** The class or archetype. */
  heroClass?: string;
  /** The cards, any order — the list sorts by cost then name itself. */
  cards: DeckEntry[];
  /** Deck size, e.g. 30. */
  size?: number;
  /** Max copies of a normal card. */
  copyLimit?: number;
  /** Rows are removable. */
  editable?: boolean;
  /** Height of the scrolling list in pixels. */
  height?: number;
  /** Dust needed for everything missing. Computed when omitted. */
  dustNeeded?: number;
}

/**
 * The deck list: every card, sorted by cost, with copy counts and the dust
 * needed for anything you do not own. It is the deckbuilder's whole right-hand
 * column and the thing players paste at each other.
 *
 *   const list = new DeckList({
 *     name: 'Emberfall Aggro', heroClass: 'Warrior', cards, size: 30, copyLimit: 2, editable: true,
 *   });
 *   list.on<DeckEntry>('deck:remove', (card) => builder.remove(card.id));
 *   list.on<{ have: number; size: number }>('deck:count', (c) => header.setCount(c));
 *
 * The list sorts itself by cost then name rather than trusting the caller's
 * order, because a deck list that is not in curve order is unreadable and every
 * caller would otherwise have to remember to sort. Counting is derived the same
 * way: `have` is the sum of copies, not a separate field, so the header can
 * never disagree with the rows.
 *
 * Missing cards stay in the list with their dust cost, which is what turns a
 * deck list from a record into a shopping list — the single most useful thing a
 * deckbuilder does for a new player.
 */
export class DeckList extends FuiComponent<DeckListOptions> {
  private list: HTMLElement;
  private countEl: HTMLElement;
  private dustEl: HTMLElement | null = null;

  constructor(opts: DeckListOptions) {
    const root = h('div', {
      class: 'fui fui-decklist',
      style: { '--fui-decklist-h': `${opts.height ?? 380}px` },
    });
    super(root, opts);

    const head = h('div', { class: 'fui-decklist__head' });
    const names = h('div', { class: 'fui-decklist__names' });
    names.appendChild(h('span', { class: 'fui-decklist__name', text: opts.name ?? 'New deck' }));
    if (opts.heroClass) {
      names.appendChild(h('span', { class: 'fui-decklist__class', text: opts.heroClass }));
    }
    head.appendChild(names);
    this.countEl = h('span', { class: 'fui-decklist__count fui-num' });
    head.appendChild(this.countEl);
    root.appendChild(head);

    this.list = h('div', { class: 'fui-decklist__list', attrs: { role: 'list' } });
    root.appendChild(this.list);

    this.dustEl = h('p', { class: 'fui-decklist__dust' });
    root.appendChild(this.dustEl);

    this.build();
  }

  /** Replace the whole list. */
  setCards(cards: DeckEntry[]): this {
    this.opts.cards = cards;
    this.build();
    return this;
  }

  /** Add a copy, respecting the per-card limit. Returns false when refused. */
  add(card: DeckEntry): boolean {
    const limit = card.unique ? 1 : (this.opts.copyLimit ?? 2);
    const existing = this.opts.cards.find((c) => c.id === card.id);
    if (existing && (existing.count ?? 1) >= limit) return false;
    if (this.count >= (this.opts.size ?? 30)) return false;

    if (existing) existing.count = (existing.count ?? 1) + 1;
    else this.opts.cards = [...this.opts.cards, { ...card, count: 1 }];
    this.build();
    return true;
  }

  /** Remove one copy; the row goes when the last copy does. */
  remove(id: string): this {
    const card = this.opts.cards.find((c) => c.id === id);
    if (!card) return this;
    const left = (card.count ?? 1) - 1;
    if (left <= 0) this.opts.cards = this.opts.cards.filter((c) => c.id !== id);
    else card.count = left;
    this.build();
    this.emit('deck:remove', card);
    return this;
  }

  /** Total copies in the deck — derived, so it cannot disagree with the rows. */
  get count(): number {
    return this.opts.cards.reduce((sum, c) => sum + (c.count ?? 1), 0);
  }

  /** Cards per mana cost, ready for `ManaCurve`. */
  curve(cap = 7): number[] {
    const buckets = new Array(cap + 1).fill(0);
    for (const card of this.opts.cards) {
      buckets[Math.min(card.cost, cap)] += card.count ?? 1;
    }
    return buckets;
  }

  private build(): void {
    // Sorted here rather than trusting the caller: a deck list out of curve
    // order is unreadable, and every caller would otherwise have to remember.
    const sorted = [...this.opts.cards].sort(
      (a, b) => a.cost - b.cost || a.name.localeCompare(b.name),
    );

    clear(this.list);
    for (const card of sorted) {
      const row = h('div', {
        class: 'fui-decklist__row',
        dataset: {
          ...(card.rarity ? { rarity: card.rarity } : {}),
          missing: card.missing ? 'on' : 'off',
        },
        style: card.art ? { '--fui-decklist-art': `var(--fui-img-${card.art})` } : undefined,
        attrs: { role: 'listitem' },
      });
      row.appendChild(h('span', { class: 'fui-decklist__cost fui-num', text: String(card.cost) }));
      row.appendChild(h('span', { class: 'fui-decklist__strip', attrs: { 'aria-hidden': 'true' } }));
      row.appendChild(h('span', { class: 'fui-decklist__cardname', text: card.name }));

      if (card.missing && card.craftCost != null) {
        row.appendChild(
          h('span', { class: 'fui-decklist__craft fui-num', text: `${card.craftCost}` }),
        );
      } else if (card.unique) {
        row.appendChild(h('span', { class: 'fui-decklist__unique', attrs: { title: 'Legendary' } }));
      } else {
        row.appendChild(
          h('span', { class: 'fui-decklist__copies fui-num', text: `${card.count ?? 1}` }),
        );
      }

      if (this.opts.editable) {
        const drop = h('button', {
          class: 'fui-decklist__drop',
          attrs: { type: 'button', 'aria-label': `Remove ${card.name}` },
          text: '−',
        });
        drop.addEventListener('click', () => this.remove(card.id));
        row.appendChild(drop);
      }
      this.list.appendChild(row);
    }

    if (!sorted.length) {
      this.list.appendChild(h('p', { class: 'fui-decklist__empty', text: 'No cards yet.' }));
    }

    const size = this.opts.size ?? 30;
    const have = this.count;
    this.countEl.textContent = `${have} / ${size}`;
    this.countEl.dataset.state = have === size ? 'full' : have > size ? 'over' : 'building';
    this.emit('deck:count', { have, size });

    const dust =
      this.opts.dustNeeded ??
      this.opts.cards
        .filter((c) => c.missing)
        .reduce((sum, c) => sum + (c.craftCost ?? 0) * (c.count ?? 1), 0);
    if (this.dustEl) {
      this.dustEl.textContent = dust ? `${dust} dust to complete` : '';
      this.dustEl.dataset.empty = dust ? 'off' : 'on';
    }
  }
}
