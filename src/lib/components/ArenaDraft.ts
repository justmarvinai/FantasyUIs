import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';
import { PlayingCard, type PlayingCardOptions } from './PlayingCard.ts';

export interface ArenaDraftOptions extends BaseOptions {
  /** The three cards on offer. */
  choices: PlayingCardOptions[];
  /** Which pick this is, 1-based. */
  pick?: number;
  /** How many picks the run has. */
  picks?: number;
  /** Wins so far this run. */
  wins?: number;
  /** Losses so far. */
  losses?: number;
  /** Losses allowed before the run ends. */
  maxLosses?: number;
  /** Cards taken so far, newest last — the running deck. */
  taken?: { name: string; cost: number }[];
  /** Card width in pixels. */
  size?: number;
  /** Heading. */
  title?: string;
}

/**
 * The arena draft: three cards, pick one, thirty times. Alongside them, the run
 * record and the deck taking shape — because a draft pick is only ever right
 * relative to what you already took.
 *
 *   const draft = new ArenaDraft({
 *     choices: three, pick: 12, picks: 30, wins: 4, losses: 1, maxLosses: 3, taken: sofar,
 *   });
 *   draft.on<{ card: PlayingCardOptions; pick: number }>('draft:pick', ({ card }) => run.take(card));
 *
 * The curve of what you have taken is shown as a strip beside the choices rather
 * than on another screen. Pick 12 with six two-drops already is a different
 * decision from pick 12 with none, and a drafter who has to remember that makes
 * worse decks — which is exactly the mistake the format is built to punish.
 *
 * The run record sits in the header with losses counted *against the cap*, so
 * "1 loss" and "1 of 3 losses" are the same glance.
 */
export class ArenaDraft extends FuiComponent<ArenaDraftOptions> {
  private tray: HTMLElement;
  private pickEl: HTMLElement;
  private recordEl: HTMLElement | null = null;
  private curveEl: HTMLElement;

  constructor(opts: ArenaDraftOptions) {
    const root = h('div', {
      class: 'fui fui-arenadraft',
      style: { '--fui-draft-size': `${opts.size ?? 175}px` },
    });
    super(root, opts);

    const head = h('div', { class: 'fui-arenadraft__head' });
    head.appendChild(h('h3', { class: 'fui-arenadraft__title', text: opts.title ?? 'Choose a card' }));
    this.pickEl = h('span', { class: 'fui-arenadraft__pick fui-num' });
    head.appendChild(this.pickEl);
    if (opts.wins != null || opts.losses != null) {
      this.recordEl = h('span', { class: 'fui-arenadraft__record fui-num' });
      head.appendChild(this.recordEl);
    }
    root.appendChild(head);

    const cols = h('div', { class: 'fui-arenadraft__cols' });
    this.tray = h('div', { class: 'fui-arenadraft__tray' });
    cols.appendChild(this.tray);
    this.curveEl = h('div', { class: 'fui-arenadraft__curve' });
    cols.appendChild(this.curveEl);
    root.appendChild(cols);

    this.build();
  }

  /** Offer the next three cards and advance the pick counter. */
  offer(choices: PlayingCardOptions[]): this {
    this.opts.choices = choices;
    this.opts.pick = (this.opts.pick ?? 1) + 1;
    this.build();
    return this;
  }

  /** Take one of the three. */
  pick(index: number): this {
    const card = this.opts.choices[index];
    if (!card) return this;
    this.opts.taken = [
      ...(this.opts.taken ?? []),
      { name: card.name, cost: card.cost ?? 0 },
    ];
    this.build();
    this.emit('draft:pick', { card, pick: this.opts.pick ?? 1, index });
    return this;
  }

  /** Cards taken so far, per mana cost — ready for `ManaCurve`. */
  curve(cap = 7): number[] {
    const buckets = new Array(cap + 1).fill(0);
    for (const card of this.opts.taken ?? []) buckets[Math.min(card.cost, cap)] += 1;
    return buckets;
  }

  private build(): void {
    const o = this.opts;
    this.pickEl.textContent = `Pick ${o.pick ?? 1} of ${o.picks ?? 30}`;

    if (this.recordEl) {
      const losses = o.losses ?? 0;
      const cap = o.maxLosses ?? 3;
      // Losses against the cap, so "1 loss" and "1 of 3" are one glance.
      this.recordEl.textContent = `${o.wins ?? 0}W · ${losses}/${cap}L`;
      this.recordEl.dataset.risk = losses >= cap - 1 ? 'on' : 'off';
    }

    clear(this.tray);
    o.choices.forEach((choice, i) => {
      const slot = h('div', { class: 'fui-arenadraft__slot', style: { '--fui-draft-i': String(i) } });
      const card = new PlayingCard({ ...choice, width: o.size ?? 175, playable: true });
      card.on('card:play', () => this.pick(i));
      slot.appendChild(card.el);
      this.tray.appendChild(slot);
    });

    // The curve of what is already taken, beside the choices — pick 12 with six
    // two-drops is a different decision from pick 12 with none.
    clear(this.curveEl);
    this.curveEl.appendChild(
      h('span', { class: 'fui-arenadraft__curvetitle', text: 'Your curve' }),
    );
    const counts = this.curve();
    const peak = Math.max(1, ...counts);
    const chart = h('div', { class: 'fui-arenadraft__chart' });
    counts.forEach((n, cost) => {
      const col = h('div', {
        class: 'fui-arenadraft__col',
        attrs: { title: `${n} at ${cost}${cost >= 7 ? '+' : ''} mana` },
      });
      col.appendChild(h('span', { class: 'fui-arenadraft__bar', style: { height: `${(n / peak) * 100}%` } }));
      col.appendChild(
        h('span', { class: 'fui-arenadraft__costlabel fui-num', text: `${cost}${cost >= 7 ? '+' : ''}` }),
      );
      chart.appendChild(col);
    });
    this.curveEl.appendChild(chart);
    this.curveEl.appendChild(
      h('span', {
        class: 'fui-arenadraft__taken fui-num',
        text: `${(this.opts.taken ?? []).length} cards taken`,
      }),
    );
  }
}
