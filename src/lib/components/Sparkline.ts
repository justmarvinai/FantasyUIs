import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clamp, commas } from '../core/dom.ts';

export interface SparklineOptions extends BaseOptions {
  /** The series, oldest first. */
  values: number[];
  /** Width in pixels, or any CSS length such as `'100%'`. */
  width?: number | string;
  /** Height in pixels. */
  height?: number;
  /** Line colour. Any CSS colour. */
  color?: string;
  /** `line` draws a stroke, `area` fills under it, `bars` draws columns. */
  variant?: 'line' | 'area' | 'bars';
  /** Heading above the chart. */
  label?: string;
  /** Print the latest value, and its change against the previous point. */
  showLast?: boolean;
  /** Suffix for the readout, e.g. `'%'`. */
  suffix?: string;
  /** Draw a dashed line at this value — a target, an average, a threshold. */
  baseline?: number;
  /** Mark the highest and lowest points. */
  markExtremes?: boolean;
  /** Lower bound of the scale. Defaults to the series minimum. */
  min?: number;
  /** Upper bound of the scale. Defaults to the series maximum. */
  max?: number;
}

const NS = 'http://www.w3.org/2000/svg';

/**
 * A compact trend for a number that has a history — damage over the last ten
 * fights, daily logins, arena rating, resource income.
 *
 *   new Sparkline({
 *     label: 'Clan boss damage',
 *     values: [31, 34, 33, 38, 42, 41, 47, 52],
 *     variant: 'area', showLast: true, markExtremes: true,
 *     baseline: 40,
 *   });
 *
 * The series is drawn in its own 0–100 viewBox with a non-scaling stroke, so
 * one component works at 60px wide in a table row and 400px wide on a stats
 * page without the line thickening.
 */
export class Sparkline extends FuiComponent<SparklineOptions> {
  private svg: SVGSVGElement;

  constructor(opts: SparklineOptions) {
    const height = opts.height ?? 40;
    const root = h('div', {
      class: 'fui fui-spark',
      dataset: { variant: opts.variant ?? 'line' },
      style: {
        '--fui-spark-h': `${height}px`,
        ...(opts.color ? { '--fui-spark-ink': opts.color } : {}),
        ...(opts.width != null
          ? { width: typeof opts.width === 'number' ? `${opts.width}px` : opts.width }
          : {}),
      },
    });
    super(root, opts);

    if (opts.label || opts.showLast) {
      const head = h('div', { class: 'fui-spark__head' });
      if (opts.label) head.appendChild(h('span', { class: 'fui-spark__label fui-label', text: opts.label }));
      if (opts.showLast) {
        const values = opts.values;
        const last = values[values.length - 1] ?? 0;
        const prev = values[values.length - 2];
        head.appendChild(
          h('span', { class: 'fui-spark__last fui-num', text: commas(last) + (opts.suffix ?? '') }),
        );
        if (prev != null && prev !== last) {
          const delta = last - prev;
          head.appendChild(
            h('span', {
              class: 'fui-spark__delta fui-num',
              dataset: { dir: delta > 0 ? 'up' : 'down' },
              text: `${delta > 0 ? '+' : '−'}${commas(Math.abs(delta))}`,
            }),
          );
        }
      }
      root.appendChild(head);
    }

    const doc = root.ownerDocument;
    this.svg = doc.createElementNS(NS, 'svg') as SVGSVGElement;
    this.svg.setAttribute('viewBox', '0 0 100 100');
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.svg.setAttribute('aria-hidden', 'true');
    root.appendChild(this.svg);
    this.draw();
  }

  /** Replace the series and redraw. */
  setValues(values: number[]): this {
    this.opts.values = values;
    this.draw();
    return this;
  }

  /** Append one point, optionally dropping the oldest to keep the window. */
  push(value: number, window?: number): this {
    const next = [...this.opts.values, value];
    if (window && next.length > window) next.splice(0, next.length - window);
    return this.setValues(next);
  }

  private draw(): void {
    const doc = this.el.ownerDocument;
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

    const values = this.opts.values;
    if (values.length === 0) return;

    const lo = this.opts.min ?? Math.min(...values);
    const hi = this.opts.max ?? Math.max(...values);
    // A flat series would divide by zero; give it a band so it draws centred.
    const span = hi - lo || 1;
    const x = (i: number) => (values.length === 1 ? 50 : (i / (values.length - 1)) * 100);
    const y = (v: number) => 100 - clamp((v - lo) / span, 0, 1) * 92 - 4;

    const add = (tag: string, attrs: Record<string, string>) => {
      const node = doc.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      this.svg.appendChild(node);
      return node;
    };

    if (this.opts.baseline != null) {
      const by = y(this.opts.baseline).toFixed(2);
      add('line', { class: 'fui-spark__baseline', x1: '0', y1: by, x2: '100', y2: by });
    }

    if ((this.opts.variant ?? 'line') === 'bars') {
      const w = 100 / values.length;
      values.forEach((v, i) => {
        const top = y(v);
        add('rect', {
          class: 'fui-spark__bar',
          x: (i * w + w * 0.18).toFixed(2),
          y: top.toFixed(2),
          width: (w * 0.64).toFixed(2),
          height: Math.max(0.5, 100 - top).toFixed(2),
        });
      });
    } else {
      const points = values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
      if ((this.opts.variant ?? 'line') === 'area') {
        add('polygon', { class: 'fui-spark__area', points: `0,100 ${points} 100,100` });
      }
      add('polyline', { class: 'fui-spark__line', points });
    }

    if (this.opts.markExtremes && values.length > 1) {
      const hiIdx = values.indexOf(Math.max(...values));
      const loIdx = values.indexOf(Math.min(...values));
      for (const [idx, cls] of [[hiIdx, 'is-high'], [loIdx, 'is-low']] as const) {
        add('circle', {
          class: `fui-spark__dot ${cls}`,
          cx: x(idx).toFixed(2),
          cy: y(values[idx]).toFixed(2),
          r: '2.4',
        });
      }
    }

    // The most recent point always gets a dot — it is the one being read.
    add('circle', {
      class: 'fui-spark__dot fui-spark__dot--last',
      cx: x(values.length - 1).toFixed(2),
      cy: y(values[values.length - 1]).toFixed(2),
      r: '2.6',
    });
  }
}
