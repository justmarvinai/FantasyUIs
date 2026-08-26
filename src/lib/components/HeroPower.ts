import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface HeroPowerOptions extends BaseOptions {
  /** What it does, for the tooltip. */
  name: string;
  /** Rules text, shown on hover. */
  text?: string;
  /** Mana cost. */
  cost?: number;
  /** Glyph asset id for the symbol. */
  glyph?: string;
  /** Painted icon asset id, drawn as art instead of a tinted glyph. */
  art?: string;
  /** Already used this turn. */
  used?: boolean;
  /** Mana available, so it dims when unaffordable. */
  mana?: number;
  /** Upgraded — the golden treatment. */
  upgraded?: boolean;
  /** Diameter in pixels. */
  size?: number;
  /** Class colour. */
  color?: string;
}

/**
 * The hero power: one button, once a turn, for two mana. It sits beside the
 * hero and is the only thing on the board that is always available and always
 * the same.
 *
 *   const power = new HeroPower({
 *     name: 'Lifetap', text: 'Draw a card and take *2* damage.',
 *     cost: 2, glyph: 'glyph-spell-book', mana: 5,
 *   });
 *   power.on('power:use', () => { game.heroPower(); power.setUsed(true); });
 *   turn.on('start', () => power.setUsed(false));
 *
 * The button refuses the press itself when it is used or unaffordable and says
 * which — those are different problems with different fixes, and a single grey
 * circle tells a player neither. `used` is the one that persists to end of turn,
 * so it is drawn as a chain over the art rather than as a dim: a chained power
 * reads as "not until next turn" where a faded one reads as "broken".
 */
export class HeroPower extends FuiComponent<HeroPowerOptions> {
  constructor(opts: HeroPowerOptions) {
    const root = h('button', {
      class: 'fui fui-heropower',
      dataset: {
        used: opts.used ? 'on' : 'off',
        upgraded: opts.upgraded ? 'on' : 'off',
      },
      style: {
        '--fui-power-size': `${opts.size ?? 78}px`,
        ...(opts.color ? { '--fui-power-ink': opts.color } : {}),
        ...(opts.glyph ? { '--fui-power-glyph': `var(--fui-img-${opts.glyph})` } : {}),
        ...(opts.art ? { '--fui-power-art': `var(--fui-img-${opts.art})` } : {}),
      },
      attrs: { type: 'button', 'aria-label': `${opts.name}, ${opts.cost ?? 2} mana hero power` },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-heropower__rim', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(
      h('span', {
        class: 'fui-heropower__face',
        dataset: { kind: opts.art ? 'art' : 'glyph' },
        attrs: { 'aria-hidden': 'true' },
      }),
    );
    root.appendChild(h('span', { class: 'fui-heropower__chain', attrs: { 'aria-hidden': 'true' } }));

    if (opts.cost != null) {
      root.appendChild(h('span', { class: 'fui-heropower__cost fui-num', text: String(opts.cost) }));
    }

    const tip = h('div', { class: 'fui-heropower__tip', attrs: { role: 'tooltip' } });
    tip.appendChild(h('span', { class: 'fui-heropower__tipname', text: opts.name }));
    if (opts.text) tip.appendChild(h('p', { class: 'fui-heropower__tiptext', text: opts.text.replace(/\*/g, '') }));
    root.appendChild(tip);

    root.addEventListener('click', (ev) => {
      const reason = this.why();
      if (reason) {
        ev.stopImmediatePropagation();
        this.el.dataset.refused = 'on';
        void this.el.offsetWidth;
        this.el.dataset.refused = 'off';
        this.emit('power:refused', reason);
        return;
      }
      this.emit('power:use', opts.name);
    });

    this.paint();
  }

  /** Mark it used for the rest of the turn, or free it at turn start. */
  setUsed(used: boolean): this {
    this.opts.used = used;
    this.paint();
    return this;
  }

  /** Update available mana. */
  setMana(mana: number): this {
    this.opts.mana = mana;
    this.paint();
    return this;
  }

  /** Why the press will be refused, or null. */
  why(): string | null {
    if (this.opts.used) return 'Already used this turn';
    if (this.opts.mana != null && this.opts.mana < (this.opts.cost ?? 2)) return 'Not enough mana';
    return null;
  }

  private paint(): void {
    const reason = this.why();
    this.el.dataset.used = this.opts.used ? 'on' : 'off';
    this.el.dataset.state = reason ? (this.opts.used ? 'used' : 'poor') : 'ready';
    this.el.setAttribute(
      'title',
      reason ? `${this.opts.name} — ${reason}` : this.opts.name,
    );
    this.el.setAttribute('aria-disabled', String(!!reason));
  }
}
