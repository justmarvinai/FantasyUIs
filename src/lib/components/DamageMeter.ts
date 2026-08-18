import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, commas, abbreviate } from '../core/dom.ts';

export interface DamageEntry {
  id: string;
  name: string;
  /** Manifest asset id for the portrait. */
  art?: string;
  /** Total damage dealt. */
  value: number;
  /** Bar colour — usually the champion's affinity or class. */
  color?: string;
  /** Second number after the total, e.g. DPS. */
  rate?: number;
  /** Highlight this row as the local player. */
  you?: boolean;
}

export interface DamageMeterOptions extends BaseOptions {
  entries: DamageEntry[];
  /** Heading above the list. */
  title?: string;
  /** Show each entry's share of the total as a percentage. */
  showShare?: boolean;
  /** Suffix for `rate`, e.g. `'DPS'`. */
  rateLabel?: string;
  /** Cap the rows shown; the rest are summarised. */
  limit?: number;
  compact?: boolean;
}

/**
 * The damage breakdown at the end of a fight — who actually contributed, as a
 * ranked list of bars scaled against the top performer.
 *
 *   const meter = new DamageMeter({
 *     title: 'Damage dealt',
 *     entries: [
 *       { id: 'a', name: 'Vexhollow', value: 4_820_000, color: 'var(--fui-rarity-epic)', you: true },
 *       { id: 'b', name: 'Emberwake', value: 3_110_000 },
 *     ],
 *     showShare: true, rateLabel: 'DPS',
 *   });
 *   meter.setEntries(live);   // re-sorts and re-scales
 *
 * Bars are scaled against the leader rather than the total, which is what makes
 * the gap between first and second readable at a glance.
 */
export class DamageMeter extends FuiComponent<DamageMeterOptions> {
  private list: HTMLElement;

  constructor(opts: DamageMeterOptions) {
    const root = h('div', { class: 'fui fui-meter' });
    if (opts.compact) root.classList.add('fui-meter--compact');
    super(root, opts);

    if (opts.title) {
      root.appendChild(h('p', { class: 'fui-meter__title fui-label', text: opts.title }));
    }
    this.list = h('div', { class: 'fui-meter__list' });
    root.appendChild(this.list);
    this.setEntries(opts.entries);
  }

  /** Replace the data. Rows are re-sorted and re-scaled on every call. */
  setEntries(entries: DamageEntry[]): this {
    clear(this.list);
    const sorted = [...entries].sort((a, b) => b.value - a.value);
    const total = sorted.reduce((sum, e) => sum + e.value, 0) || 1;
    const peak = sorted[0]?.value || 1;
    const shown = this.opts.limit ? sorted.slice(0, this.opts.limit) : sorted;

    shown.forEach((entry, i) => {
      const row = h('div', {
        class: 'fui-meter__row',
        style: {
          '--fui-meter-p': String(entry.value / peak),
          ...(entry.color ? { '--fui-meter-ink': entry.color } : {}),
        },
      });
      if (entry.you) row.classList.add('is-you');

      row.appendChild(h('span', { class: 'fui-meter__rank fui-num', text: String(i + 1) }));

      if (entry.art) {
        row.appendChild(
          h('span', {
            class: 'fui-meter__art',
            style: { backgroundImage: `var(--fui-img-${entry.art})` },
          }),
        );
      }
      row.appendChild(h('span', { class: 'fui-meter__name', text: entry.name }));

      const nums = h('span', { class: 'fui-meter__nums' });
      nums.appendChild(
        h('span', {
          class: 'fui-meter__value fui-num',
          text: abbreviate(entry.value),
          attrs: { title: commas(entry.value) },
        }),
      );
      if (this.opts.showShare) {
        nums.appendChild(
          h('span', {
            class: 'fui-meter__share fui-num',
            text: `${((entry.value / total) * 100).toFixed(1)}%`,
          }),
        );
      }
      if (entry.rate != null) {
        nums.appendChild(
          h('span', {
            class: 'fui-meter__rate fui-num',
            text: `${abbreviate(entry.rate)} ${this.opts.rateLabel ?? ''}`.trim(),
          }),
        );
      }
      row.appendChild(nums);
      this.list.appendChild(row);
    });

    const hidden = sorted.length - shown.length;
    if (hidden > 0) {
      this.list.appendChild(
        h('p', { class: 'fui-meter__more', text: `+${hidden} more` }),
      );
    }
    return this;
  }
}
