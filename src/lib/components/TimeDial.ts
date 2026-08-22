import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface TimeBand {
  /** Where the band starts, as a fraction of the day, 0–1. */
  from: number;
  /** Where it ends. */
  to: number;
  label: string;
  color?: string;
  /** Glyph asset id shown when this band is the current one. */
  glyph?: string;
  /** Something is happening in this band — a raid window, a spawn. */
  event?: string;
}

export interface TimeDialOptions extends BaseOptions {
  /** Where the hand points, as a fraction of the day, 0–1. */
  value?: number;
  /** The parts of the day. Omit for dawn / day / dusk / night. */
  bands?: TimeBand[];
  /** Diameter in pixels. */
  size?: number;
  /** Snap to this many steps around the dial. 24 gives whole hours. */
  steps?: number;
  /** Heading over the dial. */
  label?: string;
  /** Print the time under the dial. */
  showTime?: boolean;
  /** Read-only: draw the dial and take no input. */
  readonly?: boolean;
}

const DEFAULT_BANDS: TimeBand[] = [
  { from: 0.21, to: 0.29, label: 'Dawn', color: '#e8a13c' },
  { from: 0.29, to: 0.71, label: 'Day', color: '#4a8ede' },
  { from: 0.71, to: 0.79, label: 'Dusk', color: '#c9502a' },
  { from: 0.79, to: 1.21, label: 'Night', color: '#3b3468' },
];

/**
 * The day dial: drag the sun round to pick a time. Scheduling a raid, setting
 * a camp's watch, choosing when to travel, previewing a day-night cycle.
 *
 *   const dial = new TimeDial({
 *     label: 'Set out at', value: 0.25, steps: 24, showTime: true,
 *     bands: [
 *       { from: 0.79, to: 1.21, label: 'Night', color: '#3b3468', event: 'Wraiths abroad' },
 *     ],
 *   });
 *   dial.on<number>('time:change', (t) => world.setTime(t));
 *
 * Bands are given in fractions of a day and may wrap past 1, which is what lets
 * night run from dusk to dawn as one band rather than two. The arc is a single
 * conic gradient assembled from those bands, so adding a season or a fifth
 * watch costs a data entry and no CSS.
 */
export class TimeDial extends FuiComponent<TimeDialOptions> {
  private face: HTMLElement;
  private readout: HTMLElement | null = null;
  private bandEl: HTMLElement;
  private value: number;
  private dragging = false;

  constructor(opts: TimeDialOptions = {}) {
    const root = h('div', {
      class: 'fui fui-timedial',
      style: { '--fui-timedial-size': `${opts.size ?? 190}px` },
    });
    super(root, opts);
    this.value = this.snap(opts.value ?? 0.25);

    if (opts.label) {
      root.appendChild(h('span', { class: 'fui-timedial__label fui-label', text: opts.label }));
    }

    this.face = h('div', {
      class: 'fui-timedial__face',
      attrs: {
        role: 'slider',
        tabindex: opts.readonly ? undefined : 0,
        'aria-valuemin': 0,
        'aria-valuemax': 24,
        'aria-label': opts.label ?? 'Time of day',
      },
    });
    this.bandEl = h('span', { class: 'fui-timedial__bands', attrs: { 'aria-hidden': 'true' } });
    this.face.appendChild(this.bandEl);
    this.face.appendChild(h('span', { class: 'fui-timedial__ticks', attrs: { 'aria-hidden': 'true' } }));
    this.face.appendChild(h('span', { class: 'fui-timedial__hand', attrs: { 'aria-hidden': 'true' } }));
    this.face.appendChild(h('span', { class: 'fui-timedial__hub' }));
    root.appendChild(this.face);

    if (opts.showTime ?? true) {
      this.readout = h('div', { class: 'fui-timedial__readout' });
      root.appendChild(this.readout);
    }

    if (!opts.readonly) {
      this.face.addEventListener('pointerdown', this.onDown);
      this.face.addEventListener('keydown', this.onKey);
      this.onDestroy(() => {
        this.face.removeEventListener('pointerdown', this.onDown);
        this.face.removeEventListener('keydown', this.onKey);
        this.endDrag();
      });
    }

    this.paintBands();
    this.paint();
  }

  /** The time as a fraction of the day, 0–1. */
  get(): number {
    return this.value;
  }

  /** The time as `HH:MM`. */
  clock(): string {
    const mins = Math.round(this.value * 24 * 60) % (24 * 60);
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  /** Which band the hand is in. */
  band(): TimeBand | null {
    const bands = this.opts.bands ?? DEFAULT_BANDS;
    for (const b of bands) {
      // A band may wrap past 1 so night can be one entry, not two — so the test
      // has to consider the value a turn later as well.
      if ((this.value >= b.from && this.value < b.to) ||
          (this.value + 1 >= b.from && this.value + 1 < b.to)) return b;
    }
    return null;
  }

  set(value: number, opts?: { silent?: boolean }): this {
    const next = this.snap(value);
    if (next === this.value) return this;
    this.value = next;
    this.paint();
    if (!opts?.silent) this.emit('time:change', next);
    return this;
  }

  private snap(value: number): number {
    const wrapped = ((value % 1) + 1) % 1;
    const steps = this.opts.steps;
    return steps ? Math.round(wrapped * steps) / steps : wrapped;
  }

  private paintBands(): void {
    const bands = this.opts.bands ?? DEFAULT_BANDS;
    const stops = bands
      .map((b) => {
        const from = (((b.from % 1) + 1) % 1) * 360;
        const to = from + (b.to - b.from) * 360;
        const color = b.color ?? 'var(--fui-neutral)';
        return `${color} ${from.toFixed(2)}deg ${to.toFixed(2)}deg`;
      })
      .join(', ');
    // Midnight sits at the top, so the gradient starts a quarter turn back.
    this.bandEl.style.setProperty('--fui-timedial-arc', `conic-gradient(from -90deg, ${stops})`);
  }

  private paint(): void {
    this.face.style.setProperty('--fui-timedial-at', `${(this.value * 360).toFixed(2)}deg`);
    this.face.setAttribute('aria-valuenow', (this.value * 24).toFixed(2));
    this.face.setAttribute('aria-valuetext', this.clock());
    const band = this.band();
    this.el.dataset.band = band?.label ?? '';
    if (band?.color) this.el.style.setProperty('--fui-timedial-ink', band.color);

    if (!this.readout) return;
    clear(this.readout);
    if (band?.glyph) {
      this.readout.appendChild(
        h('span', {
          class: 'fui-timedial__glyph',
          style: { '--fui-glyph-src': `var(--fui-img-${band.glyph})` },
        }),
      );
    }
    this.readout.appendChild(h('span', { class: 'fui-timedial__clock fui-num', text: this.clock() }));
    if (band) {
      this.readout.appendChild(h('span', { class: 'fui-timedial__band', text: band.label }));
    }
    if (band?.event) {
      this.readout.appendChild(h('span', { class: 'fui-timedial__event', text: band.event }));
    }
  }

  private onDown = (ev: Event): void => {
    const pe = ev as PointerEvent;
    pe.preventDefault();
    this.dragging = true;
    this.face.setPointerCapture?.(pe.pointerId);
    this.face.addEventListener('pointermove', this.onMove);
    this.face.addEventListener('pointerup', this.onUp);
    this.face.addEventListener('pointercancel', this.onUp);
    this.el.dataset.dragging = 'true';
    this.aim(pe);
  };

  private onMove = (ev: Event): void => {
    if (this.dragging) this.aim(ev as PointerEvent);
  };

  private onUp = (): void => {
    this.endDrag();
  };

  private endDrag(): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.face.removeEventListener('pointermove', this.onMove);
    this.face.removeEventListener('pointerup', this.onUp);
    this.face.removeEventListener('pointercancel', this.onUp);
    delete this.el.dataset.dragging;
  }

  private onKey = (ev: Event): void => {
    const key = (ev as KeyboardEvent).key;
    const step = 1 / (this.opts.steps ?? 48);
    if (key === 'ArrowRight' || key === 'ArrowUp') this.set(this.value + step);
    else if (key === 'ArrowLeft' || key === 'ArrowDown') this.set(this.value - step);
    else return;
    ev.preventDefault();
  };

  /** Turn a pointer position into a time by the angle from the dial's centre. */
  private aim(pe: PointerEvent): void {
    const box = this.face.getBoundingClientRect();
    if (!box.width) return;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    // atan2 from twelve o'clock, clockwise — the direction a clock reads.
    const angle = Math.atan2(pe.clientX - cx, cy - pe.clientY);
    this.set(angle / (Math.PI * 2));
  }
}
