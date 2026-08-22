import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h } from '../core/dom.ts';

export interface CountdownOverlayOptions extends BaseOptions {
  /** Count down from this number. */
  from?: number;
  /** Word shown when it reaches zero. */
  go?: string;
  /** Milliseconds per number. */
  interval?: number;
  /** Line under the count, e.g. `'Round 2'`. */
  label?: string;
  /** Milliseconds the go-word stays before the overlay clears. */
  hold?: number;
  /** Dim the scene behind it. */
  dim?: boolean;
  /** Start counting as soon as it is constructed. */
  auto?: boolean;
}

/**
 * The pre-match countdown — three, two, one, *fight* — with the ring that
 * drains on each number.
 *
 *   const count = new CountdownOverlay({ from: 3, go: 'Fight!', label: 'Round 2', dim: true });
 *   stage.appendChild(count.el);
 *   count.on('countdown:tick', (n) => sfx.beep(n));
 *   count.on('countdown:go', () => battle.begin());
 *   count.start();
 *
 * The go-word fires its event when it *appears*, not when the overlay clears,
 * so the fight starts on the frame the player sees "Fight!" — waiting for the
 * hold to finish is what makes a countdown feel a beat late. `start()` on a
 * running countdown restarts it cleanly rather than running two interleaved
 * timers, which is the usual cause of a doubled "1".
 */
export class CountdownOverlay extends FuiComponent<CountdownOverlayOptions> {
  private numberEl: HTMLElement;
  private labelEl: HTMLElement;
  private at = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: CountdownOverlayOptions = {}) {
    const root = h('div', {
      class: 'fui fui-countdown',
      dataset: { running: 'off', dim: opts.dim ? 'on' : 'off', phase: 'idle' },
      style: { '--fui-count-ms': `${opts.interval ?? 1000}ms` },
      attrs: { role: 'status', 'aria-live': 'assertive' },
    });
    super(root, opts);

    root.appendChild(h('span', { class: 'fui-countdown__ring' }));
    this.numberEl = h('span', { class: 'fui-countdown__number fui-num' });
    root.appendChild(this.numberEl);
    this.labelEl = h('span', { class: 'fui-countdown__label', text: opts.label ?? '' });
    this.labelEl.dataset.empty = opts.label ? 'off' : 'on';
    root.appendChild(this.labelEl);

    this.onDestroy(() => this.stop());
    if (opts.auto) this.start();
  }

  /** Start (or restart) the countdown. */
  start(from = this.opts.from ?? 3): this {
    this.stop();
    this.at = Math.max(1, Math.round(from));
    this.el.dataset.running = 'on';
    this.show(String(this.at), 'count');
    this.emit('countdown:tick', this.at);

    this.ticker = setInterval(() => {
      this.at -= 1;
      if (this.at > 0) {
        this.show(String(this.at), 'count');
        this.emit('countdown:tick', this.at);
        return;
      }
      this.stopTicker();
      this.show(this.opts.go ?? 'Go!', 'go');
      // Fire on the frame the word lands, not when the overlay clears.
      this.emit('countdown:go');
      this.holdTimer = setTimeout(() => {
        this.el.dataset.running = 'off';
        this.el.dataset.phase = 'idle';
        this.emit('countdown:end');
      }, this.opts.hold ?? 700);
    }, this.opts.interval ?? 1000);
    return this;
  }

  /** Abort the countdown and clear the overlay. */
  stop(): this {
    this.stopTicker();
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.holdTimer = null;
    this.el.dataset.running = 'off';
    this.el.dataset.phase = 'idle';
    return this;
  }

  /** Change the line under the count. */
  setLabel(label: string): this {
    this.opts.label = label;
    this.labelEl.textContent = label;
    this.labelEl.dataset.empty = label ? 'off' : 'on';
    return this;
  }

  private stopTicker(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  /** Swap the text and replay its animation from the top. */
  private show(text: string, phase: 'count' | 'go'): void {
    this.numberEl.textContent = text;
    this.el.dataset.phase = 'idle';
    void this.el.offsetWidth;
    this.el.dataset.phase = phase;
  }
}
