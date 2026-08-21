import { FuiComponent, type BaseOptions, type StatKind } from '../core/component.ts';
import { h, clamp, commas } from '../core/dom.ts';

export interface GaugeBand {
  /** Where this band starts, as a fraction of the sweep, 0–1. */
  from: number;
  /** Where it ends, 0–1. */
  to: number;
  color: string;
  label?: string;
}

export interface GaugeOptions extends BaseOptions {
  /** Where the needle sits. */
  value?: number;
  /** Value at the far end of the arc. */
  max?: number;
  /** Size in pixels — the gauge's width; the arc is half as tall. */
  size?: number;
  /** How far round the dial sweeps, in degrees. 180 is a half-circle. */
  sweep?: number;
  /** Recolours the needle and fill to a resource palette. */
  kind?: StatKind;
  /** Any CSS colour, overriding `kind`. */
  color?: string;
  /** Big text under the arc. Defaults to the value. */
  label?: string;
  /** Small text under the label. */
  sublabel?: string;
  /** Coloured zones behind the sweep — safe, warning, danger. */
  bands?: GaugeBand[];
  /** Draw the needle. Without it the arc alone carries the value. */
  needle?: boolean;
  /** Manifest asset id for a decorative cap at the dial's centre. */
  cap?: string;
  /** Tick marks around the arc. */
  ticks?: number;
}

/**
 * An arc dial for a value that has a comfortable range and an uncomfortable
 * one — resistance against a soft cap, load against a limit, speed against the
 * threshold that wins a turn order.
 *
 *   new Gauge({
 *     value: 214, max: 300, sweep: 220, needle: true, ticks: 9,
 *     label: '214', sublabel: 'Speed',
 *     bands: [
 *       { from: 0, to: 0.5, color: 'var(--fui-danger)' },
 *       { from: 0.5, to: 0.75, color: 'var(--fui-warn)' },
 *       { from: 0.75, to: 1, color: 'var(--fui-success)' },
 *     ],
 *   });
 *
 * `ProgressRing` answers "how far along"; this answers "where does that fall".
 * The bands are the reason it exists — a number alone cannot say whether 214 is
 * good.
 */
export class Gauge extends FuiComponent<GaugeOptions> {
  private value: number;
  private labelEl: HTMLElement;

  constructor(opts: GaugeOptions = {}) {
    const size = opts.size ?? 140;
    const sweep = clamp(opts.sweep ?? 200, 60, 300);
    const root = h('div', {
      class: 'fui fui-gauge',
      dataset: { kind: opts.kind ?? 'neutral' },
      style: {
        '--fui-gauge-size': `${size}px`,
        '--fui-gauge-sweep': `${sweep}deg`,
        // A conic gradient starts at twelve o'clock, so rotating the ring back
        // by half the sweep puts the sweep's midpoint there whatever its width.
        '--fui-gauge-start': `${-(sweep / 2)}deg`,
        // How far down the circle the arc actually reaches, so the dial crops
        // to the drawn part instead of to a guess. CSS has no sin() to lean on.
        '--fui-gauge-dial-h': `${(
          size * 0.5 * (1 - Math.cos((Math.min(sweep, 360) / 2) * (Math.PI / 180))) + 3
        ).toFixed(1)}px`,
        ...(opts.color ? { '--fui-gauge-ink': opts.color } : {}),
      },
      attrs: {
        role: 'meter',
        'aria-valuemin': 0,
        'aria-valuemax': opts.max ?? 100,
        'aria-valuenow': opts.value ?? 0,
      },
    });
    super(root, opts);
    this.value = clamp(opts.value ?? 0, 0, opts.max ?? 100);

    const dial = h('div', { class: 'fui-gauge__dial' });

    if (opts.bands?.length) {
      const bands = h('span', { class: 'fui-gauge__bands', attrs: { 'aria-hidden': 'true' } });
      // One conic gradient carries every band; the stops are the band edges
      // scaled into the sweep.
      const stops = opts.bands
        .map((b) => {
          const a = clamp(b.from, 0, 1) * sweep;
          const z = clamp(b.to, 0, 1) * sweep;
          return `${b.color} ${a.toFixed(2)}deg ${z.toFixed(2)}deg`;
        })
        .join(', ');
      bands.style.setProperty('--fui-gauge-bands', `conic-gradient(from 0deg, ${stops}, transparent 0)`);
      dial.appendChild(bands);
    }

    dial.appendChild(h('span', { class: 'fui-gauge__track', attrs: { 'aria-hidden': 'true' } }));
    // The arc and needle both read `--fui-gauge-p`, so nothing here needs a
    // reference to them after construction.
    dial.appendChild(h('span', { class: 'fui-gauge__fill', attrs: { 'aria-hidden': 'true' } }));

    if (opts.ticks) {
      const ticks = h('span', { class: 'fui-gauge__ticks', attrs: { 'aria-hidden': 'true' } });
      for (let i = 0; i < opts.ticks; i++) {
        const t = opts.ticks === 1 ? 0.5 : i / (opts.ticks - 1);
        ticks.appendChild(
          h('span', {
            class: 'fui-gauge__tick',
            style: { '--fui-gauge-at': `${(t * sweep).toFixed(2)}deg` },
          }),
        );
      }
      dial.appendChild(ticks);
    }

    if (opts.needle ?? true) {
      dial.appendChild(h('span', { class: 'fui-gauge__needle', attrs: { 'aria-hidden': 'true' } }));
    }

    if (opts.cap) {
      // The cap covers the needle's pivot, which is exactly where the readout
      // wants to be — the root has to say so, so the readout can move down.
      root.classList.add('fui-gauge--capped');
      dial.appendChild(
        h('span', {
          class: 'fui-gauge__cap',
          style: { backgroundImage: `var(--fui-img-${opts.cap})` },
          attrs: { 'aria-hidden': 'true' },
        }),
      );
    }
    root.appendChild(dial);

    const centre = h('div', { class: 'fui-gauge__readout' });
    this.labelEl = h('span', { class: 'fui-gauge__label fui-num' });
    centre.appendChild(this.labelEl);
    if (opts.sublabel) {
      centre.appendChild(h('span', { class: 'fui-gauge__sub', text: opts.sublabel }));
    }
    root.appendChild(centre);

    this.paint();
  }

  get(): number {
    return this.value;
  }

  set(value: number, opts?: { silent?: boolean }): this {
    this.value = clamp(value, 0, this.opts.max ?? 100);
    this.paint();
    this.el.setAttribute('aria-valuenow', String(this.value));
    if (!opts?.silent) this.emit('gauge:change', this.value);
    return this;
  }

  /** Which band the value currently falls in, if any. */
  band(): GaugeBand | null {
    const pct = this.value / (this.opts.max ?? 100);
    return this.opts.bands?.find((b) => pct >= b.from && pct <= b.to) ?? null;
  }

  private paint(): void {
    const max = this.opts.max ?? 100;
    const pct = max > 0 ? clamp(this.value / max, 0, 1) : 0;
    this.el.style.setProperty('--fui-gauge-p', String(pct));
    const band = this.band();
    if (band) this.el.style.setProperty('--fui-gauge-band', band.color);
    this.labelEl.textContent = this.opts.label ?? commas(this.value);
  }
}
