import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface ManaTrayOptions extends BaseOptions {
  /** Crystals available to spend right now. */
  available?: number;
  /** Crystals this turn, spent or not. */
  total?: number;
  /** Hard ceiling — past it a crystal cannot be gained. */
  max?: number;
  /** Crystals that vanish at end of turn, drawn with a dashed rim. */
  temporary?: number;
  /** Crystals locked by overload next turn, drawn chained. */
  overloaded?: number;
  /** Crystal size in pixels. */
  size?: number;
  /** Print `4/10` beside the crystals. */
  showCount?: boolean;
  /** Crystal colour. */
  color?: string;
  /** Cost the player is hovering, so the crystals it would take flash. */
  preview?: number;
}

/**
 * The mana tray: filled, spent, temporary and overloaded crystals, plus the
 * count. Every card game with a ramping resource needs exactly this row, and
 * every one of them has the same four states.
 *
 *   const mana = new ManaTray({ available: 4, total: 7, max: 10, overloaded: 2, showCount: true });
 *   hand.el.addEventListener('pointerover', () => mana.setPreview(card.cost));
 *   turn.on('start', () => mana.set(t.available, t.total));
 *
 * `preview` is the part games skip and players miss: hovering a 4-cost card
 * flashes the four crystals it would take, which answers "can I still play the
 * other thing" without any arithmetic. Overloaded crystals are drawn locked in
 * place rather than removed, because a player has to see the cost of last turn's
 * decision while making this turn's.
 */
export class ManaTray extends FuiComponent<ManaTrayOptions> {
  private row: HTMLElement;
  private countEl: HTMLElement | null = null;

  constructor(opts: ManaTrayOptions = {}) {
    const root = h('div', {
      class: 'fui fui-manatray',
      style: {
        '--fui-mana-size': `${opts.size ?? 22}px`,
        ...(opts.color ? { '--fui-mana-ink': opts.color } : {}),
      },
      attrs: { role: 'img' },
    });
    super(root, opts);

    this.row = h('div', { class: 'fui-manatray__row' });
    root.appendChild(this.row);

    if (opts.showCount) {
      this.countEl = h('span', { class: 'fui-manatray__count fui-num' });
      root.appendChild(this.countEl);
    }

    this.paint();
  }

  /** Set what is available and what the turn's total is. */
  set(available: number, total = this.opts.total ?? available): this {
    this.opts.available = Math.max(0, available);
    this.opts.total = Math.max(0, total);
    this.paint();
    return this;
  }

  /** Spend crystals. Returns false when there are not enough. */
  spend(cost: number): boolean {
    if ((this.opts.available ?? 0) < cost) return false;
    this.opts.available = (this.opts.available ?? 0) - cost;
    this.paint();
    this.emit('mana:spend', cost);
    return true;
  }

  /** Lock crystals for next turn. */
  setOverload(overloaded: number): this {
    this.opts.overloaded = Math.max(0, overloaded);
    this.paint();
    return this;
  }

  /** Flash the crystals a hovered card would take. Pass `0` to clear. */
  setPreview(preview: number): this {
    this.opts.preview = Math.max(0, preview);
    this.paint();
    return this;
  }

  private paint(): void {
    const o = this.opts;
    const total = o.total ?? 0;
    const available = Math.min(o.available ?? 0, total);
    const max = o.max ?? 10;
    const temp = o.temporary ?? 0;
    const overload = o.overloaded ?? 0;
    const preview = Math.min(o.preview ?? 0, available);

    clear(this.row);
    for (let i = 0; i < max; i += 1) {
      // Crystals fill left to right; the preview eats from the *right* of what
      // is available, so the ones that stay lit are the ones still spendable.
      const state =
        i >= total
          ? 'locked'
          : i < available - preview
            ? 'full'
            : i < available
              ? 'preview'
              : 'spent';
      this.row.appendChild(
        h('span', {
          class: 'fui-manatray__crystal',
          dataset: {
            state,
            temp: i >= total - temp && i < total ? 'on' : 'off',
            overload: i >= total - overload && i < total ? 'on' : 'off',
          },
        }),
      );
    }

    if (this.countEl) {
      this.countEl.textContent = `${available}/${total}`;
      this.countEl.dataset.empty = available === 0 ? 'on' : 'off';
    }
    this.el.setAttribute(
      'aria-label',
      `${available} of ${total} mana crystals available${overload ? `, ${overload} overloaded` : ''}`,
    );
  }
}
