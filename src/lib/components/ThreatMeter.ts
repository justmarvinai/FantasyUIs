import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp, commas } from '../core/dom.ts';

export interface ThreatEntry {
  id: string;
  name: string;
  /** Manifest asset id for the portrait. */
  art?: string;
  /** Raw threat. Percentages are worked out against the leader. */
  threat: number;
  /** Class or role colour for the bar. */
  color?: string;
  /** This is the local player. */
  you?: boolean;
  /** This unit is a tank — it is *meant* to be at the top. */
  tank?: boolean;
}

export interface ThreatMeterOptions extends BaseOptions {
  /** Everyone on the boss’s list. Order does not matter — rows are sorted by threat. */
  entries: ThreatEntry[];
  /** Heading over the list. */
  title?: string;
  /** Percentage of the leader's threat at which a non-tank is warned. */
  warnAt?: number;
  /** Percentage at which a non-tank is about to pull. */
  dangerAt?: number;
  /** Show raw threat numbers as well as the percentage. */
  showValues?: boolean;
  /** Cap the rows shown. */
  limit?: number;
  /** Tighter rows without portraits, for a corner of the HUD. */
  compact?: boolean;
}

/**
 * The aggro list — who the boss is looking at, and how close everyone else is
 * to taking it off them.
 *
 *   const threat = new ThreatMeter({
 *     title: 'Threat', warnAt: 80, dangerAt: 95, showValues: true,
 *     entries: [
 *       { id: 'grix', name: 'Grixmaul', threat: 48_200, tank: true },
 *       { id: 'vex', name: 'Vexhollow', threat: 44_100, you: true },
 *     ],
 *   });
 *   threat.setEntries(live);
 *
 * Percentages are against the *leader*, not the total, because the only number
 * that matters is how close you are to the one holding the boss. A tank at the
 * top is normal and stays calm; anyone else near the top gets the warning.
 */
export class ThreatMeter extends FuiComponent<ThreatMeterOptions> {
  private list: HTMLElement;

  constructor(opts: ThreatMeterOptions) {
    const root = h('div', { class: 'fui fui-threat' });
    if (opts.compact) root.classList.add('fui-threat--compact');
    super(root, opts);

    if (opts.title) {
      root.appendChild(h('span', { class: 'fui-threat__title fui-label', text: opts.title }));
    }
    this.list = h('div', { class: 'fui-threat__list' });
    root.appendChild(this.list);
    this.setEntries(opts.entries);
  }

  /** Replace the data. Rows re-sort and re-scale on every call. */
  setEntries(entries: ThreatEntry[]): this {
    this.opts.entries = entries;
    clear(this.list);

    const sorted = [...entries].sort((a, b) => b.threat - a.threat);
    const lead = sorted[0]?.threat || 1;
    const shown = this.opts.limit ? sorted.slice(0, this.opts.limit) : sorted;
    const warn = this.opts.warnAt ?? 80;
    const danger = this.opts.dangerAt ?? 95;

    shown.forEach((entry, i) => {
      const pct = clamp((entry.threat / lead) * 100, 0, 100);
      // A tank at the top is the plan; anyone else up there is about to die.
      const state = entry.tank
        ? 'tank'
        : i === 0
          ? 'pulled'
          : pct >= danger
            ? 'danger'
            : pct >= warn
              ? 'warn'
              : 'safe';

      const row = h('div', {
        class: 'fui-threat__row',
        dataset: { state },
        style: {
          '--fui-threat-p': String(pct / 100),
          ...(entry.color ? { '--fui-threat-ink': entry.color } : {}),
        },
      });
      if (entry.you) row.classList.add('is-you');

      row.appendChild(h('span', { class: 'fui-threat__rank fui-num', text: String(i + 1) }));

      if (entry.art) {
        row.appendChild(
          h('span', {
            class: 'fui-threat__art',
            style: { backgroundImage: `var(--fui-img-${entry.art})` },
          }),
        );
      }
      row.appendChild(h('span', { class: 'fui-threat__name', text: entry.name }));

      if (this.opts.showValues) {
        row.appendChild(
          h('span', { class: 'fui-threat__value fui-num', text: commas(entry.threat) }),
        );
      }
      row.appendChild(
        h('span', { class: 'fui-threat__pct fui-num', text: `${Math.round(pct)}%` }),
      );

      this.list.appendChild(row);
    });

    const hidden = sorted.length - shown.length;
    if (hidden > 0) {
      this.list.appendChild(h('p', { class: 'fui-threat__more', text: `+${hidden} more` }));
    }
    return this;
  }

  /** Whoever currently holds the boss's attention. */
  leader(): ThreatEntry | null {
    return [...this.opts.entries].sort((a, b) => b.threat - a.threat)[0] ?? null;
  }
}
