import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp } from '../core/dom.ts';

export interface SkillZone {
  /** Where the zone starts, 0–1 across the track. */
  from: number;
  /** Where it ends, 0–1. */
  to: number;
  /** What hitting it is worth. Highest wins when zones overlap. */
  score?: number;
  label?: string;
  color?: string;
}

export interface SkillCheckOptions extends BaseOptions {
  /** The bands worth hitting. Anything outside them is a miss. */
  zones?: SkillZone[];
  /** Full sweeps of the track per second. */
  speed?: number;
  /** Line above the track — "Parry", "Pick the lock", "Reel it in". */
  label?: string;
  /** Attempts the player gets. Omit for unlimited. */
  attempts?: number;
  /** Start the marker moving straight away. */
  autoStart?: boolean;
  /** Bounce back and forth instead of wrapping around. */
  bounce?: boolean;
  /** Width in pixels, or any CSS length such as `'100%'`. */
  width?: number | string;
  /** Track thickness in pixels. */
  height?: number;
  /** Label on the stop button. */
  action?: string;
}

export interface SkillCheckResult {
  /** Where the marker stopped, 0–1. */
  at: number;
  /** The zone it landed in, if any. */
  zone: SkillZone | null;
  /** That zone's score, or 0 for a miss. */
  score: number;
  /** Attempts left after this one. */
  attemptsLeft: number;
}

/**
 * The timing bar every game reaches for when it wants a moment of skill —
 * lockpicking, a parry window, a fishing reel, a perfect reload. A marker
 * sweeps the track and the player stops it in the green.
 *
 *   const check = new SkillCheck({
 *     label: 'Parry', speed: 1.4, attempts: 3, autoStart: true,
 *     zones: [{ from: 0.44, to: 0.56, score: 2, label: 'Perfect', color: '#e8c14a' },
 *             { from: 0.34, to: 0.66, score: 1, label: 'Good' }],
 *   });
 *   check.on<SkillCheckResult>('check:stop', (r) => resolveParry(r.score));
 *
 * The marker rides a `requestAnimationFrame` loop that is cancelled on stop and
 * on `destroy()`, and position is derived from elapsed time rather than
 * accumulated per frame — so a stutter or a backgrounded tab cannot make the
 * bar drift out of sync with what the player saw.
 */
export class SkillCheck extends FuiComponent<SkillCheckOptions> {
  private track: HTMLElement;
  private marker: HTMLElement;
  private button: HTMLButtonElement;
  private tally: HTMLElement | null = null;
  private raf: number | null = null;
  private startedAt = 0;
  private at = 0;
  private left: number;
  private done = false;

  constructor(opts: SkillCheckOptions = {}) {
    const root = h('div', {
      class: 'fui fui-check',
      style: {
        '--fui-check-h': `${opts.height ?? 22}px`,
        ...(opts.width != null
          ? { width: typeof opts.width === 'number' ? `${opts.width}px` : opts.width }
          : {}),
      },
    });
    super(root, opts);
    this.left = opts.attempts ?? Infinity;

    if (opts.label || opts.attempts != null) {
      const head = h('div', { class: 'fui-check__head' });
      if (opts.label) {
        head.appendChild(h('span', { class: 'fui-check__label fui-label', text: opts.label }));
      }
      if (opts.attempts != null) {
        this.tally = h('span', { class: 'fui-check__tally fui-num' });
        head.appendChild(this.tally);
      }
      root.appendChild(head);
    }

    this.track = h('div', {
      class: 'fui-check__track',
      attrs: { role: 'progressbar', 'aria-label': opts.label ?? 'Skill check' },
    });
    this.marker = h('span', { class: 'fui-check__marker', attrs: { 'aria-hidden': 'true' } });
    root.appendChild(this.track);
    this.paintZones();
    this.track.appendChild(this.marker);

    this.button = h('button', {
      class: 'fui-check__action',
      text: opts.action ?? 'Stop',
      attrs: { type: 'button' },
    });
    this.button.addEventListener('click', () => (this.raf ? this.stop() : this.start()));
    root.appendChild(this.button);

    // The track itself is the bigger target, and on a phone it is the only one
    // a thumb will reliably find in time.
    this.track.addEventListener('pointerdown', () => {
      if (this.raf) this.stop();
    });

    this.onDestroy(() => this.cancel());
    this.paintTally();
    if (opts.autoStart) this.start();
  }

  /** Where the marker is right now, 0–1. */
  position(): number {
    return this.at;
  }

  /** Attempts remaining, or `Infinity`. */
  attemptsLeft(): number {
    return this.left;
  }

  /** Set the marker moving. Does nothing once the attempts are spent. */
  start(): this {
    if (this.raf != null || this.done) return this;
    // A consumer pre-rendering without an rAF polyfill still gets valid markup;
    // the marker simply sits at the start until the page hydrates.
    if (typeof requestAnimationFrame !== 'function') return this;
    this.startedAt = 0;
    this.el.dataset.state = 'running';
    this.button.textContent = this.opts.action ?? 'Stop';
    const step = (now: number) => {
      if (!this.startedAt) this.startedAt = now;
      const secs = (now - this.startedAt) / 1000;
      const cycles = secs * (this.opts.speed ?? 1.2);
      // Position comes from elapsed time, never from adding a delta each frame,
      // so a dropped frame skips ahead instead of slowing the bar down.
      const phase = cycles % 1;
      this.at = this.opts.bounce
        ? (Math.floor(cycles) % 2 === 0 ? phase : 1 - phase)
        : phase;
      this.marker.style.left = `${(this.at * 100).toFixed(2)}%`;
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
    this.emit('check:start');
    return this;
  }

  /** Stop the marker and score where it landed. */
  stop(): SkillCheckResult {
    this.cancel();
    const zone = this.zoneAt(this.at);
    if (this.left !== Infinity) this.left -= 1;
    const result: SkillCheckResult = {
      at: this.at,
      zone,
      score: zone?.score ?? 0,
      attemptsLeft: this.left,
    };
    this.el.dataset.state = zone ? 'hit' : 'miss';
    this.el.dataset.result = zone?.label ?? 'Miss';
    this.button.textContent = this.left <= 0 ? 'Out of attempts' : 'Again';
    this.done = this.left <= 0;
    this.button.disabled = this.done;
    this.paintTally();
    this.emit('check:stop', result);
    return result;
  }

  /** Give the player their attempts back and clear the result. */
  reset(attempts?: number): this {
    this.cancel();
    this.left = attempts ?? this.opts.attempts ?? Infinity;
    this.done = false;
    this.at = 0;
    this.marker.style.left = '0%';
    this.button.disabled = false;
    this.button.textContent = this.opts.action ?? 'Stop';
    this.el.dataset.state = 'idle';
    delete this.el.dataset.result;
    this.paintTally();
    return this;
  }

  /** The best zone covering a position, or null for a miss. */
  zoneAt(at: number): SkillZone | null {
    // Zones may overlap — a narrow "perfect" band inside a wide "good" one is
    // the standard shape — so the highest score wins rather than the first hit.
    let best: SkillZone | null = null;
    for (const z of this.opts.zones ?? []) {
      if (at < Math.min(z.from, z.to) || at > Math.max(z.from, z.to)) continue;
      if (!best || (z.score ?? 1) > (best.score ?? 1)) best = z;
    }
    return best;
  }

  private cancel(): void {
    if (this.raf != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.raf);
    }
    this.raf = null;
  }

  private paintZones(): void {
    clear(this.track);
    // Widest first, so a narrow high-score band paints on top of the wide one
    // it sits inside instead of being buried by it.
    const zones = [...(this.opts.zones ?? [])].sort(
      (a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from),
    );
    for (const z of zones) {
      const from = clamp(Math.min(z.from, z.to), 0, 1);
      const to = clamp(Math.max(z.from, z.to), 0, 1);
      this.track.appendChild(
        h('span', {
          class: 'fui-check__zone',
          style: {
            left: `${(from * 100).toFixed(2)}%`,
            width: `${((to - from) * 100).toFixed(2)}%`,
            ...(z.color ? { '--fui-check-ink': z.color } : {}),
          },
          attrs: { title: z.label ?? '' },
        }),
      );
    }
  }

  private paintTally(): void {
    if (!this.tally) return;
    this.tally.textContent = this.left === Infinity ? '' : `${this.left} left`;
  }
}
