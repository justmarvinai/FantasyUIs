import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp } from '../core/dom.ts';
import { PlayingCard, type PlayingCardOptions } from './PlayingCard.ts';

export interface CardHandOptions extends BaseOptions {
  /** The cards, left to right. */
  cards: PlayingCardOptions[];
  /** Card width in pixels. The arc scales from it. */
  size?: number;
  /** How far the fan bends, in degrees across the whole hand. */
  spread?: number;
  /** How far the ends drop below the middle, in pixels. */
  arc?: number;
  /** Mana available, so unaffordable cards dim themselves. */
  mana?: number;
  /** Hand limit. Past it the count turns red. */
  limit?: number;
  /** Draw the opponent's hand: backs only, tighter, no hover. */
  facedown?: boolean;
  /** Show the card count beside the fan. */
  showCount?: boolean;
}

/**
 * The fan of cards in hand. Cards arc, rotate and drop toward the ends, lift on
 * hover, and dim when they cost more mana than you have.
 *
 *   const hand = new CardHand({ cards, size: 130, mana: 6, limit: 10, showCount: true });
 *   hand.on<number>('hand:play', (i) => board.play(hand.take(i)));
 *   turn.on('mana', (m) => hand.setMana(m));
 *
 * The fan is computed rather than authored: each card's rotation and vertical
 * offset come from its position across the spread, so a three-card hand and a
 * ten-card hand both look deliberate and neither needs a magic number. Cards
 * overlap by a fraction of their width that *shrinks as the hand grows*, which
 * is the trick that keeps ten cards inside the same box as five without ever
 * hiding a mana gem — the one corner a player has to read on every card.
 *
 * Affordability lives here, not on the card: a hand knows the mana, a card does
 * not, and pushing `playable` down from one place means it can never disagree
 * between two cards.
 */
export class CardHand extends FuiComponent<CardHandOptions> {
  private fan: HTMLElement;
  private countEl: HTMLElement | null = null;
  private cards: PlayingCard[] = [];
  private fit: ResizeObserver | null = null;

  constructor(opts: CardHandOptions) {
    const root = h('div', {
      class: 'fui fui-hand',
      dataset: { facedown: opts.facedown ? 'on' : 'off' },
      style: { '--fui-hand-size': `${opts.size ?? 130}px` },
    });
    super(root, opts);

    this.fan = h('div', { class: 'fui-hand__fan' });
    root.appendChild(this.fan);

    if (opts.showCount) {
      this.countEl = h('span', { class: 'fui-hand__count fui-num' });
      root.appendChild(this.countEl);
    }

    this.build();
  }

  /** Replace the hand. */
  setCards(cards: PlayingCardOptions[]): this {
    this.opts.cards = cards;
    this.build();
    return this;
  }

  /** Add a card to the right-hand end, animating it in. */
  draw(card: PlayingCardOptions): this {
    this.opts.cards = [...this.opts.cards, card];
    this.build();
    (this.fan.lastElementChild as HTMLElement | null)?.classList.add('is-drawn');
    this.emit('hand:draw', card);
    return this;
  }

  /** Remove the card at `index` and return its options. */
  take(index: number): PlayingCardOptions | undefined {
    const card = this.opts.cards[index];
    if (!card) return undefined;
    this.opts.cards = this.opts.cards.filter((_, i) => i !== index);
    this.build();
    return card;
  }

  /** Update available mana; every card re-decides whether it is playable. */
  setMana(mana: number): this {
    this.opts.mana = mana;
    this.opts.cards.forEach((card, i) => {
      this.cards[i]?.setPlayable(this.affordable(card));
    });
    return this;
  }

  /**
   * Correct the reserve from what actually rendered. The calculation in
   * `build()` only knows about the card's own box, and a card's stat gems hang
   * below it — so the approximation ships in the pre-rendered markup and the
   * measured number replaces it as soon as there is a layout to measure.
   */
  private measure(): void {
    const view = this.el.ownerDocument.defaultView;
    if (!view?.requestAnimationFrame || typeof view.ResizeObserver !== 'function') return;

    // Measured against the *content* box rather than the padded one, so the
    // answer does not depend on the reserve currently in force. An iterative
    // version settles on whatever the fan happened to look like on the frame it
    // first ran — which, on mount, is mid-transition and short.
    const correct = (): void => {
      const pad = parseFloat(view.getComputedStyle(this.el).paddingBottom) || 0;
      const floor = this.el.getBoundingClientRect().bottom - pad;
      // Every descendant, not just the slots: a card's stat gems are absolutely
      // positioned past its own bottom edge, and a bounding rect stops at the
      // element's border box rather than at what overflows it.
      let lowest = floor;
      for (const node of this.el.querySelectorAll('*')) {
        lowest = Math.max(lowest, node.getBoundingClientRect().bottom);
      }
      const want = Math.ceil(lowest - floor);
      if (Math.abs(want - pad) > 0.5) this.el.style.setProperty('--fui-hand-drop', `${want}px`);
    };

    // Three chances to be right: on mount, whenever the box changes, and when
    // the deal-in transition finishes — the cards only reach their full
    // rotation at the end of it, and that is the pose that has to fit.
    const raf = view.requestAnimationFrame(correct);
    this.onDestroy(() => view.cancelAnimationFrame(raf));
    this.el.addEventListener('transitionend', correct);
    this.onDestroy(() => this.el.removeEventListener('transitionend', correct));
    if (!this.fit) {
      this.fit = new view.ResizeObserver(correct);
      this.fit.observe(this.el);
      this.onDestroy(() => this.fit?.disconnect());
    }
  }

  private affordable(card: PlayingCardOptions): boolean {
    return this.opts.mana == null || (card.cost ?? 0) <= this.opts.mana;
  }

  private build(): void {
    clear(this.fan);
    this.cards = [];

    const list = this.opts.cards;
    const n = list.length;
    const spread = this.opts.spread ?? 26;
    const arc = this.opts.arc ?? 22;
    // Overlap tightens as the hand grows, so ten cards fit the same box as five
    // without ever covering a mana gem.
    const overlap = clamp(0.52 - Math.max(0, n - 5) * 0.04, 0.22, 0.52);
    this.el.style.setProperty('--fui-hand-overlap', String(overlap));

    // Transforms do not grow the layout box, so the fan hangs below the
    // container by however far the arc and the rotation carry the end cards —
    // and any stage that clips its overflow cuts them off. The reserve starts
    // from the geometry: the slots pivot 20% below their own bottom edge, so
    // the outermost card's far corner swings down by the difference between the
    // corner's resting depth and its rotated one.
    const size = this.opts.size ?? 130;
    const pivot = size * 1.4 * 0.2;
    const corner = Math.hypot(size / 2, pivot);
    const rest = Math.atan2(size / 2, pivot);
    const swing = Math.abs(spread / 2) * (Math.PI / 180);
    const drop = corner * Math.cos(Math.max(0, rest - swing)) - pivot;
    this.el.style.setProperty('--fui-hand-drop', `${Math.ceil(arc + drop)}px`);
    this.measure();

    list.forEach((card, i) => {
      // −1 at the left end, +1 at the right, 0 for a single card.
      const t = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;
      const slot = h('div', {
        class: 'fui-hand__slot',
        style: {
          '--fui-hand-rot': `${(t * spread) / 2}deg`,
          '--fui-hand-lift': `${t * t * arc}px`,
          zIndex: String(i + 1),
        },
      });

      const built = new PlayingCard({
        ...card,
        width: this.opts.size ?? 130,
        faceDown: this.opts.facedown || card.faceDown,
        playable: this.opts.facedown ? false : this.affordable(card),
      });
      built.on('card:play', () => this.emit('hand:play', i));
      this.cards.push(built);
      slot.appendChild(built.el);
      this.fan.appendChild(slot);
    });

    if (this.countEl) {
      const limit = this.opts.limit;
      this.countEl.textContent = limit != null ? `${n} / ${limit}` : String(n);
      this.countEl.dataset.full = limit != null && n >= limit ? 'on' : 'off';
    }
  }
}
