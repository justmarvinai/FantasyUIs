import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp, commas } from '../core/dom.ts';

export interface ComboTier {
  /** Hit count at which this tier starts. */
  at: number;
  /** Rank shown beside the number — "GOOD", "GREAT", "INSANE". */
  label: string;
  color?: string;
}

export interface ComboCounterOptions extends BaseOptions {
  /** Hits so far. */
  value?: number;
  /** Ranks, lowest `at` first. */
  tiers?: ComboTier[];
  /** Milliseconds of inactivity before the combo drops. 0 disables the timer. */
  decay?: number;
  /** Word after the number. */
  suffix?: string;
  /** Font size of the combo number in pixels. Rank and suffix scale from it. */
  size?: number;
  /** Show the decay timer as a draining underline. */
  showTimer?: boolean;
}

const DEFAULT_TIERS: ComboTier[] = [
  { at: 0, label: 'Combo', color: 'var(--fui-ink-dim)' },
  { at: 5, label: 'Good', color: 'var(--fui-accent)' },
  { at: 12, label: 'Great', color: 'var(--fui-gold)' },
  { at: 25, label: 'Savage', color: 'var(--fui-rarity-legendary)' },
  { at: 50, label: 'Unreal', color: 'var(--fui-rarity-epic)' },
];

/**
 * The hit-chain readout: a number that punches on every hit, a rank that climbs
 * as the chain grows, and a decay timer that drops it if the player stops.
 *
 *   const combo = new ComboCounter({ decay: 2500, showTimer: true });
 *   onHit(() => combo.hit());
 *
 * The decay timer is the part that makes it a mechanic rather than a label —
 * `hit()` restarts it, and `combo:drop` fires when the chain expires.
 */
export class ComboCounter extends FuiComponent<ComboCounterOptions> {
  private value: number;
  private numberEl: HTMLElement;
  private rankEl: HTMLElement;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private tiers: ComboTier[];

  constructor(opts: ComboCounterOptions = {}) {
    const root = h('div', {
      class: 'fui fui-combo',
      style: {
        '--fui-combo-size': `${opts.size ?? 44}px`,
        ...(opts.decay ? { '--fui-combo-decay': `${opts.decay}ms` } : {}),
      },
    });
    super(root, opts);

    this.tiers = [...(opts.tiers ?? DEFAULT_TIERS)].sort((a, b) => a.at - b.at);
    this.value = Math.max(0, opts.value ?? 0);

    this.numberEl = h('span', { class: 'fui-combo__number fui-num' });
    this.rankEl = h('span', { class: 'fui-combo__rank' });
    const stack = h('div', { class: 'fui-combo__stack' }, this.numberEl);
    if (opts.suffix !== '') {
      stack.appendChild(h('span', { class: 'fui-combo__suffix', text: opts.suffix ?? 'HITS' }));
    }
    root.append(stack, this.rankEl);

    if (opts.showTimer && opts.decay) {
      root.appendChild(h('span', { class: 'fui-combo__timer', attrs: { 'aria-hidden': 'true' } }));
    }
    this.onDestroy(() => this.clearTimer());
    this.paint(false);
  }

  get(): number {
    return this.value;
  }

  /** Register a hit: bumps the count, pops the number, restarts the decay. */
  hit(n = 1): this {
    this.value += n;
    this.paint(true);
    this.emit('combo:hit', this.value);
    this.restart();
    return this;
  }

  /** Drop the chain to zero and fire `combo:drop` with the final count. */
  drop(): this {
    const final = this.value;
    this.value = 0;
    this.clearTimer();
    this.paint(false);
    if (final > 0) this.emit('combo:drop', final);
    return this;
  }

  private restart(): void {
    this.clearTimer();
    if (!this.opts.decay) return;
    // Re-triggering the CSS animation needs the class to leave the element for
    // one frame, otherwise the timer bar keeps draining from where it was.
    const timerEl = this.el.querySelector('.fui-combo__timer');
    if (timerEl) {
      timerEl.classList.remove('is-running');
      void (timerEl as HTMLElement).offsetWidth;
      timerEl.classList.add('is-running');
    }
    this.timer = setTimeout(() => this.drop(), this.opts.decay);
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private paint(pop: boolean): void {
    this.numberEl.textContent = commas(this.value);
    const tier = [...this.tiers].reverse().find((t) => this.value >= t.at) ?? this.tiers[0];
    this.rankEl.textContent = tier?.label ?? '';
    this.el.style.setProperty('--fui-combo-ink', tier?.color ?? 'var(--fui-ink)');
    this.el.classList.toggle('is-live', this.value > 0);
    // Scale grows with the chain, capped so a 200-hit combo does not take over
    // the screen.
    this.el.style.setProperty('--fui-combo-grow', String(1 + clamp(this.value / 60, 0, 0.5)));
    if (!pop) return;
    this.numberEl.classList.remove('is-pop');
    void this.numberEl.offsetWidth;
    this.numberEl.classList.add('is-pop');
  }
}
