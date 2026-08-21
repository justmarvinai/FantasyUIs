import { FuiComponent, type BaseOptions, type Rarity } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface WheelPrize {
  id: string;
  label: string;
  /** Manifest asset id for the prize art. */
  art?: string;
  rarity?: Rarity;
  /** Relative weight. A prize at weight 2 is twice as likely as one at 1. */
  weight?: number;
  /** Segment colour, overriding the rarity tint. */
  color?: string;
  /** Already claimed — greyed on the wheel and skipped by `spin()`. */
  taken?: boolean;
}

export interface SpinWheelOptions extends BaseOptions {
  /** The segments, drawn clockwise from twelve o'clock. */
  prizes: WheelPrize[];
  /** Diameter in pixels. */
  size?: number;
  /** Free spins the player holds. */
  spins?: number;
  /** Cost line shown when there are no free spins left. */
  cost?: string;
  /** Label on the spin button. */
  action?: string;
  /** How long a spin takes, in milliseconds. */
  duration?: number;
  /** Whole extra turns before the wheel settles. */
  turns?: number;
  /** Print each segment's odds on the wheel. */
  showOdds?: boolean;
}

/**
 * The prize wheel — a login reward, an event spin, a shop gimmick.
 *
 *   const wheel = new SpinWheel({
 *     spins: 3, action: 'Spin', showOdds: true,
 *     prizes: [
 *       { id: 'gold', label: '10,000 Gold', art: 'icon-coins', weight: 40 },
 *       { id: 'gem', label: 'Legendary Shard', art: 'rune-radiant-gem', rarity: 'legendary', weight: 1 },
 *     ],
 *   });
 *   wheel.on<WheelPrize>('wheel:prize', (p) => grant(p.id));
 *
 * The result is drawn from the weights *before* the animation starts, and the
 * wheel is then spun to land on it. Doing it the other way round — spinning and
 * reading off where it stopped — makes the odds a property of a CSS transition,
 * which is neither auditable nor honest. `odds()` returns the same numbers the
 * wheel prints, so a rate disclosure cannot drift from the draw.
 */
export class SpinWheel extends FuiComponent<SpinWheelOptions> {
  private disc: HTMLElement;
  private button: HTMLButtonElement;
  private tally: HTMLElement | null = null;
  private angle = 0;
  private spinning = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: SpinWheelOptions) {
    const size = opts.size ?? 260;
    const root = h('div', {
      class: 'fui fui-spin',
      style: { '--fui-spin-size': `${size}px`, '--fui-spin-ms': `${opts.duration ?? 3600}ms` },
    });
    super(root, opts);

    const stage = h('div', { class: 'fui-spin__stage' });
    this.disc = h('div', { class: 'fui-spin__disc' });
    stage.appendChild(this.disc);
    stage.appendChild(h('span', { class: 'fui-spin__pointer', attrs: { 'aria-hidden': 'true' } }));
    stage.appendChild(h('span', { class: 'fui-spin__hub', attrs: { 'aria-hidden': 'true' } }));
    root.appendChild(stage);

    const foot = h('div', { class: 'fui-spin__foot' });
    this.button = h('button', {
      class: 'fui-spin__action',
      text: opts.action ?? 'Spin',
      attrs: { type: 'button' },
    });
    this.button.addEventListener('click', () => this.spin());
    foot.appendChild(this.button);
    if (opts.spins != null || opts.cost) {
      this.tally = h('span', { class: 'fui-spin__tally fui-num' });
      foot.appendChild(this.tally);
    }
    root.appendChild(foot);

    this.onDestroy(() => this.cancel());
    this.render();
  }

  /** Each prize's chance, as a percentage. The same numbers the wheel prints. */
  odds(): Array<{ id: string; label: string; percent: number }> {
    const live = this.opts.prizes.filter((p) => !p.taken);
    const total = live.reduce((n, p) => n + Math.max(0, p.weight ?? 1), 0) || 1;
    return live.map((p) => ({
      id: p.id,
      label: p.label,
      percent: (Math.max(0, p.weight ?? 1) / total) * 100,
    }));
  }

  /** True while the wheel is turning. */
  isSpinning(): boolean {
    return this.spinning;
  }

  /** Free spins left. */
  spinsLeft(): number {
    return this.opts.spins ?? Infinity;
  }

  /**
   * Draw a prize and spin the wheel onto it. Pass an id to force the result —
   * which is what a server-authoritative game does, sending the outcome down
   * and letting the client play the animation.
   */
  spin(forceId?: string): WheelPrize | null {
    if (this.spinning) return null;
    const live = this.opts.prizes.filter((p) => !p.taken);
    if (live.length === 0) return null;
    if (this.opts.spins != null && this.opts.spins <= 0) return null;

    const prize = forceId ? (live.find((p) => p.id === forceId) ?? this.draw(live)) : this.draw(live);
    const index = this.opts.prizes.indexOf(prize);
    if (index < 0) return null;

    this.spinning = true;
    if (this.opts.spins != null) this.opts.spins -= 1;
    this.button.disabled = true;
    this.paintTally();
    this.emit('wheel:spin', prize.id);

    // Land the segment's middle under the pointer at twelve o'clock, then add
    // whole turns so the wheel always spins forward from wherever it stopped.
    const slice = 360 / this.opts.prizes.length;
    const target = 360 - (index * slice + slice / 2);
    const turns = (this.opts.turns ?? 5) * 360;
    const from = this.angle % 360;
    this.angle = this.angle - from + turns + target;
    this.disc.style.transform = `rotate(${this.angle}deg)`;

    this.timer = setTimeout(() => {
      this.spinning = false;
      this.timer = null;
      this.button.disabled = this.opts.spins != null && this.opts.spins <= 0;
      this.el.dataset.won = prize.id;
      this.emit('wheel:prize', prize);
    }, this.opts.duration ?? 3600);
    return prize;
  }

  /** Stop a spin in flight. Called on destroy. */
  cancel(): this {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.spinning = false;
    return this;
  }

  /** Replace the segments, e.g. after a prize is claimed. */
  setPrizes(prizes: WheelPrize[]): this {
    this.opts.prizes = prizes;
    this.render();
    return this;
  }

  private draw(live: WheelPrize[]): WheelPrize {
    const total = live.reduce((n, p) => n + Math.max(0, p.weight ?? 1), 0);
    let roll = Math.random() * total;
    for (const p of live) {
      roll -= Math.max(0, p.weight ?? 1);
      if (roll <= 0) return p;
    }
    return live[live.length - 1];
  }

  private render(): void {
    clear(this.disc);
    const n = this.opts.prizes.length || 1;
    const slice = 360 / n;
    const odds = new Map(this.odds().map((o) => [o.id, o.percent]));

    // One conic gradient paints every wedge; the labels then ride on top,
    // rotated into their own slice. Drawing each wedge as its own element would
    // need clip-paths that fight at the seams.
    const stops = this.opts.prizes
      .map((p, i) => {
        const c = p.taken
          ? 'var(--fui-spin-dead)'
          : (p.color ?? `var(--fui-rarity-${p.rarity ?? 'common'})`);
        return `${c} ${(i * slice).toFixed(3)}deg ${((i + 1) * slice).toFixed(3)}deg`;
      })
      .join(', ');
    this.disc.style.setProperty('--fui-spin-wedges', `conic-gradient(from -${slice / 2}deg, ${stops})`);

    this.opts.prizes.forEach((p, i) => {
      // The slice angle is published so the label can counter-rotate by it and
      // stay upright — a wheel whose bottom half reads upside down is a wheel
      // nobody can read while it slows down.
      const seg = h('div', {
        class: 'fui-spin__seg',
        style: { '--fui-spin-at': `${(i * slice).toFixed(3)}deg` },
        dataset: { taken: String(!!p.taken) },
      });
      const inner = h('div', { class: 'fui-spin__seg-inner' });
      if (p.art) {
        inner.appendChild(
          h('span', {
            class: 'fui-spin__seg-art',
            style: { backgroundImage: `var(--fui-img-${p.art})` },
          }),
        );
      }
      inner.appendChild(h('span', { class: 'fui-spin__seg-label', text: p.label }));
      if (this.opts.showOdds && !p.taken) {
        inner.appendChild(
          h('span', {
            class: 'fui-spin__seg-odds fui-num',
            text: `${(odds.get(p.id) ?? 0).toFixed(1)}%`,
          }),
        );
      }
      seg.appendChild(inner);
      this.disc.appendChild(seg);
    });

    this.paintTally();
  }

  private paintTally(): void {
    if (!this.tally) return;
    const spins = this.opts.spins;
    this.tally.textContent =
      spins == null
        ? (this.opts.cost ?? '')
        : spins > 0
          ? `${spins} free ${spins === 1 ? 'spin' : 'spins'}`
          : (this.opts.cost ?? 'No spins left');
    this.button.disabled = spins != null && spins <= 0 && !this.opts.cost;
  }
}
