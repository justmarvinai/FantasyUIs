import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp, commas } from '../core/dom.ts';

export interface RangeSliderOptions extends BaseOptions {
  /** Lowest selectable value. */
  min?: number;
  /** Highest selectable value. */
  max?: number;
  /** Granularity of both handles. */
  step?: number;
  /** Lower handle's starting value. Defaults to `min`. */
  from?: number;
  /** Upper handle's starting value. Defaults to `max`. */
  to?: number;
  /** Heading above the track. */
  label?: string;
  /** Appended to both readouts, e.g. `'%'`. */
  suffix?: string;
  /** Abbreviate large numbers in the readouts. */
  compact?: boolean;
  /** Tick marks under the track. */
  ticks?: number[];
  /** Width in pixels, or any CSS length such as `'100%'`. */
  width?: number | string;
  /** Lock both handles. */
  disabled?: boolean;
}

/**
 * A two-handle range for filtering — power between 80k and 200k, level 40 to
 * 60, price under a cap. `Slider` picks one value; this picks a band.
 *
 *   const power = new RangeSlider({
 *     label: 'Power', min: 0, max: 300_000, step: 5_000,
 *     from: 80_000, to: 220_000, compact: true,
 *   });
 *   power.on<{ from: number; to: number }>('range:change', (r) => roster.filter(r));
 *
 * Both handles are real `<input type="range">` elements stacked on one track,
 * so keyboard and screen-reader support come for free. The trick is that only
 * the handle nearest the pointer receives events — otherwise the upper input,
 * being on top, would swallow every click meant for the lower one.
 */
export class RangeSlider extends FuiComponent<RangeSliderOptions> {
  private lo: HTMLInputElement;
  private hi: HTMLInputElement;
  private fromEl: HTMLElement;
  private toEl: HTMLElement;

  constructor(opts: RangeSliderOptions = {}) {
    const min = opts.min ?? 0;
    const max = opts.max ?? 100;
    const root = h('div', {
      class: 'fui fui-range',
      style: {
        ...(opts.width != null
          ? { width: typeof opts.width === 'number' ? `${opts.width}px` : opts.width }
          : {}),
      },
    });
    if (opts.disabled) root.classList.add('is-disabled');
    super(root, opts);

    const head = h('div', { class: 'fui-range__head' });
    if (opts.label) head.appendChild(h('span', { class: 'fui-range__label fui-label', text: opts.label }));
    this.fromEl = h('span', { class: 'fui-range__value fui-num' });
    this.toEl = h('span', { class: 'fui-range__value fui-num' });
    head.appendChild(
      h('span', { class: 'fui-range__readout' }, this.fromEl, h('span', { class: 'fui-range__dash', text: '–' }), this.toEl),
    );
    root.appendChild(head);

    const make = (value: number, cls: string) => {
      const input = h('input', {
        class: `fui-range__input ${cls}`,
        attrs: {
          type: 'range',
          min: String(min),
          max: String(max),
          step: String(opts.step ?? 1),
          disabled: opts.disabled || undefined,
        },
      });
      input.value = String(clamp(value, min, max));
      input.addEventListener('input', () => this.settle(input === this.hi));
      return input;
    };

    this.lo = make(opts.from ?? min, 'fui-range__input--lo');
    this.hi = make(opts.to ?? max, 'fui-range__input--hi');

    const track = h('div', { class: 'fui-range__track' });
    track.appendChild(h('span', { class: 'fui-range__fill', attrs: { 'aria-hidden': 'true' } }));
    track.append(this.lo, this.hi);

    if (opts.ticks?.length) {
      const ticks = h('div', { class: 'fui-range__ticks', attrs: { 'aria-hidden': 'true' } });
      for (const t of opts.ticks) {
        ticks.appendChild(
          h('span', {
            class: 'fui-range__tick',
            style: { left: `${((clamp(t, min, max) - min) / (max - min || 1)) * 100}%` },
          }),
        );
      }
      track.appendChild(ticks);
    }
    root.appendChild(track);

    // Only the nearer handle should react, or the one painted on top would
    // swallow every press meant for the other.
    const route = (ev: PointerEvent) => {
      if (opts.disabled) return;
      const r = track.getBoundingClientRect();
      if (!r.width) return;
      const at = min + ((ev.clientX - r.left) / r.width) * (max - min);
      const nearHi = Math.abs(at - Number(this.hi.value)) <= Math.abs(at - Number(this.lo.value));
      this.hi.style.pointerEvents = nearHi ? 'auto' : 'none';
      this.lo.style.pointerEvents = nearHi ? 'none' : 'auto';
    };
    track.addEventListener('pointermove', route);
    track.addEventListener('pointerdown', route);
    this.onDestroy(() => {
      track.removeEventListener('pointermove', route);
      track.removeEventListener('pointerdown', route);
    });

    this.paint();
  }

  /** Current band. */
  get(): { from: number; to: number } {
    return { from: Number(this.lo.value), to: Number(this.hi.value) };
  }

  set(from: number, to: number, opts?: { silent?: boolean }): this {
    const min = this.opts.min ?? 0;
    const max = this.opts.max ?? 100;
    this.lo.value = String(clamp(Math.min(from, to), min, max));
    this.hi.value = String(clamp(Math.max(from, to), min, max));
    this.paint();
    if (!opts?.silent) this.emit('range:change', this.get());
    return this;
  }

  /** Push the handles back apart if the moving one crossed the other. */
  private settle(movedHi: boolean): void {
    const lo = Number(this.lo.value);
    const hi = Number(this.hi.value);
    if (lo > hi) {
      if (movedHi) this.lo.value = String(hi);
      else this.hi.value = String(lo);
    }
    this.paint();
    this.emit('range:change', this.get());
  }

  private paint(): void {
    const min = this.opts.min ?? 0;
    const max = this.opts.max ?? 100;
    const span = max - min || 1;
    const { from, to } = this.get();
    this.el.style.setProperty('--fui-range-from', String((from - min) / span));
    this.el.style.setProperty('--fui-range-to', String((to - min) / span));
    const fmt = (n: number) =>
      (this.opts.compact ? abbreviate(n) : commas(n)) + (this.opts.suffix ?? '');
    this.fromEl.textContent = fmt(from);
    this.toEl.textContent = fmt(to);
    this.lo.setAttribute('aria-label', `Minimum ${fmt(from)}`);
    this.hi.setAttribute('aria-label', `Maximum ${fmt(to)}`);
  }
}

/** Local copy so the component stays importable on its own. */
function abbreviate(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (abs >= 1e4) return (n / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'K';
  return commas(n);
}
