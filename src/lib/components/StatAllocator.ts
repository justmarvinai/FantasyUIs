import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp, commas } from '../core/dom.ts';

export interface Attribute {
  id: string;
  label: string;
  /** Where this attribute starts — race, class, gear. Cannot be spent down past it. */
  base?: number;
  /** Points already put in. */
  spent?: number;
  /** Cap for the total. */
  max?: number;
  /** Glyph asset id for the row. */
  glyph?: string;
  /** Accent colour. */
  color?: string;
  /** What it does, shown under the name. */
  note?: string;
  /** Derived stats this attribute feeds, e.g. `[{ label: 'Melee damage', per: 2.4 }]`. */
  derives?: Array<{ label: string; per: number; suffix?: string }>;
}

export interface StatAllocatorOptions extends BaseOptions {
  /** The attributes points can be spent on. */
  attributes: Attribute[];
  /** Points the player has left to spend. */
  points: number;
  /** Heading over the sheet. */
  title?: string;
  /** Points each step spends. */
  step?: number;
  /** Offer the reset button. */
  resettable?: boolean;
  /** Label on the commit button. Omit for a live sheet with no commit step. */
  action?: string;
}

/**
 * The point-buy sheet: attributes, the pool left to spend, and what each point
 * actually buys. Character creation, respec, paragon levels, gear-free
 * progression.
 *
 *   const sheet = new StatAllocator({
 *     title: 'Attributes', points: 12, resettable: true, action: 'Confirm',
 *     attributes: [
 *       { id: 'str', label: 'Strength', base: 10, glyph: 'glyph-fist-punch',
 *         derives: [{ label: 'Melee damage', per: 2.4 }] },
 *       { id: 'agi', label: 'Agility', base: 8, max: 20, color: '#4bbf5c' },
 *     ],
 *   });
 *   sheet.on<Record<string, number>>('stats:commit', (spend) => hero.apply(spend));
 *
 * Every row shows what the next point *buys*, not just what the number is — a
 * sheet that only counts points makes the player do the arithmetic the game
 * already knows. Nothing can be spent below its base, and the plus button dies
 * when the pool is empty or the cap is reached, with the reason on the tooltip.
 */
export class StatAllocator extends FuiComponent<StatAllocatorOptions> {
  private list: HTMLElement;
  private poolEl: HTMLElement;
  private start: Map<string, number>;

  constructor(opts: StatAllocatorOptions) {
    const root = h('div', { class: 'fui fui-alloc' });
    super(root, opts);
    // The starting spend is what `reset()` returns to, so a respec screen can
    // be opened with points already committed.
    this.start = new Map(opts.attributes.map((a) => [a.id, a.spent ?? 0]));

    const head = h('div', { class: 'fui-alloc__head' });
    if (opts.title) {
      head.appendChild(h('span', { class: 'fui-alloc__title fui-title', text: opts.title }));
    }
    this.poolEl = h('span', { class: 'fui-alloc__pool fui-num' });
    head.appendChild(this.poolEl);
    if (opts.resettable) {
      const reset = h('button', {
        class: 'fui-alloc__reset',
        text: 'Reset',
        attrs: { type: 'button' },
      });
      reset.addEventListener('click', () => this.reset());
      head.appendChild(reset);
    }
    root.appendChild(head);

    this.list = h('div', { class: 'fui-alloc__list' });
    root.appendChild(this.list);

    if (opts.action) {
      const commit = h('button', {
        class: 'fui-alloc__commit',
        text: opts.action,
        attrs: { type: 'button' },
      });
      commit.addEventListener('click', () => this.emit('stats:commit', this.spend()));
      root.appendChild(commit);
    }
    this.render();
  }

  /** Points still unspent. */
  remaining(): number {
    const used = this.opts.attributes.reduce((n, a) => n + ((a.spent ?? 0) - (this.start.get(a.id) ?? 0)), 0);
    return this.opts.points - used;
  }

  /** What each attribute totals, base plus spend. */
  totals(): Record<string, number> {
    return Object.fromEntries(this.opts.attributes.map((a) => [a.id, (a.base ?? 0) + (a.spent ?? 0)]));
  }

  /** Points put into each attribute. */
  spend(): Record<string, number> {
    return Object.fromEntries(this.opts.attributes.map((a) => [a.id, a.spent ?? 0]));
  }

  /** Move points in or out of one attribute. */
  adjust(id: string, by: number): this {
    const attr = this.opts.attributes.find((a) => a.id === id);
    if (!attr) return this;
    const floor = this.start.get(id) ?? 0;
    const ceiling =
      attr.max != null ? Math.max(floor, attr.max - (attr.base ?? 0)) : Number.POSITIVE_INFINITY;
    const want = clamp((attr.spent ?? 0) + by, floor, ceiling);
    const cost = want - (attr.spent ?? 0);
    if (cost > this.remaining()) return this;
    if (cost === 0) return this;
    attr.spent = want;
    this.render();
    this.emit('stats:change', { id, total: (attr.base ?? 0) + want, remaining: this.remaining() });
    return this;
  }

  /** Put every point back in the pool. */
  reset(): this {
    for (const a of this.opts.attributes) a.spent = this.start.get(a.id) ?? 0;
    this.render();
    this.emit('stats:reset');
    return this;
  }

  private render(): void {
    clear(this.list);
    const left = this.remaining();
    this.poolEl.textContent = `${commas(left)} ${left === 1 ? 'point' : 'points'} left`;
    this.el.dataset.spent = String(left <= 0);

    for (const attr of this.opts.attributes) {
      const floor = this.start.get(attr.id) ?? 0;
      const total = (attr.base ?? 0) + (attr.spent ?? 0);
      const capped = attr.max != null && total >= attr.max;
      const row = h('div', {
        class: 'fui-alloc__row',
        style: attr.color ? { '--fui-alloc-ink': attr.color } : {},
      });

      if (attr.glyph) {
        row.appendChild(
          h('span', {
            class: 'fui-alloc__glyph',
            style: { '--fui-glyph-src': `var(--fui-img-${attr.glyph})` },
          }),
        );
      }

      const text = h('div', { class: 'fui-alloc__text' });
      text.appendChild(h('span', { class: 'fui-alloc__name', text: attr.label }));
      // What the next point buys, not just what the number is.
      const bits: string[] = [];
      if (attr.note) bits.push(attr.note);
      for (const derived of attr.derives ?? []) {
        bits.push(
          `${derived.label} ${(total * derived.per).toFixed(derived.per % 1 ? 1 : 0)}${derived.suffix ?? ''} (+${derived.per}${derived.suffix ?? ''} per point)`,
        );
      }
      if (bits.length) {
        text.appendChild(h('span', { class: 'fui-alloc__note', text: bits.join('  ·  ') }));
      }
      row.appendChild(text);

      const stepper = h('div', { class: 'fui-alloc__stepper' });
      const minus = h('button', {
        class: 'fui-alloc__step fui-alloc__step--down',
        attrs: {
          type: 'button',
          'aria-label': `Lower ${attr.label}`,
          disabled: (attr.spent ?? 0) <= floor || undefined,
          title: (attr.spent ?? 0) <= floor ? 'Nothing of yours is invested here' : undefined,
        },
      });
      minus.addEventListener('click', () => this.adjust(attr.id, -(this.opts.step ?? 1)));

      const value = h('span', { class: 'fui-alloc__value fui-num' });
      value.appendChild(h('span', { class: 'fui-alloc__total', text: String(total) }));
      if ((attr.spent ?? 0) > floor) {
        value.appendChild(
          h('span', { class: 'fui-alloc__added', text: `+${(attr.spent ?? 0) - floor}` }),
        );
      }

      const plus = h('button', {
        class: 'fui-alloc__step fui-alloc__step--up',
        attrs: {
          type: 'button',
          'aria-label': `Raise ${attr.label}`,
          disabled: left <= 0 || capped || undefined,
          // A dead button says why, which is the whole difference between a
          // sheet a player can plan with and one they poke at.
          title: capped ? `Capped at ${attr.max}` : left <= 0 ? 'No points left' : undefined,
        },
      });
      plus.addEventListener('click', () => this.adjust(attr.id, this.opts.step ?? 1));

      stepper.append(minus, value, plus);
      row.appendChild(stepper);
      this.list.appendChild(row);
    }
  }
}
