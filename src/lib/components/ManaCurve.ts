import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear } from '../core/dom.ts';

export interface ManaCurveOptions extends BaseOptions {
  /** How many cards at each cost, index 0 = cost 0. The last bucket is "N+". */
  counts: number[];
  /** Highest cost with its own column; everything above lands in `N+`. */
  cap?: number;
  /** Bar colour. */
  color?: string;
  /** Height of the tallest bar in pixels. */
  height?: number;
  /** Print the count above each bar. */
  showCounts?: boolean;
  /** Average cost, printed beside the chart. Computed when omitted. */
  average?: number;
  /** A second, ghosted curve to compare against — an archetype, or last patch. */
  compare?: number[];
}

/**
 * The mana curve: how many cards at each cost. It is the one chart a deckbuilder
 * cannot do without, and the only reason a player can tell an aggro list from a
 * control one at a glance.
 *
 *   const curve = new ManaCurve({
 *     counts: [0, 4, 8, 6, 4, 3, 2, 3], cap: 7, showCounts: true,
 *     compare: archetype.curve,
 *   });
 *   deck.on('change', () => curve.setCounts(deck.curve()));
 *
 * Bars are scaled to the tallest bucket rather than to a fixed maximum, so the
 * *shape* is always readable — a 30-card deck and a 5-card work-in-progress both
 * show a curve rather than a flat line near the floor. The average is computed
 * from the buckets when it is not passed, since a caller that has the counts
 * already has everything needed to derive it and two sources of one number
 * eventually disagree.
 *
 * `compare` ghosts a second curve behind the first, which is what turns "here is
 * my deck" into "here is my deck against what this archetype usually runs".
 */
export class ManaCurve extends FuiComponent<ManaCurveOptions> {
  private chart: HTMLElement;
  private avgEl: HTMLElement;

  constructor(opts: ManaCurveOptions) {
    const root = h('div', {
      class: 'fui fui-manacurve',
      style: {
        '--fui-curve-h': `${opts.height ?? 90}px`,
        ...(opts.color ? { '--fui-curve-ink': opts.color } : {}),
      },
      attrs: { role: 'img' },
    });
    super(root, opts);

    this.chart = h('div', { class: 'fui-manacurve__chart' });
    root.appendChild(this.chart);

    this.avgEl = h('p', { class: 'fui-manacurve__avg' });
    root.appendChild(this.avgEl);

    this.paint();
  }

  /** Replace the counts. */
  setCounts(counts: number[]): this {
    this.opts.counts = counts;
    this.paint();
    return this;
  }

  /** The mean cost of the deck. */
  get average(): number {
    const counts = this.opts.counts;
    const cards = counts.reduce((sum, n) => sum + n, 0);
    if (!cards) return 0;
    return counts.reduce((sum, n, cost) => sum + n * cost, 0) / cards;
  }

  private paint(): void {
    const counts = this.opts.counts;
    const cap = this.opts.cap ?? counts.length - 1;
    const compare = this.opts.compare;
    // Scaled to the tallest bucket, not to a fixed maximum: a 30-card deck and
    // a 5-card work-in-progress must both show a *shape*.
    const peak = Math.max(1, ...counts, ...(compare ?? []));
    const total = counts.reduce((sum, n) => sum + n, 0);

    clear(this.chart);
    counts.forEach((n, cost) => {
      const col = h('div', {
        class: 'fui-manacurve__col',
        dataset: { empty: n === 0 ? 'on' : 'off' },
        attrs: { title: `${n} card${n === 1 ? '' : 's'} at ${cost}${cost >= cap ? '+' : ''} mana` },
      });
      if (this.opts.showCounts) {
        col.appendChild(h('span', { class: 'fui-manacurve__n fui-num', text: n ? String(n) : '' }));
      }
      const stack = h('span', { class: 'fui-manacurve__stack' });
      if (compare?.[cost] != null) {
        stack.appendChild(
          h('span', {
            class: 'fui-manacurve__ghost',
            style: { height: `${(compare[cost] / peak) * 100}%` },
          }),
        );
      }
      stack.appendChild(
        h('span', { class: 'fui-manacurve__bar', style: { height: `${(n / peak) * 100}%` } }),
      );
      col.appendChild(stack);
      col.appendChild(
        h('span', { class: 'fui-manacurve__cost fui-num', text: `${cost}${cost >= cap ? '+' : ''}` }),
      );
      this.chart.appendChild(col);
    });

    const avg = this.opts.average ?? this.average;
    this.avgEl.textContent = `${total} cards · ${avg.toFixed(1)} average cost`;
    this.el.setAttribute('aria-label', `Mana curve: ${this.avgEl.textContent}`);
  }
}
