import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp } from '../core/dom.ts';

export interface HealthPipsOptions extends BaseOptions {
  /** Filled pips. Halves are supported — 3.5 renders three and a half. */
  value: number;
  /** Total pips on the track. */
  max: number;
  /** Manifest asset id for the pip art. Defaults to the theme's heart. */
  art?: string;
  /** Pip size in pixels. */
  size?: number;
  /** Temporary pips beyond `max` — bonus hearts, shields, charges. */
  bonus?: number;
  /** Recolour the pips; the art is drawn as a mask so any colour works. */
  color?: string;
  /** Print "3 / 5" after the pips. */
  showCount?: boolean;
  /** Pulse the last remaining pip when the value is this low or lower. */
  criticalAt?: number;
  /** `heart` uses the art as a mask; `chip` draws flat capsules with no art. */
  variant?: 'heart' | 'chip';
}

/**
 * Discrete health, lives or charges — the row of hearts an action RPG uses
 * where a continuous bar would be less readable. Half values are supported,
 * and bonus pips render past the end of the track.
 *
 *   const hearts = new HealthPips({ value: 3.5, max: 5, bonus: 1, criticalAt: 1 });
 *   hearts.damage(1);   // drops to 2.5
 *
 * The art is drawn as a CSS mask, so one heart asset serves red health, blue
 * shields and gold charges without three separate images.
 */
export class HealthPips extends FuiComponent<HealthPipsOptions> {
  private value: number;
  private bonus: number;
  private track: HTMLElement;
  private countEl: HTMLElement | null = null;

  constructor(opts: HealthPipsOptions) {
    const root = h('div', {
      class: 'fui fui-pips',
      dataset: { variant: opts.variant ?? 'heart' },
      style: {
        '--fui-pip-size': `${opts.size ?? 22}px`,
        '--fui-pip-src': `var(--fui-img-${opts.art ?? 'icon-heart'})`,
        ...(opts.color ? { '--fui-pip-ink': opts.color } : {}),
      },
      attrs: {
        role: 'progressbar',
        'aria-valuemin': 0,
        'aria-valuemax': opts.max,
        'aria-valuenow': opts.value,
      },
    });
    super(root, opts);

    this.value = clamp(opts.value, 0, opts.max);
    this.bonus = Math.max(0, opts.bonus ?? 0);

    this.track = h('div', { class: 'fui-pips__track' });
    root.appendChild(this.track);

    if (opts.showCount) {
      this.countEl = h('span', { class: 'fui-pips__count fui-num' });
      root.appendChild(this.countEl);
    }
    this.paint();
  }

  get(): number {
    return this.value;
  }

  /** Take damage. Bonus pips are consumed first, then the main track. */
  damage(amount: number): this {
    const fromBonus = Math.min(this.bonus, amount);
    this.bonus -= fromBonus;
    return this.set(this.value - (amount - fromBonus));
  }

  heal(amount: number): this {
    return this.set(this.value + amount);
  }

  /** Add temporary pips past the end of the track. */
  addBonus(amount: number): this {
    this.bonus = Math.max(0, this.bonus + amount);
    this.paint();
    return this;
  }

  set(value: number, opts?: { silent?: boolean }): this {
    const was = this.value;
    this.value = clamp(value, 0, this.opts.max);
    this.paint();
    this.el.setAttribute('aria-valuenow', String(this.value));
    if (!opts?.silent) this.emit('pips:change', this.value);
    if (was > 0 && this.value === 0) this.emit('pips:empty');
    return this;
  }

  private paint(): void {
    const { max } = this.opts;
    const critical = this.opts.criticalAt != null && this.value <= this.opts.criticalAt;
    this.el.classList.toggle('is-critical', critical && this.value > 0);

    // Rebuilt rather than diffed: the count is small and bounded, and a rebuild
    // keeps half-pips and bonus pips from drifting out of sync with the value.
    const wanted = max + this.bonus;
    while (this.track.childElementCount > wanted) this.track.lastElementChild?.remove();
    while (this.track.childElementCount < wanted) {
      this.track.appendChild(h('span', { class: 'fui-pips__pip' }));
    }

    const pips = Array.from(this.track.children) as HTMLElement[];
    pips.forEach((pip, i) => {
      const isBonus = i >= max;
      pip.classList.toggle('is-bonus', isBonus);
      if (isBonus) {
        pip.dataset.fill = 'full';
        return;
      }
      const remaining = this.value - i;
      pip.dataset.fill = remaining >= 1 ? 'full' : remaining >= 0.5 ? 'half' : 'empty';
      // Only the last surviving pip pulses, so "one hit left" is unmistakable.
      pip.classList.toggle('is-last', critical && remaining > 0 && remaining <= 1);
    });

    if (this.countEl) {
      const shown = Number.isInteger(this.value) ? this.value : this.value.toFixed(1);
      this.countEl.textContent = `${shown} / ${max}${this.bonus ? ` +${this.bonus}` : ''}`;
    }
  }
}
