import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface DeckPileOptions extends BaseOptions {
  /** Cards left in the pile. */
  count?: number;
  /** Cards it started with, so the stack's depth reads as a proportion. */
  size?: number;
  /** Which pile this is. */
  kind?: 'draw' | 'discard' | 'banish';
  /** Glyph asset id for the sigil on the back. */
  sigil?: string;
  /** Card back colour. */
  color?: string;
  /** Card width in pixels. */
  width?: number;
  /** Fatigue damage taken so far. Drawing from an empty deck hurts. */
  fatigue?: number;
  /** Label under the pile. */
  label?: string;
}

/**
 * The draw pile: a stack whose depth tracks what is left in it, the count, and
 * the fatigue counter that starts once it runs out.
 *
 *   const deck = new DeckPile({ count: 17, size: 30, sigil: 'glyph-arcane-symbol', label: 'Deck' });
 *   deck.on('deck:draw', () => hand.draw(game.draw()));
 *   deck.on<number>('deck:fatigue', (dmg) => hero.damage(dmg));
 *
 * The stack is drawn as three offset layers whose spread shrinks with the count,
 * so a nearly-empty deck *looks* nearly empty before the number is read. That
 * matters more than it sounds: deck-out is a real loss condition and players who
 * only track the number notice it three turns too late.
 *
 * Once the pile is empty, `draw()` stops emitting `deck:draw` and starts
 * emitting `deck:fatigue` with an escalating number — the rule, in the
 * component, rather than in every caller that happens to remember it.
 */
export class DeckPile extends FuiComponent<DeckPileOptions> {
  private countEl: HTMLElement;
  private fatigueEl: HTMLElement | null = null;

  constructor(opts: DeckPileOptions = {}) {
    const root = h('button', {
      class: 'fui fui-deckpile',
      dataset: { kind: opts.kind ?? 'draw', empty: (opts.count ?? 0) <= 0 ? 'on' : 'off' },
      style: {
        '--fui-deck-w': `${opts.width ?? 84}px`,
        ...(opts.color ? { '--fui-deck-ink': opts.color } : {}),
        ...(opts.sigil ? { '--fui-deck-sigil': `var(--fui-img-${opts.sigil})` } : {}),
      },
      attrs: { type: 'button', 'aria-label': `${opts.label ?? 'Deck'}, ${opts.count ?? 0} cards` },
    });
    super(root, opts);

    const stack = h('span', { class: 'fui-deckpile__stack', attrs: { 'aria-hidden': 'true' } });
    for (let i = 0; i < 3; i += 1) {
      stack.appendChild(h('span', { class: 'fui-deckpile__layer', style: { '--fui-deck-i': String(i) } }));
    }
    root.appendChild(stack);

    this.countEl = h('span', { class: 'fui-deckpile__count fui-num', text: String(opts.count ?? 0) });
    root.appendChild(this.countEl);

    if (opts.fatigue) {
      this.fatigueEl = h('span', { class: 'fui-deckpile__fatigue fui-num', text: `−${opts.fatigue}` });
      root.appendChild(this.fatigueEl);
    }

    if (opts.label) root.appendChild(h('span', { class: 'fui-deckpile__label', text: opts.label }));

    root.addEventListener('click', () => this.draw());
    this.paint();
  }

  /**
   * Take a card. Emits `deck:draw` while there are cards, and `deck:fatigue`
   * with an escalating number once there are not — the rule lives here rather
   * than in every caller that happens to remember it.
   */
  draw(): this {
    const left = this.opts.count ?? 0;
    if (left > 0) {
      this.setCount(left - 1);
      this.emit('deck:draw', left - 1);
      return this;
    }
    this.opts.fatigue = (this.opts.fatigue ?? 0) + 1;
    this.paint();
    this.el.dataset.hurt = 'on';
    void this.el.offsetWidth;
    this.el.dataset.hurt = 'off';
    this.emit('deck:fatigue', this.opts.fatigue);
    return this;
  }

  /** Set how many cards are left. */
  setCount(count: number): this {
    this.opts.count = Math.max(0, count);
    this.paint();
    return this;
  }

  /** Put a card back, e.g. a shuffle effect. */
  add(n = 1): this {
    return this.setCount((this.opts.count ?? 0) + n);
  }

  private paint(): void {
    const count = this.opts.count ?? 0;
    const size = this.opts.size ?? Math.max(count, 30);
    this.countEl.textContent = String(count);
    // Fill drives the stack's depth, so a nearly-empty deck *looks* nearly
    // empty. Deck-out is a real loss condition and a number alone gets noticed
    // three turns too late.
    this.el.style.setProperty('--fui-deck-fill', String(size ? Math.min(1, count / size) : 0));
    this.el.dataset.empty = count <= 0 ? 'on' : 'off';
    this.el.dataset.low = count > 0 && count <= 5 ? 'on' : 'off';

    if (this.opts.fatigue) {
      if (!this.fatigueEl) {
        this.fatigueEl = h('span', { class: 'fui-deckpile__fatigue fui-num' });
        this.el.appendChild(this.fatigueEl);
      }
      this.fatigueEl.textContent = `−${this.opts.fatigue}`;
    }
    this.el.setAttribute(
      'aria-label',
      `${this.opts.label ?? 'Deck'}, ${count} cards${this.opts.fatigue ? `, fatigue ${this.opts.fatigue}` : ''}`,
    );
  }
}
