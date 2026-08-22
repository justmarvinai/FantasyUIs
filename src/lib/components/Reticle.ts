import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp } from '../core/dom.ts';

export interface ReticleOptions extends BaseOptions {
  /** Crosshair shape. */
  variant?: 'cross' | 'brackets' | 'ring' | 'arc';
  /** How locked on it is, 0–1. Drives the closing animation. */
  lock?: number;
  /** Odds of the shot landing, 0–1. Printed and colours the reticle. */
  chance?: number;
  /** Distance readout, e.g. `'24 m'`. */
  range?: string;
  /** Name of what is under it. */
  target?: string;
  /** Size in pixels. */
  size?: number;
  /** State the reticle is in. */
  state?: 'idle' | 'tracking' | 'locked' | 'blocked' | 'reloading';
  /** Spread, 0–1 — how far the arms sit from the centre while moving. */
  spread?: number;
  /** Colour, overriding the state's. */
  color?: string;
  /** Pin it over a point in viewport coordinates. */
  at?: { x: number; y: number };
}

/**
 * The crosshair a ranged game aims through: spread that opens while you move,
 * a lock that closes on a target, and the hit chance that decides whether the
 * shot is worth taking.
 *
 *   const aim = new Reticle({
 *     variant: 'brackets', state: 'tracking', size: 120,
 *     target: 'Bog Warden', range: '24 m', chance: 0.72, lock: 0.4, spread: 0.3,
 *   });
 *   onAimAt((t) => aim.track(t.name, t.chance).setLock(t.lock));
 *
 * Spread and lock are separate numbers because they say opposite things: spread
 * is how badly the shot will scatter, lock is how ready it is. Folding them
 * into one bar — the mistake that makes an aiming HUD unreadable — would hide
 * the case that matters, which is locked on and still inaccurate.
 */
export class Reticle extends FuiComponent<ReticleOptions> {
  private chanceEl: HTMLElement | null = null;
  private targetEl: HTMLElement | null = null;
  private rangeEl: HTMLElement | null = null;

  constructor(opts: ReticleOptions = {}) {
    const root = h('div', {
      class: 'fui fui-reticle',
      dataset: { variant: opts.variant ?? 'cross', state: opts.state ?? 'idle' },
      style: {
        '--fui-reticle-size': `${opts.size ?? 120}px`,
        '--fui-reticle-lock': String(clamp(opts.lock ?? 0, 0, 1)),
        '--fui-reticle-spread': String(clamp(opts.spread ?? 0.2, 0, 1)),
        ...(opts.color ? { '--fui-reticle-ink': opts.color } : {}),
        ...(opts.at ? { left: `${opts.at.x}px`, top: `${opts.at.y}px` } : {}),
      },
      attrs: { 'aria-hidden': 'true' },
    });
    if (opts.at) root.classList.add('is-pinned');
    super(root, opts);

    // Four arms rather than two crossed lines: each can move outward on its own
    // axis, which is what makes spread read as spread.
    for (const side of ['n', 'e', 's', 'w'] as const) {
      root.appendChild(h('span', { class: `fui-reticle__arm fui-reticle__arm--${side}` }));
    }
    root.appendChild(h('span', { class: 'fui-reticle__ring' }));
    root.appendChild(h('span', { class: 'fui-reticle__lock' }));
    root.appendChild(h('span', { class: 'fui-reticle__dot' }));

    if (opts.target || opts.chance != null || opts.range) {
      const info = h('div', { class: 'fui-reticle__info' });
      this.targetEl = h('span', { class: 'fui-reticle__target', text: opts.target ?? '' });
      info.appendChild(this.targetEl);
      const line = h('div', { class: 'fui-reticle__line' });
      this.chanceEl = h('span', { class: 'fui-reticle__chance fui-num' });
      this.rangeEl = h('span', { class: 'fui-reticle__range fui-num', text: opts.range ?? '' });
      line.append(this.chanceEl, this.rangeEl);
      info.appendChild(line);
      root.appendChild(info);
      this.paintChance();
    }
  }

  /** How locked on, 0–1. */
  setLock(lock: number): this {
    this.opts.lock = clamp(lock, 0, 1);
    this.el.style.setProperty('--fui-reticle-lock', String(this.opts.lock));
    if (this.opts.lock >= 1) this.setState('locked');
    return this;
  }

  /** How far the shot will scatter, 0–1. */
  setSpread(spread: number): this {
    this.opts.spread = clamp(spread, 0, 1);
    this.el.style.setProperty('--fui-reticle-spread', String(this.opts.spread));
    return this;
  }

  /** Point it at something and say what the shot is worth. */
  track(target: string, chance?: number, range?: string): this {
    this.opts.target = target;
    if (chance != null) this.opts.chance = clamp(chance, 0, 1);
    if (range != null) this.opts.range = range;
    if (this.targetEl) this.targetEl.textContent = target;
    if (this.rangeEl && range != null) this.rangeEl.textContent = range;
    this.paintChance();
    if ((this.opts.state ?? 'idle') === 'idle') this.setState('tracking');
    return this;
  }

  /** Change what the reticle is doing. */
  setState(state: NonNullable<ReticleOptions['state']>): this {
    this.opts.state = state;
    this.el.dataset.state = state;
    this.emit('aim:state', state);
    return this;
  }

  /** Clear the target and go back to idle. */
  release(): this {
    this.opts.target = undefined;
    this.opts.chance = undefined;
    if (this.targetEl) this.targetEl.textContent = '';
    if (this.chanceEl) this.chanceEl.textContent = '';
    this.setLock(0);
    return this.setState('idle');
  }

  private paintChance(): void {
    if (!this.chanceEl) return;
    const chance = this.opts.chance;
    this.chanceEl.textContent = chance == null ? '' : `${Math.round(chance * 100)}%`;
    // A hit chance is only useful if the colour agrees with the number.
    this.chanceEl.dataset.odds =
      chance == null ? '' : chance >= 0.75 ? 'good' : chance >= 0.4 ? 'fair' : 'poor';
  }
}
