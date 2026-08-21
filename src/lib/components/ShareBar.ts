import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp, abbreviate } from '../core/dom.ts';

export interface Share {
  id?: string;
  label: string;
  value: number;
  /** Segment colour. Falls back to a generated hue. */
  color?: string;
  /** Glyph asset id shown in the legend. */
  glyph?: string;
  /** Mark the local player's slice. */
  you?: boolean;
}

export interface ShareBarOptions extends BaseOptions {
  /** The slices, in the order they should be drawn. */
  shares: Share[];
  /** Heading over the bar. */
  title?: string;
  /**
   * Denominator for the percentages. Defaults to the sum of the shares; set it
   * higher and the bar leaves a visible remainder.
   */
  total?: number;
  /** Bar thickness in pixels. */
  height?: number;
  /** Draw the legend under the bar. */
  legend?: boolean;
  /** Print raw values beside the percentages. */
  showValues?: boolean;
  /** Sort slices largest first before drawing. */
  sorted?: boolean;
  /** Hide slices under this fraction of the total, rolled into "Other". */
  minShare?: number;
  /** Label for the rolled-up remainder. */
  otherLabel?: string;
}

/** A stable hue per index, so an uncoloured set still reads as distinct. */
const HUES = [200, 30, 275, 140, 355, 50, 315, 175];

/**
 * One bar split into parts that add up — damage by champion, where the gold
 * went, which affinity your roster leans on.
 *
 *   new ShareBar({
 *     title: 'Damage share', legend: true, showValues: true, sorted: true,
 *     shares: [
 *       { label: 'Vexhollow', value: 48_200_000, you: true },
 *       { label: 'Grixmaul', value: 21_400_000 },
 *     ],
 *   });
 *
 * `DamageMeter` ranks the same numbers as rows; this shows them as one whole,
 * which is the right shape when the question is "what fraction" rather than
 * "who won". Set `total` above the sum and the shortfall stays visible as empty
 * track — the honest way to draw progress toward a target nobody has hit.
 */
export class ShareBar extends FuiComponent<ShareBarOptions> {
  private track: HTMLElement;
  private legendEl: HTMLElement | null = null;

  constructor(opts: ShareBarOptions) {
    const root = h('div', {
      class: 'fui fui-share',
      style: { '--fui-share-h': `${opts.height ?? 16}px` },
    });
    super(root, opts);

    if (opts.title) {
      root.appendChild(h('span', { class: 'fui-share__title fui-label', text: opts.title }));
    }

    this.track = h('div', {
      class: 'fui-share__track',
      attrs: { role: 'img' },
    });
    root.appendChild(this.track);

    if (opts.legend ?? true) {
      this.legendEl = h('div', { class: 'fui-share__legend' });
      root.appendChild(this.legendEl);
    }
    this.paint();
  }

  /** Replace the slices and redraw. */
  setShares(shares: Share[], total?: number): this {
    this.opts.shares = shares;
    if (total != null) this.opts.total = total;
    this.paint();
    return this;
  }

  /** The slices as drawn — sorted and rolled up, with percentages resolved. */
  resolved(): Array<Share & { percent: number }> {
    const rows = this.opts.sorted
      ? [...this.opts.shares].sort((a, b) => b.value - a.value)
      : [...this.opts.shares];
    const sum = rows.reduce((n, s) => n + Math.max(0, s.value), 0);
    const total = Math.max(this.opts.total ?? sum, sum, 1);

    const min = this.opts.minShare ?? 0;
    const kept: Array<Share & { percent: number }> = [];
    let rolled = 0;
    for (const s of rows) {
      const frac = Math.max(0, s.value) / total;
      if (min > 0 && frac < min) rolled += Math.max(0, s.value);
      else kept.push({ ...s, percent: frac * 100 });
    }
    if (rolled > 0) {
      kept.push({
        label: this.opts.otherLabel ?? 'Other',
        value: rolled,
        color: 'var(--fui-ink-faint)',
        percent: (rolled / total) * 100,
      });
    }
    return kept;
  }

  private paint(): void {
    clear(this.track);
    if (this.legendEl) clear(this.legendEl);
    const rows = this.resolved();

    rows.forEach((s, i) => {
      const color = s.color ?? `hsl(${HUES[i % HUES.length]} 55% 55%)`;
      const seg = h('span', {
        class: 'fui-share__seg',
        style: {
          width: `${clamp(s.percent, 0, 100).toFixed(3)}%`,
          '--fui-share-ink': color,
        },
        attrs: { title: `${s.label} — ${s.percent.toFixed(1)}%` },
      });
      if (s.you) seg.classList.add('is-you');
      this.track.appendChild(seg);

      if (!this.legendEl) return;
      const row = h('span', { class: 'fui-share__key', style: { '--fui-share-ink': color } });
      if (s.you) row.classList.add('is-you');
      if (s.glyph) {
        row.appendChild(
          h('span', {
            class: 'fui-share__key-glyph',
            style: { '--fui-glyph-src': `var(--fui-img-${s.glyph})` },
          }),
        );
      } else {
        row.appendChild(h('span', { class: 'fui-share__key-dot' }));
      }
      row.appendChild(h('span', { class: 'fui-share__key-label', text: s.label }));
      if (this.opts.showValues) {
        row.appendChild(
          h('span', { class: 'fui-share__key-value fui-num', text: abbreviate(s.value) }),
        );
      }
      row.appendChild(
        h('span', { class: 'fui-share__key-pct fui-num', text: `${s.percent.toFixed(1)}%` }),
      );
      this.legendEl.appendChild(row);
    });

    this.track.setAttribute(
      'aria-label',
      rows.map((s) => `${s.label} ${s.percent.toFixed(0)}%`).join(', '),
    );
  }
}
